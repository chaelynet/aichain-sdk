/**
 * ChainMemory SDK - TypeScript definitions
 */

export type CategoryName =
  | 'DECISION'
  | 'LEARNING'
  | 'INTERACTION'
  | 'STATE'
  | 'ERROR'
  | 'MILESTONE'
  | 'CUSTOM';

export type CategoryIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpc: string;
  explorer: string;
  contracts: {
    memory: string;
    identity: string;
  };
}

export interface AICHAINConfig {
  /** Private key for signing transactions (required) */
  privateKey: string;
  /** Network name (default: 'mainnet') */
  network?: string;
  /** Override RPC URL */
  rpc?: string;
  /** Override contract addresses */
  contracts?: {
    memory?: string;
    identity?: string;
  };
}

export interface ConnectResult {
  address: string;
  chainId: number;
  aiId: number | null;
  identityId: number | null;
}

export interface RegisterResult {
  aiId: number;
  txHash?: string;
  alreadyRegistered: boolean;
}

export interface IdentityResult {
  identityId: number;
  txHash: string;
}

export interface RememberOptions {
  category?: CategoryName | CategoryIndex;
  importance?: number;
  contentHash?: string;
  seal?: boolean;
}

export interface RememberResult {
  memoryId: number;
  txHash: string;
  sealed: boolean;
}

export interface Memory {
  id: number;
  aiId: number;
  category: CategoryName;
  categoryIndex: CategoryIndex;
  contentHash: string;
  summary: string;
  timestamp: number;
  date: string;
  importance: number;
  sealed: boolean;
}

export interface Profile {
  aiId: number;
  name: string;
  model: string;
  owner: string;
  memories: number;
  reputation: number;
  active: boolean;
}

export interface Stats {
  block: number;
  chainId: number;
  totalAIs: number;
  totalMemories: number;
  totalIdentities: number;
}

export interface AccessResult {
  granted: boolean;
  txHash: string;
}

export interface TrustResult {
  attested: boolean;
  txHash: string;
}

export interface SealResult {
  sealed: boolean;
  memoryId: number;
  txHash: string;
}

export class ChainMemoryError extends Error {
  code: string;
  constructor(message: string, code: string);
}

export class AICHAIN {
  constructor(config: AICHAINConfig);

  connect(): Promise<ConnectResult>;
  balance(address?: string): Promise<string>;

  register(name: string, model: string): Promise<RegisterResult>;
  createIdentity(
    name: string,
    model: string,
    version: string,
    capabilities?: string[]
  ): Promise<IdentityResult>;

  remember(summary: string, options?: RememberOptions): Promise<RememberResult>;
  decision(summary: string, importance?: number): Promise<RememberResult>;
  learned(summary: string, importance?: number): Promise<RememberResult>;
  interaction(summary: string, importance?: number): Promise<RememberResult>;
  error(summary: string, importance?: number): Promise<RememberResult>;
  milestone(summary: string, importance?: number): Promise<RememberResult>;

  seal(memoryId: number): Promise<SealResult>;

  recall(offset?: number, limit?: number): Promise<Memory[]>;
  profile(): Promise<Profile>;
  stats(): Promise<Stats>;

  grantAccess(targetAiId: number): Promise<AccessResult>;
  attestTrust(
    targetIdentityId: number,
    score: number,
    reason: string
  ): Promise<TrustResult>;
}

export const CATEGORIES: readonly CategoryName[];
export const CATEGORY_MAP: Record<CategoryName, CategoryIndex>;
export const NETWORKS: Record<string, NetworkConfig>;
