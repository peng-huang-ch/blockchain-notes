import { Connection, PublicKey } from '@solana/web3.js';
import { PoolInfoLayout, SqrtPriceMath } from '@raydium-io/raydium-sdk';

// Raydium Liquidity Pool V4: WSOL-USDC
const marketId = new PublicKey('8sLbNZoA1cfnvMJLPfp98ZLAnFSYCFApfJKMbiXNLwxj');
const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

// Establish new connect to mainnet - websocket client connected to mainnet will also be registered here
const url = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(url, 'finalized');

function v2() {
  connection.onAccountChange(
    marketId,
    async (accountInfo) => {
      const poolData = PoolInfoLayout.decode(accountInfo.data);
      const price = SqrtPriceMath.sqrtPriceX64ToPrice(poolData.sqrtPriceX64, poolData.mintDecimalsA, poolData.mintDecimalsB).toFixed(6);
      console.log(`WSOL/USDC:`, price);
    },
    'confirmed',
  );
}

function main() {
  v2();
}

main();
