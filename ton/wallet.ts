import { KeyPair, mnemonicToPrivateKey } from '@ton/crypto';
import { TonClient, WalletContractV3R2, WalletContractV4, WalletContractV5R1 } from '@ton/ton';

import 'dotenv/config';

// Create Client
const client = new TonClient({
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: '4f96a149e04e0821d20f9e99ee716e20ff52db7238f38663226b1c0f303003e0',
});

// https://github.com/ton-org/ton/blob/master/src/wallets/WalletContractV3R2.spec.ts
async function walletV3R2(keyPair: KeyPair) {
  const workchain = 0; // Usually you need a workchain 0
  // Create wallet contract
  const wallet = WalletContractV3R2.create({ workchain, publicKey: keyPair.publicKey });
  const contract = client.open(wallet);
  const address = contract.address.toString({ bounceable: false, urlSafe: true });
  console.log('v3r2 address', address);
  // Get balance
  const balance: bigint = await contract.getBalance();
  console.log('balance', balance);
  return contract;
}

// https://github.com/ton-org/ton/blob/master/src/wallets/WalletContractV4.spec.ts
async function walletV4R2(keyPair: KeyPair) {
  const workchain = 0; // Usually you need a workchain 0
  // Create wallet contract
  const wallet = WalletContractV4.create({ workchain, publicKey: keyPair.publicKey });
  const contract = client.open(wallet);
  const address = contract.address.toString({ bounceable: false, urlSafe: true });
  console.log('v4r2 address', address);
  // Get balance
  const balance: bigint = await contract.getBalance();
  console.log('balance', balance);

  return contract;
}

// https://github.com/ton-org/ton/blob/master/src/wallets/v5r1/WalletContractV5R1.spec.ts
async function walletV5R1(keyPair: KeyPair) {
  // Create wallet contract
  const wallet = WalletContractV5R1.create({ publicKey: keyPair.publicKey });
  const contract = client.open(wallet);
  const address = contract.address.toString({ bounceable: false, urlSafe: true });
  console.log('v5 address', address);
  // Get balance
  const balance: bigint = await contract.getBalance();
  console.log('balance', balance);
  return contract;
}

async function main() {
  const mnemonics = process.env.TON_MNEMONIC;
  const keyPair = await mnemonicToPrivateKey(mnemonics.split(' '));
  await walletV3R2(keyPair);

  await walletV4R2(keyPair);

  await walletV5R1(keyPair);
}

main().catch(console.error);
