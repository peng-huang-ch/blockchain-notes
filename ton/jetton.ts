import assert from 'node:assert/strict';

import { mnemonicToPrivateKey } from '@ton/crypto';
import {
  Address,
  SendMode,
  TonClient,
  JettonMaster,
  JettonWallet,
  beginCell,
  toNano,
  external,
  internal,
  storeMessageRelaxed,
  storeMessage,
  WalletContractV5R1,
  Cell,
  MessageRelaxed,
} from '@ton/ton';

import 'dotenv/config';
import { number } from '@noble/hashes/_assert';

export const calculateUsdtAmount = (usdc: number) => BigInt(usdc * 10 ** 6);

// Create Client
const client = new TonClient({
  // endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  // apiKey: '4f96a149e04e0821d20f9e99ee716e20ff52db7238f38663226b1c0f303003e0',
  // ------------------
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: '4f96a149e04e0821d20f9e99ee716e20ff52db7238f38663226b1c0f303003e0',
});

export interface IBurnBody {
  queryId: number; // query id
  jettonAmount: number | bigint; // jetton amount, amount * 10^decimals
  responseAddress: Address; // response address
}

export function createBurnBody({ queryId, jettonAmount, responseAddress }: IBurnBody): Cell {
  return beginCell()
    .storeUint(0x595f07bc, 32) // opcode for jetton burn
    .storeUint(queryId, 64)
    .storeCoins(jettonAmount)
    .storeAddress(responseAddress)
    .endCell();
}

export interface ITransferBody {
  queryId: number;
  jettonAmount: number | bigint; // jetton amount, amount * 10^decimals
  toAddress: Address;
  responseAddress: Address; // response address
  forwardAmount?: number | bigint; // forward amount - if > 0, will send notification message
  forwardPayload?: Cell;
}

/**
 * Create jetton transfer body
 * https://github.com/ton-org/ton/issues/44
 * https://docs.ton.org/develop/dapps/cookbook#how-to-construct-a-message-for-a-jetton-transfer-with-a-comment
 * https://github.com/toncenter/tonweb/blob/76dfd0701714c0a316aee503c2962840acaf74ef/src/contract/token/ft/JettonWallet.js#L22
 * @param ITransferBody
 * @returns
 */
export function createTransferBody({
  queryId,
  jettonAmount,
  toAddress,
  responseAddress,
  forwardAmount,
  forwardPayload,
}: ITransferBody): Cell {
  const builder = beginCell()
    .storeUint(0x0f8a7ea5, 32) // opcode for jetton transfer
    .storeUint(queryId, 64) // query id
    .storeCoins(jettonAmount) // jetton amount, amount * 10^decimals
    .storeAddress(toAddress)
    .storeAddress(responseAddress) // response destination
    .storeBit(0) // no custom payload
    .storeCoins(forwardAmount || 0); // forward amount - if > 0, will send notification message

  if (forwardPayload) {
    builder.storeBit(1); //we store forwardPayload as a reference
    builder.storeRef(forwardPayload);
  } else {
    builder.storeBit(0);
  }

  return builder.endCell();
}

export interface IJettonTransfer extends ITransferBody {
  seqno: number;
  jettonWalletAddress: Address;
  value: bigint | string;
}

/**
 * Create internal message for jetton transfer
 * @param IJettonTransfer
 * @returns
 */
export function createJettonTransferMessage({
  seqno,
  toAddress,
  jettonAmount,
  responseAddress,
  forwardAmount,
  forwardPayload,
  jettonWalletAddress,
  value,
}: IJettonTransfer): MessageRelaxed {
  const body = createTransferBody({
    queryId: seqno,
    toAddress,
    jettonAmount,
    responseAddress,
    forwardAmount,
    forwardPayload,
  });

  return internal({
    to: jettonWalletAddress,
    value,
    bounce: true,
    body,
  });
}

// https://github.com/ton-org/ton/issues/44
// https://docs.ton.org/develop/dapps/cookbook#how-to-construct-a-message-for-a-jetton-transfer-with-a-comment
async function main() {
  const mnemonics = process.env.TON_MNEMONIC;
  const keyPair = await mnemonicToPrivateKey(mnemonics.split(' '));

  // Create wallet contract
  const wallet = WalletContractV5R1.create({ publicKey: keyPair.publicKey });
  const contract = client.open(wallet);
  const walletAddress = wallet.address;
  const balance = await contract.getBalance();
  // Get balance
  console.log('wallet address :', walletAddress.toString({ bounceable: false }));
  console.log('wallet balance :', balance);

  const toAddress = Address.parse('UQCK8IqcjCaiKtWR4Jl0r3HmTNb2WFTMIAO7yh5cIgb8aKes');

  // Create a transfer
  const seqno = await contract.getSeqno();

  const usdtMasterAddress = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs'; // usdt address
  const jettonMaster = client.open(JettonMaster.create(Address.parse(usdtMasterAddress)));
  const jettonWalletAddress = await jettonMaster.getWalletAddress(walletAddress);

  // the jetton data
  {
    const jettonData = await jettonMaster.getJettonData();
    console.log('jettonData : ', jettonData);
    console.log('The jetton wallet for ' + ' is ' + jettonWalletAddress.toString());
  }

  const jettonWallet = client.open(JettonWallet.create(jettonWalletAddress));
  const jettonBalance = await jettonWallet.getBalance();
  console.log('jetton balance : ', jettonBalance);
  // const usdtAmount = 0.1 * 10 ** 6;
  const usdtAmount = 0.1 * 10 ** 6;
  const forwardPayload = beginCell()
    .storeUint(0, 32) // 0 opcode means we have a comment
    .storeStringTail('Hello, TON!')
    .endCell();

  const { init } = contract;
  const contractDeployed = await client.isContractDeployed(walletAddress);
  let neededInit: null | typeof init = null;

  if (init && !contractDeployed) {
    neededInit = init;
  }
  console.log('need init : ', neededInit);

  const messageBody = createTransferBody({
    queryId: seqno,
    toAddress,
    jettonAmount: usdtAmount,
    responseAddress: walletAddress,
    forwardAmount: 0,
  });

  const internalMessage = internal({
    to: jettonWalletAddress,
    value: toNano('0.01'), // 0.01 ton
    bounce: true,
    body: messageBody,
  });

  const internalMessageCell = beginCell().store(storeMessageRelaxed(internalMessage)).endCell();

  const body = wallet.createTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [internalMessage],
    sendMode: SendMode.NONE,
  });

  const externalMessage = external({
    to: walletAddress,
    init: neededInit,
    body,
  });

  const externalMessageCell = beginCell().store(storeMessage(externalMessage)).endCell();
  const signedTransaction = externalMessageCell.toBoc();
  const hash = externalMessageCell.hash().toString('hex');

  console.log('hash:', hash);
}

main().catch(console.error);
