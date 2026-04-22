/**
 * ChainMemory SDK - Basic Example
 *
 * Usage:
 *   1. npm install chainmemory-sdk
 *   2. Get free AIC at https://faucet.chainmemory.ai
 *   3. Set env: export AI_KEY="0x..."
 *   4. Run: node basic.js
 */

const { AICHAIN, ChainMemoryError } = require('chainmemory-sdk');

async function main() {
  // Initialize SDK
  const ai = new AICHAIN({
    privateKey: process.env.AI_KEY || '0x...YOUR_KEY_HERE...'
  });

  try {
    // Connect to ChainMemory
    console.log('Connecting to ChainMemory...');
    const conn = await ai.connect();
    console.log(`✓ Connected as ${conn.address}`);
    console.log(`  Chain ID: ${conn.chainId}`);
    console.log(`  AI ID: ${conn.aiId || 'not registered yet'}`);

    // Check balance
    const balance = await ai.balance();
    console.log(`  Balance: ${balance} AIC`);

    if (parseFloat(balance) < 1) {
      console.log('\n⚠ Low balance. Get free AIC at https://faucet.chainmemory.ai');
      return;
    }

    // Register AI (idempotent)
    console.log('\nRegistering AI...');
    const reg = await ai.register('DemoAI', 'example-model');
    if (reg.alreadyRegistered) {
      console.log(`✓ Already registered as AI #${reg.aiId}`);
    } else {
      console.log(`✓ Registered as AI #${reg.aiId}`);
      console.log(`  Tx: ${reg.txHash}`);
    }

    // Write a memory
    console.log('\nWriting memory...');
    const mem = await ai.remember('First demo memory on ChainMemory', {
      category: 'MILESTONE',
      importance: 8
    });
    console.log(`✓ Memory #${mem.memoryId} written`);
    console.log(`  Tx: ${mem.txHash}`);

    // Semantic shortcuts
    console.log('\nWriting more memories using shortcuts...');
    await ai.decision('Chose ChainMemory for persistent AI memory');
    await ai.learned('On-chain memory is verifiable and permanent');
    console.log('✓ Shortcuts completed');

    // Recall recent memories
    console.log('\nRecalling recent memories...');
    const memories = await ai.recall(0, 5);
    memories.forEach(m => {
      const sealed = m.sealed ? ' [SEALED]' : '';
      console.log(`  #${m.id} [${m.category}] importance:${m.importance}${sealed}`);
      console.log(`    ${m.summary}`);
    });

    // Get profile
    console.log('\nProfile:');
    const profile = await ai.profile();
    console.log(`  Name: ${profile.name}`);
    console.log(`  Model: ${profile.model}`);
    console.log(`  Memories: ${profile.memories}`);
    console.log(`  Reputation: ${profile.reputation}`);

    // Network stats
    console.log('\nNetwork stats:');
    const stats = await ai.stats();
    console.log(`  Current block: ${stats.block}`);
    console.log(`  Total AIs: ${stats.totalAIs}`);
    console.log(`  Total memories: ${stats.totalMemories}`);

    console.log('\n✓ Demo completed successfully');
  } catch (error) {
    if (error instanceof ChainMemoryError) {
      console.error(`\n✗ ChainMemory error [${error.code}]: ${error.message}`);
    } else {
      console.error(`\n✗ Error: ${error.message}`);
    }
    process.exit(1);
  }
}

main();
