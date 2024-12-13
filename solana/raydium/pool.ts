import 'dotenv/config';
import { PublicKey, Commitment, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  LIQUIDITY_STATE_LAYOUT_V4,
  Liquidity,
  LiquidityPoolKeysV4,
  MARKET_STATE_LAYOUT_V3,
  Market,
  Percent,
  SPL_MINT_LAYOUT,
  TOKEN_PROGRAM_ID,
  Token,
  TokenAmount,
} from '@raydium-io/raydium-sdk';

const RAY_V4_PROGRAM_ID = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');

async function getPoolKeys(
  connection: Connection,
  baseMint: PublicKey,
  quoteMint: PublicKey,
  commitment: Commitment = 'finalized',
): Promise<LiquidityPoolKeysV4> {
  const markets = await getMarkets(connection, baseMint, quoteMint, commitment);
  return await getPoolKeysById(markets[0].id, connection);
}

async function getPoolKeysById(id: string, connection: Connection): Promise<LiquidityPoolKeysV4> {
  const account = await connection.getAccountInfo(new PublicKey(id));
  if (account === null) throw Error('get pool info failed');
  const state = LIQUIDITY_STATE_LAYOUT_V4.decode(account.data);

  const marketId = state.marketId;
  const marketAccount = await connection.getAccountInfo(marketId);
  if (marketAccount === null) throw Error('get market account failed');
  const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

  const lpMint = state.lpMint;
  const lpMintAccount = await connection.getAccountInfo(lpMint);
  if (lpMintAccount === null) throw Error('get lp mint info failed');
  const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

  return {
    id: new PublicKey(id),
    baseMint: state.baseMint,
    quoteMint: state.quoteMint,
    lpMint: state.lpMint,
    baseDecimals: state.baseDecimal.toNumber(),
    quoteDecimals: state.quoteDecimal.toNumber(),
    lpDecimals: lpMintInfo.decimals,
    version: 4,
    programId: account.owner,
    authority: Liquidity.getAssociatedAuthority({ programId: account.owner }).publicKey,
    openOrders: state.openOrders,
    targetOrders: state.targetOrders,
    baseVault: state.baseVault,
    quoteVault: state.quoteVault,
    withdrawQueue: state.withdrawQueue,
    lpVault: state.lpVault,
    marketVersion: 3,
    marketProgramId: state.marketProgramId,
    marketId: state.marketId,
    marketAuthority: Market.getAssociatedAuthority({
      programId: state.marketProgramId,
      marketId: state.marketId,
    }).publicKey,
    marketBaseVault: marketInfo.baseVault,
    marketQuoteVault: marketInfo.quoteVault,
    marketBids: marketInfo.bids,
    marketAsks: marketInfo.asks,
    marketEventQueue: marketInfo.eventQueue,
    lookupTableAccount: PublicKey.default,
  };
}

async function getMarkets(connection: Connection, baseMint: PublicKey, quoteMint: PublicKey, commitment: Commitment = 'finalized') {
  const pools = await connection.getProgramAccounts(RAY_V4_PROGRAM_ID, {
    commitment,
    filters: [
      { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span },
      {
        memcmp: {
          offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('baseMint'),
          bytes: baseMint.toBase58(),
        },
      },
      {
        memcmp: {
          offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf('quoteMint'),
          bytes: quoteMint.toBase58(),
        },
      },
    ],
  });
  return pools.map(({ pubkey, account }) => ({
    id: pubkey.toString(),
    ...LIQUIDITY_STATE_LAYOUT_V4.decode(account.data),
  }));
}

export async function calcAmountOut(
  connection: Connection,
  poolKeys: LiquidityPoolKeysV4,
  rawAmountIn: number,
  slippage: number = 5,
  swapInDirection: boolean,
) {
  const poolInfo = await Liquidity.fetchInfo({ connection, poolKeys });

  let currencyInMint = poolKeys.baseMint;
  let currencyInDecimals = poolInfo.baseDecimals;
  let currencyOutMint = poolKeys.quoteMint;
  let currencyOutDecimals = poolInfo.quoteDecimals;

  if (!swapInDirection) {
    currencyInMint = poolKeys.quoteMint;
    currencyInDecimals = poolInfo.quoteDecimals;
    currencyOutMint = poolKeys.baseMint;
    currencyOutDecimals = poolInfo.baseDecimals;
  }

  const currencyIn = new Token(TOKEN_PROGRAM_ID, currencyInMint, currencyInDecimals);
  const amountIn = new TokenAmount(currencyIn, rawAmountIn.toFixed(currencyInDecimals), false);
  const currencyOut = new Token(TOKEN_PROGRAM_ID, currencyOutMint, currencyOutDecimals);
  const slippageX = new Percent(slippage, 100); // 5% slippage

  const { amountOut, minAmountOut, currentPrice, executionPrice, priceImpact, fee } = Liquidity.computeAmountOut({
    poolKeys,
    poolInfo,
    amountIn,
    currencyOut,
    slippage: slippageX,
  });

  return {
    amountIn,
    amountOut,
    minAmountOut,
    currentPrice,
    executionPrice,
    priceImpact,
    fee,
  };
}

// https://github.com/raydium-io/raydium-sdk
async function main() {
  const endpoint = process.env.SOLANA_RPC_URL;
  if (!endpoint) throw Error('SOLANA_RPC_URL is not set');
  const conn = new Connection(endpoint, { commitment: 'confirmed' });
  const poolKeys = await getPoolKeys(
    conn,
    new PublicKey('So11111111111111111111111111111111111111112'), // WSOL
    new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'), // USDC
  );
  const { amountOut, minAmountOut, currentPrice, executionPrice, priceImpact, fee } = await calcAmountOut(
    conn,
    poolKeys,
    0.01, // 0.01 SOL
    1,
    true,
  );
  console.log(poolKeys);
  console.log('amountOut : ', amountOut.numerator.toString());
  console.log('minAmountOut : ', minAmountOut.numerator.toString());
  console.log('currentPrice : ', currentPrice.numerator.toString());
  console.log('executionPrice : ', executionPrice.numerator.toString());
  console.log('priceImpact : ', priceImpact.numerator.toString());
  console.log('fee : ', fee.numerator.toString());
}

main().catch(console.error);
