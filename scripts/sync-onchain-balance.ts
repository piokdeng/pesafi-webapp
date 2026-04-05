/**
 * Script to sync on-chain USDC balance with database
 * This fetches the actual USDC balance from Base blockchain and updates the database
 *
 * Run with: npx tsx scripts/sync-onchain-balance.ts <email>
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Base USDC contract address
const USDC_CONTRACT_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_RPC_URL = 'https://mainnet.base.org';

async function getUSDCBalance(walletAddress: string): Promise<number> {
  try {
    // ERC-20 balanceOf function signature
    const balanceOfSignature = '0x70a08231'; // balanceOf(address)
    const paddedAddress = walletAddress.slice(2).padStart(64, '0');
    const data = balanceOfSignature + paddedAddress;

    const response = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_call',
        params: [{
          to: USDC_CONTRACT_ADDRESS,
          data: data
        }, 'latest'],
        id: 1
      })
    });

    const result = await response.json();

    if (result.error) {
      console.error('RPC Error:', result.error);
      return 0;
    }

    // USDC has 6 decimals
    const balance = parseInt(result.result, 16) / 1_000_000;
    return balance;

  } catch (error) {
    console.error('Error fetching on-chain balance:', error);
    return 0;
  }
}

async function syncBalance(email: string) {
  try {
    console.log(`🔄 Syncing on-chain balance for: ${email}\n`);

    // Find the user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }

    const user = users?.find(u => u.email === email);

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Get the user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (walletError || !wallet) {
      console.error('❌ No wallet found for user');
      return;
    }

    console.log(`\n📍 Wallet Address: ${wallet.address}`);
    console.log(`💾 Database USDC Balance: $${wallet.usdc_balance} USDC`);

    // Fetch ETH balance first
    console.log(`\n🔗 Fetching on-chain balances from Base...`);

    const ethResponse = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [wallet.address, 'latest'],
        id: 1
      })
    });
    const ethResult = await ethResponse.json();
    const ethBalance = parseInt(ethResult.result, 16) / 1e18;

    console.log(`⛓️  On-Chain ETH Balance: ${ethBalance.toFixed(6)} ETH (~$${(ethBalance * 3600).toFixed(2)} USD)`);

    // Fetch USDC balance
    const onChainBalance = await getUSDCBalance(wallet.address);
    console.log(`⛓️  On-Chain USDC Balance: $${onChainBalance.toFixed(6)} USDC`);

    const dbBalance = parseFloat(wallet.usdc_balance || '0');
    const difference = onChainBalance - dbBalance;

    if (Math.abs(difference) < 0.01) {
      console.log(`\n✅ Balances match! No sync needed.`);
      return;
    }

    console.log(`\n⚠️  Balance mismatch detected!`);
    console.log(`   Difference: ${difference > 0 ? '+' : ''}${difference.toFixed(6)} USDC`);
    console.log(`\n📝 Updating database balance to match on-chain...`);

    // Update the database balance
    const { error: updateError } = await supabase
      .from('wallet')
      .update({
        usdc_balance: onChainBalance.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (updateError) {
      console.error('❌ Error updating balance:', updateError);
      return;
    }

    console.log(`\n✅ Balance synced successfully!`);
    console.log(`   New balance: $${onChainBalance.toFixed(6)} USDC`);

    // Log the sync as a transaction if there was a deposit
    if (difference > 0) {
      await supabase
        .from('transactions')
        .insert({
          wallet_id: wallet.id,
          type: 'deposit',
          amount: difference.toString(),
          currency: 'USDC',
          status: 'completed',
          external_provider: 'blockchain_sync',
          metadata: {
            syncedAt: new Date().toISOString(),
            previousBalance: dbBalance,
            newBalance: onChainBalance,
          },
          created_at: new Date().toISOString(),
        });

      console.log(`   📋 Created transaction record for +$${difference.toFixed(6)} USDC`);
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Get email from command line argument
const email = process.argv[2] || 'jaffarkeikeis@gmail.com';

console.log('═'.repeat(60));
console.log('   Pesafi On-Chain Balance Sync Tool');
console.log('═'.repeat(60));
console.log();

syncBalance(email).then(() => {
  console.log();
  console.log('═'.repeat(60));
  console.log('   Done!');
  console.log('═'.repeat(60));
  process.exit(0);
});
