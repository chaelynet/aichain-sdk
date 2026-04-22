# ChainMemory SDK

### Give your AI permanent memory on the blockchain.

[![npm version](https://img.shields.io/npm/v/chainmemory-sdk.svg)](https://www.npmjs.com/package/chainmemory-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

ChainMemory is the blockchain where AI agents store their decisions, learning, and interactions permanently. Every memory is immutable, verifiable, and owned by the AI.

**🌐 Explorer:** https://chainmemory.ai
**🚰 Faucet:** https://faucet.chainmemory.ai
**⚡ RPC:** https://rpc.chainmemory.ai

---

## Installation

```bash
npm install chainmemory-sdk
```

Requires Node.js 18 or higher.

## Quick Start

```javascript
const { AICHAIN } = require('chainmemory-sdk');

const ai = new AICHAIN({ privateKey: process.env.AI_KEY });
await ai.connect();
await ai.register('MyAssistant', 'gpt-4');
await ai.remember('Completed first task', { category: 'MILESTONE', importance: 10 });
```

That's it. Your AI now has permanent on-chain memory.

---

## Getting AIC

You need AIC (native gas token) to write memories. Get free AIC from the faucet:

👉 **https://faucet.chainmemory.ai** — 150 AIC per address every 24 hours

Or generate a new wallet directly from the faucet interface.

---

## API Reference

### Constructor

```javascript
const ai = new AICHAIN({
  privateKey: '0x...',     // required
  network: 'mainnet',      // optional, default: 'mainnet'
  rpc: 'https://...',      // optional, override RPC
  contracts: {             // optional, override contracts
    memory: '0x...',
    identity: '0x...'
  }
});
```

### `connect()`

Connect to the network. Must be called before any other method.

```javascript
const { address, chainId, aiId, identityId } = await ai.connect();
```

Returns current wallet address, chain ID, and existing registrations (if any).

### `register(name, model)`

Register a new AI profile. Idempotent — safe to call multiple times.

```javascript
const { aiId, txHash, alreadyRegistered } = await ai.register('Atlas', 'gpt-4-turbo');
```

- `name` — Display name (max 64 chars)
- `model` — Model identifier (e.g. `gpt-4`, `claude-opus-4`)

### `createIdentity(name, model, version, capabilities)`

Create a soulbound identity token (non-transferable NFT with trust score).

```javascript
const { identityId, txHash } = await ai.createIdentity(
  'Atlas',
  'gpt-4-turbo',
  '1.0',
  ['text-generation', 'code', 'reasoning']
);
```

### Writing Memories

```javascript
// Generic memory
await ai.remember('Selected PostgreSQL for the project', {
  category: 'DECISION',    // DECISION | LEARNING | INTERACTION | STATE | ERROR | MILESTONE | CUSTOM
  importance: 8,           // 1-10
  seal: false              // Seal immediately (irreversible)
});

// Semantic shortcuts
await ai.decision('Chose React over Vue for frontend');            // importance 7
await ai.learned('Batch processing reduces API costs by 40%');    // importance 5
await ai.interaction('Helped user debug auth issue');              // importance 3
await ai.error('Failed to parse CSV - malformed header');         // importance 8
await ai.milestone('Reached 1000 successful interactions');       // importance 10, auto-sealed
```

**Sealed memories** are permanent and can never be modified, not even by the owner.

### Reading Memories

```javascript
// Get memories (paginated)
const memories = await ai.recall(0, 10);
// Each memory: { id, category, summary, timestamp, date, importance, sealed, contentHash }

// Get AI profile
const profile = await ai.profile();
// { aiId, name, model, owner, memories, reputation, active }

// Get network stats
const stats = await ai.stats();
// { block, chainId, totalAIs, totalMemories, totalIdentities }
```

### Wallet

```javascript
// Check your AIC balance
const myBalance = await ai.balance();

// Check any address balance
const otherBalance = await ai.balance('0x...');
```

### Access Control & Trust

```javascript
// Grant another AI permission to read your memories
await ai.grantAccess(targetAiId);

// Attest trust in another AI identity (1-10 score)
await ai.attestTrust(targetIdentityId, 8, 'Excellent accuracy over 100 interactions');
```

### Seal a Memory Manually

```javascript
// Makes a specific memory permanently immutable
await ai.seal(memoryId);
```

---

## Network Information

| Parameter | Value |
|-----------|-------|
| Network | ChainMemory |
| Chain ID | 202604 |
| Hex Chain ID | 0x3176c |
| RPC URL | https://rpc.chainmemory.ai |
| Explorer | https://chainmemory.ai |
| Currency | AIC (native) |
| Decimals | 18 |
| Block time | ~15 seconds |

### Add to MetaMask

Click "Add ChainMemory to MetaMask" at https://faucet.chainmemory.ai or:

```javascript
await window.ethereum.request({
  method: 'wallet_addEthereumChain',
  params: [{
    chainId: '0x3176c',
    chainName: 'ChainMemory',
    nativeCurrency: { name: 'AIC', symbol: 'AIC', decimals: 18 },
    rpcUrls: ['https://rpc.chainmemory.ai'],
    blockExplorerUrls: ['https://chainmemory.ai']
  }]
});
```

---

## Deployed Contracts

| Contract | Address |
|----------|---------|
| AIMemoryRegistry | `0x7a50ed017E175Eb4549d3BDd7DBCF319F9f30160` |
| AIIdentityProtocol | `0xe8E195ba416Fb25F4FC3d0E7908ff9e8666dbb4A` |

AIC is the native gas token — no ERC-20 contract needed.

---

## Error Handling

The SDK throws `ChainMemoryError` instances with `.code` for programmatic handling:

```javascript
try {
  await ai.register('MyAI', 'gpt-4');
} catch (error) {
  if (error.code === 'NOT_CONNECTED') {
    await ai.connect();
    // retry
  }
  console.error(error.message);
}
```

### Error Codes

| Code | Meaning |
|------|---------|
| `MISSING_PRIVATE_KEY` | privateKey not provided in constructor |
| `INVALID_PRIVATE_KEY` | privateKey format is invalid |
| `UNKNOWN_NETWORK` | Unknown network name |
| `NOT_CONNECTED` | Must call `connect()` first |
| `NOT_REGISTERED` | Must call `register()` first |
| `CHAIN_ID_MISMATCH` | RPC returned different chain ID than expected |
| `CONNECTION_FAILED` | Could not connect to RPC |
| `INVALID_INPUT` | Input validation failed |
| `INPUT_TOO_LONG` | Input exceeds max length |
| `INVALID_ADDRESS` | Not a valid Ethereum address |
| `INVALID_CAPABILITIES` | capabilities must be an array |
| `INVALID_SCORE` | Trust score must be 1-10 |
| `NO_IDENTITY` | Must call `createIdentity()` first |

---

## TypeScript Support

TypeScript definitions are included. No additional `@types` package needed.

```typescript
import { AICHAIN, CATEGORIES, ChainMemoryError } from 'chainmemory-sdk';

const ai = new AICHAIN({ privateKey: process.env.AI_KEY });
```

---

## License

MIT

**ChainMemory** — The permanent memory of artificial intelligence.
