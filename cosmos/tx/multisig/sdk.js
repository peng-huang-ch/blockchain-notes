require('dotenv').config();
const { strict: assert } = require('assert');

const { Secp256k1HdWallet, coins, assertIsBroadcastTxSuccess } = require('@cosmjs/launchpad');

const { createMultisigThresholdPubkey, encodeSecp256k1Pubkey, pubkeyType, pubkeyToAddress, makeCosmoshubPath } = require('@cosmjs/amino');
const { SigningStargateClient, StargateClient, makeMultisignedTx } = require('@cosmjs/stargate');
const { TxRaw } = require('cosmjs-types/cosmos/tx/v1beta1/tx');

async function getMnemonicPubKeyAndAddress(mnemonic, prefix) {
  const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [makeCosmoshubPath(0)],
  });
  const [account] = await wallet.getAccounts();
  const secp256k1PubKey = encodeSecp256k1Pubkey(account.pubkey);
  const address = pubkeyToAddress(secp256k1PubKey, prefix);
  return { wallet, pubkey: secp256k1PubKey, address };
}

async function signInstruction(mnemonic, instruction, prefix) {
  const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [makeCosmoshubPath(0)],
  });

  const [account] = await wallet.getAccounts();
  const pubkey = encodeSecp256k1Pubkey(account.pubkey);
  const address = pubkeyToAddress(pubkey, prefix);

  const signingClient = await SigningStargateClient.offline(wallet);
  const signerData = {
    accountNumber: instruction.accountNumber,
    sequence: instruction.sequence,
    chainId: instruction.chainId,
  };

  const { bodyBytes, signatures } = await signingClient.sign(address, instruction.msgs, instruction.fee, instruction.memo, signerData);
  return [pubkey, signatures[0], bodyBytes];
}

// https://github.com/cosmos/cosmjs/blob/c192fc9b95ef97e4afbf7f5b94f8e8194ae428a6/packages/stargate/src/multisignature.spec.ts#L175
async function main() {
  const threshold = 2;
  const prefix = 'cosmos';
  const { AARON, PHCC, PENG } = process.env;

  const rpcEndpoint = 'https://rpc.testnet.cosmos.network:443';
  const client = await StargateClient.connect(rpcEndpoint);
  const multisigAccountAddress = 'cosmos18y4kun6wupgly9kja8awhnqpjhxt6hljyh85gq';
  const receipt = 'cosmos1mca888pm39ld9zjnaagrjcjmtm27w0tzzaydct';

  const keys = await Promise.all([AARON, PHCC, PENG].map((mnemonic) => getMnemonicPubKeyAndAddress(mnemonic, prefix)));

  const pubKeys = keys.map((item) => item.pubkey);

  var multisigPubkey = createMultisigThresholdPubkey(pubKeys, threshold, true);
  const multisigAddress = pubkeyToAddress(multisigPubkey, prefix);
  console.log('multisigAddress : ', multisigAddress);

  // balance
  const accountOnChain = await client.getAccount(multisigAddress);
  assert(accountOnChain, 'Account does not exist on chain');

  const balance = await client.getBalance(multisigAddress, 'uphoton');
  console.log('balance', balance);

  const msgSend = {
    fromAddress: multisigAddress,
    toAddress: receipt,
    amount: coins(2000, 'uphoton'),
  };
  const msg = {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: msgSend,
  };
  const gasLimit = 200000;

  const fee = {
    amount: coins(2000, 'uphoton'),
    gas: gasLimit.toString(),
  };

  const chainId = await client.getChainId();
  const memo = 'happy';
  // On the composer's machine signing instructions are created.
  const signingInstruction = {
    accountNumber: accountOnChain.accountNumber,
    sequence: accountOnChain.sequence,
    chainId,
    msgs: [msg],
    fee,
    memo,
  };

  const [[pubkey0, signature0, bodyBytes], [pubkey1, signature1], [pubkey2, signature2]] = await Promise.all([AARON, PHCC, PENG].map(async (mnemonic) => signInstruction(mnemonic, signingInstruction, prefix)));

  const address0 = pubkeyToAddress(pubkey0, prefix);
  const address1 = pubkeyToAddress(pubkey1, prefix);
  const address2 = pubkeyToAddress(pubkey2, prefix);

  var multisigPubkey = createMultisigThresholdPubkey([pubkey0, pubkey1, pubkey2], threshold, true);
  assert.equal(multisigAccountAddress, pubkeyToAddress(multisigPubkey, prefix), 'should be equal');

  const signedTx = makeMultisignedTx(
    multisigPubkey,
    signingInstruction.sequence,
    signingInstruction.fee,
    bodyBytes,
    new Map([
      [address0, signature0],
      [address1, signature1],
      // [address2, signature2],
    ])
  );

  const result = await client.broadcastTx(Uint8Array.from(TxRaw.encode(signedTx).finish()));
  assertIsBroadcastTxSuccess(result);
  const { transactionHash } = result;
  console.log('tx : ', `https://api.testnet.cosmos.network/cosmos/tx/v1beta1/txs/${transactionHash}`);
}

main().catch(console.error);
