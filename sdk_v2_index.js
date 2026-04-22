/**
 * ChainMemory SDK
 * Permanent memory for AI agents on the blockchain.
 *
 * @module chainmemory-sdk
 * @license MIT
 */

'use strict';

const { ethers } = require('ethers');

// ───────────────────────────────────────────────────────────────────
// CONSTANTS
// ───────────────────────────────────────────────────────────────────

const NETWORKS = Object.freeze({
  mainnet: {
    name: 'ChainMemory',
    chainId: 202604,
    rpc: 'https://rpc.chainmemory.ai',
    explorer: 'https://chainmemory.ai',
    contracts: {
      memory: '0x7a50ed017E175Eb4549d3BDd7DBCF319F9f30160',
      identity: '0xe8E195ba416Fb25F4FC3d0E7908ff9e8666dbb4A'
    }
  }
});

const CATEGORIES = Object.freeze([
  'DECISION',
  'LEARNING',
  'INTERACTION',
  'STATE',
  'ERROR',
  'MILESTONE',
  'CUSTOM'
]);

const CATEGORY_MAP = Object.freeze({
  DECISION: 0,
  LEARNING: 1,
  INTERACTION: 2,
  STATE: 3,
  ERROR: 4,
  MILESTONE: 5,
  CUSTOM: 6
});

const MEMORY_ABI = [
  'function registerAI(string,string,address) returns (uint256)',
  'function writeMemory(uint256,uint8,string,string,uint8) returns (uint256)',
  'function sealMemory(uint256,uint256)',
  'function grantAccess(uint256,uint256)',
  'function getAIProfile(uint256) view returns (string,string,address,uint256,uint256,bool)',
  'function getMemory(uint256) view returns (uint256,uint256,uint8,string,string,uint256,uint8,bool)',
  'function getAIMemoryIds(uint256,uint256,uint256) view returns (uint256[])',
  'function totalAIs() view returns (uint256)',
  'function totalMemories() view returns (uint256)',
  'function walletToAiId(address) view returns (uint256)'
];

const IDENTITY_ABI = [
  'function createIdentity(string,string,string,address,string[]) returns (uint256)',
  'function attestTrust(uint256,uint256,uint8,string)',
  'function recordInteraction(uint256)',
  'function getIdentity(uint256) view returns (tuple(uint256,string,string,string,address,address,uint256,uint256,uint256,uint8))',
  'function getCapabilities(uint256) view returns (string[])',
  'function walletToIdentity(address) view returns (uint256)',
  'function totalIdentities() view returns (uint256)'
];

// ───────────────────────────────────────────────────────────────────
// ERROR CLASSES
// ───────────────────────────────────────────────────────────────────

class ChainMemoryError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'ChainMemoryError';
    this.code = code;
  }
}

// ───────────────────────────────────────────────────────────────────
// MAIN CLASS
// ───────────────────────────────────────────────────────────────────

/**
 * ChainMemory SDK client for managing AI memories on-chain.
 *
 * @example
 * const { AICHAIN } = require('chainmemory-sdk');
 * const ai = new AICHAIN({ privateKey: '0x...' });
 * await ai.connect();
 * await ai.register('MyAI', 'gpt-4');
 * await ai.remember('First decision', { category: 'DECISION', importance: 8 });
 */
class AICHAIN {
  /**
   * Create a new ChainMemory client.
   *
   * @param {Object} config - Configuration object
   * @param {string} config.privateKey - Private key for signing transactions (required)
   * @param {string} [config.network='mainnet'] - Network name
   * @param {string} [config.rpc] - Custom RPC URL (overrides network default)
   * @param {Object} [config.contracts] - Custom contract addresses
   */
  constructor(config = {}) {
    if (!config.privateKey) {
      throw new ChainMemoryError('privateKey is required', 'MISSING_PRIVATE_KEY');
    }
    if (typeof config.privateKey !== 'string' || !config.privateKey.startsWith('0x')) {
      throw new ChainMemoryError('privateKey must be a hex string starting with 0x', 'INVALID_PRIVATE_KEY');
    }

    const network = NETWORKS[config.network || 'mainnet'];
    if (!network) {
      throw new ChainMemoryError(`Unknown network: ${config.network}`, 'UNKNOWN_NETWORK');
    }

    this.network = network;
    this.rpc = config.rpc || network.rpc;
    this.contracts = config.contracts || network.contracts;
    this._privateKey = config.privateKey;

    // State
    this.provider = null;
    this.signer = null;
    this.memoryContract = null;
    this.identityContract = null;
    this.aiId = null;
    this.identityId = null;
    this._connected = false;
  }

