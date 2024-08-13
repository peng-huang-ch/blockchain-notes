import { KeyPair, mnemonicToPrivateKey } from '@ton/crypto';
import { internal, SendMode, TonClient, WalletContractV3R2, WalletContractV4, WalletContractV5R1, OpenedContract } from '@ton/ton';

import 'dotenv/config';

// Create Client
const client = new TonClient({
  endpoint: 'https://testnet.toncenter.com/api/v2/jsonRPC',
  apiKey: '4f96a149e04e0821d20f9e99ee716e20ff52db7238f38663226b1c0f303003e0',
  // ------------------
  // endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  // apiKey: '4f96a149e04e0821d20f9e99ee716e20ff52db7238f38663226b1c0f303003e0',
});

// your should have a mnemonic in your .env file
// and have to know you contract type (v3r2, v4r2, v5r1)

// v3r2 wallet
async function walletV3R2(keyPair: KeyPair) {
  const workchain = 0; // Usually you need a workchain 0
  // Create wallet contract
  const wallet = WalletContractV3R2.create({ workchain, publicKey: keyPair.publicKey });
  return client.open(wallet);
}

// v4r2 wallet
async function walletV4R2(keyPair: KeyPair) {
  const workchain = 0; // Usually you need a workchain 0
  // Create wallet contract
  const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
  const contract = client.open(wallet);
  return contract;
}

// v5r1 wallet
async function walletV5R1(keyPair: KeyPair) {
  // Create wallet contract
  const wallet = WalletContractV5R1.create({ publicKey: keyPair.publicKey });
  return client.open(wallet);
}

async function main() {
  const mnemonics = process.env.TON_MNEMONIC;
  const keyPair = await mnemonicToPrivateKey(mnemonics.split(' '));
  let contract: OpenedContract<WalletContractV3R2> | OpenedContract<WalletContractV4> | OpenedContract<WalletContractV5R1>;

  contract = await walletV3R2(keyPair);

  // contract = await v4r2Wallet(keyPair);

  // contract = await v5r1Wallet(keyPair);

  // to self
  const toWallet = await walletV4R2(keyPair);
  const toAddress = toWallet.address;

  // Get balance
  let balance: bigint = await contract.getBalance();
  console.log('from address :', contract.address.toString({ bounceable: false }));
  console.log('from balance :', balance);
  console.log('to   address :', toAddress.toString({ bounceable: false }));

  // Create a transfer
  let seqno: number = await contract.getSeqno();

  const transfer = contract.createTransfer({
    seqno,
    secretKey: keyPair.secretKey,
    messages: [
      internal({
        value: '0.01',
        to: toAddress,
        body: '😊😊😊😊',
        bounce: false, // Disable bounce to send to an uninitialized address
      }),
      internal({
        value: '0.02',
        to: (await walletV5R1(keyPair)).address,
        body: '😊😊😊😊😊',
        bounce: false, // Disable bounce to send to an uninitialized address
      }),
    ],
    sendMode: SendMode.NONE,
    // sendMode: SendMode.PAY_GAS_SEPARATELY + SendMode.IGNORE_ERRORS,
  });
  await contract.send(transfer);
}

main().catch(console.error);
