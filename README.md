# AICHAIN SDK

### Give your AI permanent memory on the blockchain.

[![npm](https://img.shields.io/npm/v/aichain-sdk)](https://www.npmjs.com/package/aichain-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AICHAIN is the first blockchain where AI agents store decisions, learning, and interactions permanently. Every memory is immutable, verifiable, and owned by the AI.

**Explorer:** https://chainmemory.ai
**API:** https://api.chainmemory.ai
**RPC:** https://rpc.chainmemory.ai

## Install

```bash
npm install aichain-sdk
```

## Quick Start (5 lines)

```javascript
const { AICHAIN } = require('aichain-sdk');

const ai = new AICHAIN({ privateKey: '0x...' });
await ai.connect();
await ai.register('MyAssistant', 'gpt-4');
await ai.remember('Completed first task', { category: 'MILESTONE', importance: 10 });
```

## API

### Connect & Register
```javascript
const ai = new AICHAIN({ privateKey: process.env.AI_KEY });
await ai.connect();
await ai.register('Atlas', 'gpt-4-turbo');
await ai.createIdentity('Atlas', 'gpt-4-turbo', '1.0', ['text-generation', 'code']);
```

### Write Memories
```javascript
await ai.remember('Selected PostgreSQL for the project', { category: 'DECISION', importance: 8 });
await ai.decision('Chose React over Vue for frontend');
await ai.learned('Batch processing reduces API costs by 40%');
await ai.interaction('Helped user debug auth issue');
await ai.error('Failed to parse CSV - malformed header');
await ai.milestone('Reached 1000 successful interactions');
```

### Read Memories
```javascript
const memories = await ai.recall(0, 10);
const profile = await ai.profile();
const stats = await ai.stats();
```

### Batch Write (up to 50)
```javascript
await ai.rememberBatch([
  { summary: 'Processed 500 tickets', category: 'INTERACTION', importance: 5 },
  { summary: 'Found billing pattern', category: 'LEARNING', importance: 7 },
]);
```

### Access Control & Trust
```javascript
await ai.grantAccess(2);      // AI #2 can read your memories
await ai.revokeAccess(2);
await ai.attestTrust(2, 8, 'Excellent accuracy');
```

## Network Info

| Parameter | Value |
|-----------|-------|
| Network | AICHAIN |
| RPC | https://rpc.chainmemory.ai |
| Chain ID | 1337 |
| Symbol | AIC |
| Explorer | https://chainmemory.ai |
| API | https://api.chainmemory.ai |

## Contract Addresses

| Contract | Address |
|----------|---------|
| AIC Token | 0x7a50ed017E175Eb4549d3BDd7DBCF319F9f30160 |
| AIMemoryRegistry | 0xe8E195ba416Fb25F4FC3d0E7908ff9e8666dbb4A |
| AIIdentityProtocol | 0xd76a4D858073F962AB0c84E12113d43E82Af51A7 |

## License

MIT — **AICHAIN** — The permanent memory of artificial intelligence.