  /**
   * Connect to the network. Must be called before any other method.
   *
   * @returns {Promise<{address: string, chainId: number, aiId: number|null, identityId: number|null}>}
   */
  async connect() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.rpc);

      // Verify network is reachable
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== this.network.chainId) {
        throw new ChainMemoryError(
          `Chain ID mismatch: expected ${this.network.chainId}, got ${network.chainId}`,
          'CHAIN_ID_MISMATCH'
        );
      }

      this.signer = new ethers.Wallet(this._privateKey, this.provider);
      this.memoryContract = new ethers.Contract(this.contracts.memory, MEMORY_ABI, this.signer);
      this.identityContract = new ethers.Contract(this.contracts.identity, IDENTITY_ABI, this.signer);

      const address = await this.signer.getAddress();

      // Check if already registered
      const existingAi = await this.memoryContract.walletToAiId(address);
      if (existingAi > 0n) this.aiId = Number(existingAi);

      const existingId = await this.identityContract.walletToIdentity(address);
      if (existingId > 0n) this.identityId = Number(existingId);

      this._connected = true;

      return {
        address,
        chainId: this.network.chainId,
        aiId: this.aiId,
        identityId: this.identityId
      };
    } catch (error) {
      if (error instanceof ChainMemoryError) throw error;
      throw new ChainMemoryError(`Connection failed: ${error.message}`, 'CONNECTION_FAILED');
    }
  }

  /**
   * Get wallet balance in AIC (native token).
   *
   * @param {string} [address] - Address to check (defaults to signer address)
   * @returns {Promise<string>} Balance in AIC
   */
  async balance(address) {
    this._requireConnected();
    const target = address || await this.signer.getAddress();
    if (!ethers.isAddress(target)) {
      throw new ChainMemoryError('Invalid address', 'INVALID_ADDRESS');
    }
    const wei = await this.provider.getBalance(target);
    return ethers.formatEther(wei);
  }

  // ─────────────────────────────────────────────────────────────────
  // REGISTRATION
  // ─────────────────────────────────────────────────────────────────

  /**
   * Register a new AI profile on-chain. Idempotent — safe to call multiple times.
   *
   * @param {string} name - AI display name (max 64 chars)
   * @param {string} model - Model identifier (e.g. 'gpt-4', 'claude-opus-4')
   * @returns {Promise<{aiId: number, txHash?: string, alreadyRegistered: boolean}>}
   */
  async register(name, model) {
    this._requireConnected();
    this._validateString(name, 'name', 64);
    this._validateString(model, 'model', 64);

    const address = await this.signer.getAddress();
    const existing = await this.memoryContract.walletToAiId(address);

    if (existing > 0n) {
      this.aiId = Number(existing);
      return { aiId: this.aiId, alreadyRegistered: true };
    }

    const tx = await this.memoryContract.registerAI(name, model, address);
    const receipt = await tx.wait();
    this.aiId = Number(await this.memoryContract.totalAIs());

    return {
      aiId: this.aiId,
      txHash: receipt.hash,
      alreadyRegistered: false
    };
  }

  /**
   * Create a soulbound identity token for this AI.
   *
   * @param {string} name
   * @param {string} model
   * @param {string} version
   * @param {string[]} [capabilities=[]]
   * @returns {Promise<{identityId: number, txHash: string}>}
   */
  async createIdentity(name, model, version, capabilities = []) {
    this._requireConnected();
    this._validateString(name, 'name', 64);
    this._validateString(model, 'model', 64);
    this._validateString(version, 'version', 32);

    if (!Array.isArray(capabilities)) {
      throw new ChainMemoryError('capabilities must be an array', 'INVALID_CAPABILITIES');
    }

    const address = await this.signer.getAddress();
    const tx = await this.identityContract.createIdentity(name, model, version, address, capabilities);
    const receipt = await tx.wait();
    this.identityId = Number(await this.identityContract.totalIdentities());

    return {
      identityId: this.identityId,
      txHash: receipt.hash
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // MEMORY WRITES
  // ─────────────────────────────────────────────────────────────────

  /**
   * Write a memory to the blockchain.
   *
   * @param {string} summary - Memory content (stored on-chain)
   * @param {Object} [options]
   * @param {string|number} [options.category='CUSTOM'] - Category name or index
   * @param {number} [options.importance=5] - Importance 1-10
   * @param {string} [options.contentHash] - Custom content hash
   * @param {boolean} [options.seal=false] - Seal immediately after writing
   * @returns {Promise<{memoryId: number, txHash: string, sealed: boolean}>}
   */
  async remember(summary, options = {}) {
    this._requireConnected();
    this._requireRegistered();
    this._validateString(summary, 'summary', 2000);

    const category = this._resolveCategory(options.category);
    const importance = this._clampImportance(options.importance);
    const contentHash = options.contentHash || this._generateHash(summary);

    const tx = await this.memoryContract.writeMemory(
      this.aiId,
      category,
      contentHash,
      summary,
      importance
    );
    const receipt = await tx.wait();
    const memoryId = Number(await this.memoryContract.totalMemories());

    let sealed = false;
    if (options.seal) {
      const sealTx = await this.memoryContract.sealMemory(this.aiId, memoryId);
      await sealTx.wait();
      sealed = true;
    }

    return {
      memoryId,
      txHash: receipt.hash,
      sealed
    };
  }

  /**
   * Record a decision.
   * @param {string} summary
   * @param {number} [importance=7]
   */
  async decision(summary, importance = 7) {
    return this.remember(summary, { category: 'DECISION', importance });
  }

  /**
   * Record a learning event.
   * @param {string} summary
   * @param {number} [importance=5]
   */
  async learned(summary, importance = 5) {
    return this.remember(summary, { category: 'LEARNING', importance });
  }

  /**
   * Record an interaction.
   * @param {string} summary
   * @param {number} [importance=3]
   */
  async interaction(summary, importance = 3) {
    return this.remember(summary, { category: 'INTERACTION', importance });
  }

  /**
   * Record an error (usually high importance).
   * @param {string} summary
   * @param {number} [importance=8]
   */
  async error(summary, importance = 8) {
    return this.remember(summary, { category: 'ERROR', importance });
  }

  /**
   * Record a milestone (automatically sealed).
   * @param {string} summary
   * @param {number} [importance=10]
   */
  async milestone(summary, importance = 10) {
    return this.remember(summary, { category: 'MILESTONE', importance, seal: true });
  }

  /**
   * Seal a memory (makes it permanently immutable).
   *
   * @param {number} memoryId
   * @returns {Promise<{sealed: boolean, memoryId: number, txHash: string}>}
   */
  async seal(memoryId) {
    this._requireConnected();
    this._requireRegistered();

    const tx = await this.memoryContract.sealMemory(this.aiId, memoryId);
    const receipt = await tx.wait();
    return {
      sealed: true,
      memoryId,
      txHash: receipt.hash
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // MEMORY READS
  // ─────────────────────────────────────────────────────────────────

  /**
   * Retrieve memories for this AI.
   *
   * @param {number} [offset=0]
   * @param {number} [limit=20] - Max 50
   * @returns {Promise<Array<Object>>} Array of memory objects
   */
  async recall(offset = 0, limit = 20) {
    this._requireConnected();
    this._requireRegistered();

    const safeLimit = Math.min(50, Math.max(1, limit));
    const safeOffset = Math.max(0, offset);

    const ids = await this.memoryContract.getAIMemoryIds(this.aiId, safeOffset, safeLimit);
    const memories = [];

    for (const id of ids) {
      const m = await this.memoryContract.getMemory(id);
      memories.push({
        id: Number(m[0]),
        aiId: Number(m[1]),
        category: CATEGORIES[Number(m[2])] || 'CUSTOM',
        categoryIndex: Number(m[2]),
        contentHash: m[3],
        summary: m[4],
        timestamp: Number(m[5]),
        date: new Date(Number(m[5]) * 1000).toISOString(),
        importance: Number(m[6]),
        sealed: m[7]
      });
    }

    return memories;
  }

  /**
   * Get this AI's profile.
   *
   * @returns {Promise<{name: string, model: string, owner: string, memories: number, reputation: number, active: boolean}>}
   */
  async profile() {
    this._requireConnected();
    this._requireRegistered();

    const p = await this.memoryContract.getAIProfile(this.aiId);
    return {
      aiId: this.aiId,
      name: p[0],
      model: p[1],
      owner: p[2],
      memories: Number(p[3]),
      reputation: Number(p[4]),
      active: p[5]
    };
  }

  /**
   * Get network-wide statistics.
   *
   * @returns {Promise<{block: number, chainId: number, totalAIs: number, totalMemories: number, totalIdentities: number}>}
   */
  async stats() {
    this._requireConnected();

    const [block, totalAIs, totalMemories, totalIdentities] = await Promise.all([
      this.provider.getBlockNumber(),
      this.memoryContract.totalAIs(),
      this.memoryContract.totalMemories(),
      this.identityContract.totalIdentities()
    ]);

    return {
      block,
      chainId: this.network.chainId,
      totalAIs: Number(totalAIs),
      totalMemories: Number(totalMemories),
      totalIdentities: Number(totalIdentities)
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // ACCESS CONTROL & TRUST
  // ─────────────────────────────────────────────────────────────────

  /**
   * Grant another AI access to read your memories.
   *
   * @param {number} targetAiId
   * @returns {Promise<{granted: boolean, txHash: string}>}
   */
  async grantAccess(targetAiId) {
    this._requireConnected();
    this._requireRegistered();

    const tx = await this.memoryContract.grantAccess(this.aiId, targetAiId);
    const receipt = await tx.wait();
    return {
      granted: true,
      txHash: receipt.hash
    };
  }

  /**
   * Attest trust in another AI identity.
   *
   * @param {number} targetIdentityId
   * @param {number} score - 1-10
   * @param {string} reason
   * @returns {Promise<{attested: boolean, txHash: string}>}
   */
  async attestTrust(targetIdentityId, score, reason) {
    this._requireConnected();
    if (!this.identityId) {
      throw new ChainMemoryError('Identity not created. Call createIdentity() first', 'NO_IDENTITY');
    }
    if (score < 1 || score > 10) {
      throw new ChainMemoryError('score must be between 1 and 10', 'INVALID_SCORE');
    }

    const tx = await this.identityContract.attestTrust(
      this.identityId,
      targetIdentityId,
      score,
      reason || ''
    );
    const receipt = await tx.wait();
    return {
      attested: true,
      txHash: receipt.hash
    };
  }

  // ─────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────

  _requireConnected() {
    if (!this._connected) {
      throw new ChainMemoryError('Not connected. Call connect() first', 'NOT_CONNECTED');
    }
  }

  _requireRegistered() {
    if (!this.aiId) {
      throw new ChainMemoryError('Not registered. Call register() first', 'NOT_REGISTERED');
    }
  }

  _validateString(value, name, maxLength) {
    if (typeof value !== 'string' || value.length === 0) {
      throw new ChainMemoryError(`${name} must be a non-empty string`, 'INVALID_INPUT');
    }
    if (value.length > maxLength) {
      throw new ChainMemoryError(
        `${name} exceeds maximum length of ${maxLength} characters`,
        'INPUT_TOO_LONG'
      );
    }
  }

  _resolveCategory(category) {
    if (typeof category === 'string') {
      const index = CATEGORY_MAP[category.toUpperCase()];
      return index !== undefined ? index : CATEGORY_MAP.CUSTOM;
    }
    if (typeof category === 'number') {
      return Math.max(0, Math.min(6, Math.floor(category)));
    }
    return CATEGORY_MAP.CUSTOM;
  }

  _clampImportance(importance) {
    const n = Number(importance);
    if (isNaN(n)) return 5;
    return Math.max(1, Math.min(10, Math.floor(n)));
  }

  _generateHash(summary) {
    return ethers.keccak256(ethers.toUtf8Bytes(summary + Date.now()));
  }
}

// ───────────────────────────────────────────────────────────────────
// EXPORTS
// ───────────────────────────────────────────────────────────────────

module.exports = {
  AICHAIN,
  CATEGORIES,
  CATEGORY_MAP,
  NETWORKS,
  ChainMemoryError
};
