import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabaseClient } from '@/lib/supabase-auth';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { paymasterService } from '@/lib/paymaster';
import { ethereumAddressSchema, usdcAmountSchema, normalizeAddress, validateInput } from '@/lib/validation';
import { ensureGasBalance } from '@/lib/gas-treasury';

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base Mainnet USDC
const BASE_RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://mainnet.base.org';

// USDC ABI for transfer function
const USDC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = createRouteSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { amount, recipientAddress, walletType } = await request.json();

    // Validate amount
    const amountValidation = validateInput(usdcAmountSchema, amount);
    if (!amountValidation.success) {
      return NextResponse.json({ error: amountValidation.error }, { status: 400 });
    }

    // Validate and normalize recipient address
    const addressValidation = validateInput(ethereumAddressSchema, recipientAddress);
    if (!addressValidation.success) {
      return NextResponse.json({ error: addressValidation.error }, { status: 400 });
    }
    const validatedRecipient = normalizeAddress(addressValidation.data);

    console.log(`[SEND] User ${user.id} sending ${amount} USDC to ${validatedRecipient}`);

    // Get sender's wallet with encrypted private key
    let walletQuery = supabase
      .from('wallet')
      .select('*')
      .eq('user_id', user.id);

    if (walletType) {
      walletQuery = walletQuery.eq('wallet_type', walletType);
    }

    const { data: senderWallet, error: senderError } = await walletQuery.limit(1).single();

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

    console.log('[SEND] Private key decrypted successfully');

    // Create provider and wallet
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log('[SEND] Wallet address:', wallet.address);

    // Create USDC contract instance
    const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

    // Check balance on-chain
    const balance = await usdcContract.balanceOf(wallet.address);
    const balanceUsdc = Number(balance) / 1e6; // USDC has 6 decimals

    console.log('[SEND] On-chain balance:', balanceUsdc, 'USDC');

    if (balanceUsdc < amount) {
      return NextResponse.json({
        error: `Insufficient balance. You have ${balanceUsdc} USDC but trying to send ${amount} USDC`
      }, { status: 400 });
    }

    // Auto-fund gas from treasury if needed
    console.log('[SEND] Checking if wallet needs gas...');
    const gasFunding = await ensureGasBalance(wallet.address);

    if (gasFunding.funded) {
      console.log('[SEND] Gas funded from treasury:', {
        amount: gasFunding.amount,
        txHash: gasFunding.txHash,
        newBalance: gasFunding.balance
      });
    } else if (gasFunding.needed && gasFunding.error) {
      console.warn('[SEND] Gas funding failed:', gasFunding.error);
      // Continue anyway - user might have enough gas already
    } else {
      console.log('[SEND] Wallet has sufficient gas:', gasFunding.balance, 'ETH');
    }

    // Try to use paymaster first (sponsored gas), fallback to regular transaction
    let tx: any;
    let receipt: any;
    let gasSponsored = false;

    // NOTE: Paymaster (ERC-4337) only works with smart contract wallets, not EOA wallets
    // Your current wallet system uses EOA wallets with encrypted private keys
    // Paymaster will be enabled when smart contract wallets are implemented
    // For now, skip paymaster and use direct USDC transfers (requires user to have ETH for gas)

    const usePaymaster = false; // Disabled until smart contract wallet implementation

    if (usePaymaster && paymasterService.isConfigured()) {
      console.log('[SEND] Attempting to send with sponsored gas (Paymaster)...');

      try {
        // Build sponsored user operation
        const userOp = await paymasterService.buildSponsoredUSDCTransfer(
          wallet,
          validatedRecipient,
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

        // Send sponsored transaction
        const userOpResultHash = await paymasterService.sendSponsoredUserOp(userOp);
        console.log('[SEND] User operation submitted with sponsored gas:', userOpResultHash);

        // Wait for receipt (poll for completion)
        let attempts = 0;
        const maxAttempts = 30;

        while (!receipt && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          try {
            receipt = await paymasterService.getUserOpReceipt(userOpResultHash);
            if (receipt) break;
          } catch (err) {
            // Receipt not available yet
          }
          attempts++;
        }

        if (receipt) {
          console.log('[SEND] Transaction confirmed with sponsored gas:', receipt.transactionHash);
          tx = { hash: receipt.transactionHash };
          gasSponsored = true;
        } else {
          console.warn('[SEND] Sponsored transaction timeout, falling back to regular transaction');
          throw new Error('Paymaster timeout');
        }
      } catch (paymasterError: any) {
        console.warn('[SEND] Paymaster failed, falling back to regular transaction:', paymasterError.message);
      }
    }

    // Fallback: Regular transaction (requires user to have ETH for gas)
    if (!tx) {
      console.log('[SEND] Sending regular transaction (user pays gas)...');
      
      const amountInUnits = ethers.parseUnits(amount.toString(), 6);
      
      try {
        tx = await usdcContract.transfer(validatedRecipient, amountInUnits);
        console.log('[SEND] Transaction sent:', tx.hash);
        console.log('[SEND] Waiting for confirmation...');
        
        receipt = await tx.wait();
        console.log('[SEND] Transaction confirmed in block:', receipt.blockNumber);
      } catch (txError: any) {
        // Check if it's an insufficient gas error
        if (txError.code === 'INSUFFICIENT_FUNDS') {
          // Check if gas treasury tried to fund
          const errorDetails: any = {
            error: 'Insufficient ETH for gas fees',
            code: 'INSUFFICIENT_GAS',
            walletAddress: wallet.address,
          };

          if (gasFunding.needed && !gasFunding.funded) {
            // Gas funding was attempted but failed
            errorDetails.details = 'Automatic gas funding failed. ' + (gasFunding.error || 'Unknown error');
            errorDetails.treasuryStatus = gasFunding.error;
            errorDetails.solution = 'Please contact support or deposit a small amount of ETH (~$0.003) to your wallet';
          } else {
            // Gas funding not configured or not needed
            errorDetails.details = 'Your wallet needs a small amount of ETH (~$0.003) for gas fees on Base network';
            errorDetails.solution = 'Please deposit some ETH to your wallet address: ' + wallet.address;
          }

          return NextResponse.json(errorDetails, { status: 400 });
        }
        throw txError;
      }
    }

    console.log('[SEND] Transaction complete. Gas sponsored:', gasSponsored);

    // Record transaction in database (balance will be fetched from blockchain on next refresh)
    const txId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    await supabase
      .from('transaction')
      .insert({
        id: txId,
        wallet_id: senderWallet.id,
        type: 'send',
        amount: amount.toString(),
        usd_amount: amount.toString(),
        currency: 'USD',
        status: 'completed',
        category: 'base',
        from_address: wallet.address.toLowerCase(),
        to_address: validatedRecipient.toLowerCase(),
        tx_hash: tx.hash,
        metadata: {
          recipientAddress: validatedRecipient,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed.toString(),
        },
        created_at: new Date().toISOString(),
      });

    // Auto-save recipient as contact
    try {
      const { data: existingContact } = await supabase
        .from('contact')
        .select('id')
        .eq('user_id', user.id)
        .eq('wallet_address', validatedRecipient)
        .maybeSingle();

      if (existingContact) {
        await supabase
          .from('contact')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', existingContact.id);
      } else {
        const contactId = `contact_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await supabase
          .from('contact')
          .insert({
            id: contactId,
            user_id: user.id,
            name: `${validatedRecipient.slice(0, 6)}...${validatedRecipient.slice(-4)}`,
            wallet_address: validatedRecipient,
            source: 'transaction',
            last_used_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      }
    } catch (contactError) {
      // Never fail the send due to contact save
      console.warn('[SEND] Contact auto-save failed:', contactError);
    }

    // Check if recipient has a wallet and update their balance
    const { data: recipientWallet } = await supabase
      .from('wallet')
      .select('*')
      .eq('address', validatedRecipient)
      .single();

    if (recipientWallet) {
      // Record receive transaction for recipient (balance will be fetched from blockchain on their next login)
      const receiveTxId = `tx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      await supabase
        .from('transaction')
        .insert({
          id: receiveTxId,
          wallet_id: recipientWallet.id,
          type: 'receive',
          amount: amount.toString(),
          usd_amount: amount.toString(),
          currency: 'USD',
          status: 'completed',
          category: 'base',
          from_address: wallet.address.toLowerCase(),
          to_address: validatedRecipient.toLowerCase(),
          tx_hash: tx.hash,
          metadata: {
            senderAddress: wallet.address,
            blockNumber: receipt.blockNumber,
          },
          created_at: new Date().toISOString(),
        });

      console.log('[SEND] Recipient transaction recorded');
    }

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber,
      amount,
      recipient: validatedRecipient,
      gasSponsored,
      message: gasSponsored ? 'Transaction sent with sponsored gas! (Zero gas fees)' : 'Transaction sent successfully',
    });

  } catch (error: any) {
    console.error('[SEND] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send transaction' },
      { status: 500 }
    );
  }
}
