import { Connection, PublicKey } from '@solana/web3.js';

// Raydium Liquidity Pool V4
const poolId = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

// Establish new connect to mainnet - websocket client connected to mainnet will also be registered here
const url = 'https://api.mainnet-beta.solana.com';
const connection = new Connection(url, 'finalized');

function main() {
  connection.onLogs(
    poolId,
    ({ err, logs, signature }) => {
      if (err) return;
      if (logs && logs.some((log) => log.includes('initialize') || log.includes('initialize2'))) {
        console.log(`Raydium Liquidity Pool initialized: https://solscan.io/tx/${signature}`);
      }
      console.log(logs);
    },
    'confirmed',
  );
}

main();
