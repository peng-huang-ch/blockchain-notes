import { Connection, Keypair, LAMPORTS_PER_SOL, VersionedTransaction } from '@solana/web3.js';
import { createJupiterApiClient, DefaultApi, QuoteGetRequest, QuoteResponse, SwapPostRequest, SwapResponse } from '@jup-ag/api';
import bs58 from 'bs58';
import 'dotenv/config';

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC mint address

async function main() {
  const url = process.env.SOLANA_RPC_URL;
  const connection = new Connection(url, 'confirmed');
  const keypair = Keypair.fromSecretKey(bs58.decode(process.env.SOL_SECRET_KEY));
  console.log('userPublicKey : ', keypair.publicKey.toBase58());

  const client = createJupiterApiClient();
  const quoteResponse = await client.quoteGet({
    inputMint: SOL_MINT,
    outputMint: USDC_MINT,
    amount: 0.001 * LAMPORTS_PER_SOL,

    // platformFeeBps: The platform fee to be added (1 basis points)
    // platformFeeBps: 1,
    onlyDirectRoutes: true,
    maxAccounts: 20,
    autoSlippage: true,
  });

  console.log('quoteResponse : ', quoteResponse);

  const swapResponse = await client.swapPost({
    swapRequest: {
      // feeAccount, // Use actual key
      userPublicKey: keypair.publicKey.toBase58(),
      quoteResponse: quoteResponse,
    },
  });

  const swapTransactionBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
  const transactionV0 = VersionedTransaction.deserialize(swapTransactionBuf);
  transactionV0.sign([keypair]);

  const raw = transactionV0.serialize();
  const txid = await connection.sendRawTransaction(raw, {
    skipPreflight: false,
    preflightCommitment: 'confirmed',
  });
  console.log('txid : ', txid);
}

main();
