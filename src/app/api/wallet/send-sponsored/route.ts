import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { paymasterService } from '@/lib/paymaster';

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC
const BASE_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

// USDC ABI for transfer function
const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

/**
 * Send USDC with Sponsored Gas (Paymaster)
 * 
 * This endpoint sends USDC transactions where gas fees are sponsored by Coinbase Paymaster,
 * providing a seamless Web2-like experience for users.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, recipientAddress } = await request.json();

    // Validate input
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!recipientAddress || !recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      return NextResponse.json({ error: 'Invalid recipient address' }, { status: 400 });
    }

    console.log(`[SEND SPONSORED] User ${user.id} sending ${amount} USDC to ${recipientAddress}`);

    // Check if paymaster is configured
    if (!paymasterService.isConfigured()) {
      console.warn('[SEND SPONSORED] Paymaster not configured, falling back to regular send');
      // Fall back to regular send endpoint if paymaster not available
      return NextResponse.json({ 
        error: 'Gas sponsorship not available. Please use regular send endpoint.' 
      }, { status: 503 });
    }

    // Get sender's wallet with encrypted private key
    const { data: senderWallet, error: senderError } = await supabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (senderError || !senderWallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    if (!senderWallet.encrypted_private_key) {
      return NextResponse.json({ error: 'No private key found for wallet' }, { status: 400 });
    }

    // Decrypt private key
    const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;
    if (!encryptionKey) {
      return NextResponse.json({ error: 'Encryption key not configured' }, { status: 500 });
    }

    const keyHash = crypto.createHash('sha256').update(encryptionKey).digest();
    const [ivHex, authTagHex, encryptedHex] = senderWallet.encrypted_private_key.split(':');

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', keyHash, iv);
    decipher.setAuthTag(authTag);

    let privateKey = decipher.update(encrypted, undefined, 'utf8');
    privateKey += decipher.final('utf8');

    console.log('[SEND SPONSORED] Private key decrypted successfully');

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('[SEND SPONSORED] Wallet address:', wallet.address);

    // Create USDC contract instance
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

    // Check balance on-chain
    const balance = await usdcContract.balanceOf(wallet.address);
    const balanceUsdc = Number(balance) / 1e6; // USDC has 6 decimals

    console.log('[SEND SPONSORED] On-chain USDC balance:', balanceUsdc);

    if (balanceUsdc < amount) {
      return NextResponse.json({
        error: `Insufficient balance. You have ${balanceUsdc} USDC but trying to send ${amount} USDC`
      }, { status: 400 });
    }

    try {
      // Build sponsored user operation
      console.log('[SEND SPONSORED] Building sponsored transaction...');
      
      const userOp = await paymasterService.buildSponsoredUSDCTransfer(
        wallet,
        recipientAddress,
        amount.toString(),
        USDC_ADDRESS
      );

      // Sign the user operation
      const userOpHash = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
        ['address', 'uint256', 'bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes32'],
        [
          userOp.sender,
          userOp.nonce,
          ethers.keccak256(userOp.initCode),
          ethers.keccak256(userOp.callData),
          userOp.callGasLimit,
          userOp.verificationGasLimit,
          userOp.preVerificationGas,
          userOp.maxFeePerGas,
          userOp.maxPriorityFeePerGas,
          ethers.keccak256(userOp.paymasterAndData),
        ]
      ));

      const signature = await wallet.signMessage(ethers.getBytes(userOpHash));
      userOp.signature = signature;

      // Send sponsored transaction through bundler
      console.log('[SEND SPONSORED] Sending sponsored transaction...');
      const userOpResultHash = await paymasterService.sendSponsoredUserOp(userOp);

      console.log('[SEND SPONSORED] User operation submitted:', userOpResultHash);

      // Wait for receipt (poll for completion)
      let receipt = null;
      let attempts = 0;
      const maxAttempts = 30; // 30 seconds max wait

      while (!receipt && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
          receipt = await paymasterService.getUserOpReceipt(userOpResultHash);
          if (receipt) break;
        } catch (err) {
          // Receipt not available yet, continue polling
        }
        attempts++;
      }

      if (!receipt) {
        console.warn('[SEND SPONSORED] Transaction pending, receipt not available yet');
      } else {
        console.log('[SEND SPONSORED] Transaction confirmed:', receipt.transactionHash);
      }

      // Update database balances
      const newBalance = balanceUsdc - amount;
      await supabase
        .from('wallet')
        .update({
          usdc_balance: newBalance.toString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', senderWallet.id);

      // Log transaction
      const txHash = receipt?.transactionHash || userOpResultHash;
      await supabase
        .from('transaction')
        .insert({
          id: crypto.randomUUID(),
          from_address: wallet.address,
          to_address: recipientAddress,
          amount: amount.toString(),
          usd_amount: amount.toString(),
          currency: 'USDC',
          status: receipt ? 'completed' : 'pending',
          type: 'send',
          tx_hash: txHash,
          category: 'base',
          metadata: { gas_sponsored: true },
          created_at: new Date().toISOString(),
        });

      return NextResponse.json({
        success: true,
        txHash: txHash,
        userOpHash: userOpResultHash,
        amount,
        recipient: recipientAddress,
        gasSponsored: true,
        message: 'Transaction sent with sponsored gas! (Zero gas fees)',
      });

    } catch (paymasterError: any) {
      console.error('[SEND SPONSORED] Paymaster error, falling back to regular transaction:', paymasterError);

      // Fallback: Try regular transaction (requires user to have ETH)
      const amountInUnits = ethers.parseUnits(amount.toString(), 6);
      
      try {
        const tx = await usdcContract.transfer(recipientAddress, amountInUnits);
        console.log('[SEND SPONSORED] Fallback transaction sent:', tx.hash);
        
        const receipt = await tx.wait();
        console.log('[SEND SPONSORED] Fallback transaction confirmed');

        // Update database
        const newBalance = balanceUsdc - amount;
        await supabase
          .from('wallet')
          .update({
            usdc_balance: newBalance.toString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', senderWallet.id);

        return NextResponse.json({
          success: true,
          txHash: tx.hash,
          amount,
          recipient: recipientAddress,
          gasSponsored: false,
          message: 'Transaction sent (user paid gas)',
          warning: 'Gas sponsorship failed, transaction sent with user funds',
        });
      } catch (fallbackError: any) {
        console.error('[SEND SPONSORED] Fallback transaction also failed:', fallbackError);
        
        // Check if it's insufficient gas error
        if (fallbackError.code === 'INSUFFICIENT_FUNDS') {
          return NextResponse.json({
            error: 'Insufficient ETH for gas fees and gas sponsorship is unavailable. Please contact support.',
            code: 'INSUFFICIENT_GAS',
            details: fallbackError.message,
          }, { status: 400 });
        }

        throw fallbackError;
      }
    }

  } catch (error: any) {
    console.error('[SEND SPONSORED] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Transaction failed',
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

