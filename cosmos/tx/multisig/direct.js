require('dotenv').config();
const { strict: assert } = require('assert');

const { fromBase64, fromHex, toHex, Bech32 } = require('@cosmjs/encoding');
const { coins, createMultisigThresholdPubkey, encodeSecp256k1Pubkey, pubkeyToAddress, makeCosmoshubPath } = require('@cosmjs/amino');
const { assertIsDeliverTxSuccess, SigningStargateClient, StargateClient } = require('@cosmjs/stargate');
const { makeCompactBitArray, makeMultisignedTx } = require('@cosmjs/stargate/build/multisignature');
const { DirectSecp256k1HdWallet, Registry, makeAuthInfoBytes, encodePubkey, makeSignDoc } = require('@cosmjs/proto-signing');

const Long = require("long");
const { TxRaw, AuthInfo, Fee } = require("cosmjs-types/cosmos/tx/v1beta1/tx");
const { SignMode } = require('cosmjs-types/cosmos/tx/signing/v1beta1/signing');
const multisig = require("cosmjs-types/cosmos/crypto/multisig/v1beta1/multisig");

async function getMnemonicPubKeyAndAddress(mnemonic, prefix) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [makeCosmoshubPath(0)],
  });
  const [account] = await wallet.getAccounts();
  const secp256k1PubKey = encodeSecp256k1Pubkey(account.pubkey);
  const address = pubkeyToAddress(secp256k1PubKey, prefix);
  return { wallet, pubkey: secp256k1PubKey, address };
}

async function signInstruction(mnemonic, instruction, prefix, rpcEndpoint) {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [makeCosmoshubPath(0)],
  });

  const [account] = await wallet.getAccounts();
  const pubkey = encodeSecp256k1Pubkey(account.pubkey);
  const address = pubkeyToAddress(pubkey, prefix);

  const signerData = {
    accountNumber: instruction.accountNumber,
    sequence: instruction.sequence,
    chainId: instruction.chainId,
  };
  // var txRaw = await client.signDirect(senderAddress, [sendMsg], fee, memo, signerData);
  const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);
  const { bodyBytes, signatures } = await client.sign(address, instruction.msgs, instruction.fee, instruction.memo, signerData);
  return [pubkey, signatures[0], bodyBytes];
}

function makeDirectMultisignedTx(multisigPubkey, sequence, fee, bodyBytes, signatures) {
  const addresses = Array.from(signatures.keys());
  const prefix = Bech32.decode(addresses[0]).prefix;
  const signers = Array(multisigPubkey.value.pubkeys.length).fill(false);
  const signaturesList = new Array();
  for (let i = 0; i < multisigPubkey.value.pubkeys.length; i++) {
    const signerAddress = pubkeyToAddress(multisigPubkey.value.pubkeys[i], prefix);
    const signature = signatures.get(signerAddress);
    if (signature) {
      signers[i] = true;
      signaturesList.push(signature);
    }
  }
  const signerInfo = {
    publicKey: encodePubkey(multisigPubkey),
    modeInfo: {
      multi: {
        bitarray: makeCompactBitArray(signers),
        // modeInfos: signaturesList.map((_) => ({ single: { mode: SignMode.SIGN_MODE_DIRECT } })),
      },
    },
    sequence: Long.fromNumber(sequence),
  };
  const authInfo = AuthInfo.fromPartial({
    signerInfos: [signerInfo],
    fee: {
      amount: [...fee.amount],
      gasLimit: Long.fromString(fee.gas),
    },
  });
  const authInfoBytes = AuthInfo.encode(authInfo).finish();
  const signedTx = TxRaw.fromPartial({
    bodyBytes: bodyBytes,
    authInfoBytes: authInfoBytes,
    signatures: [multisig.MultiSignature.encode(multisig.MultiSignature.fromPartial({ signatures: signaturesList })).finish()],
  });
  return signedTx;
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

  const [
    [pubkey0, signature0, bodyBytes], //
    [pubkey1, signature1], //
    [pubkey2, signature2] //
  ] = await Promise.all(
    [AARON, PHCC, PENG].map(async (mnemonic) => signInstruction(mnemonic, signingInstruction, prefix, rpcEndpoint)));
  console.log('pubkey0 : ', pubkey0);
  console.log('pubkey1 : ', pubkey1);
  console.log('pubkey2 : ', pubkey2);
  const address0 = pubkeyToAddress(pubkey0, prefix);
  const address1 = pubkeyToAddress(pubkey1, prefix);
  const address2 = pubkeyToAddress(pubkey2, prefix);

  var multisigPubkey = createMultisigThresholdPubkey([pubkey0, pubkey1, pubkey2], threshold, true);
  assert.equal(multisigAccountAddress, pubkeyToAddress(multisigPubkey, prefix), 'should be equal');

  const signedTx = makeDirectMultisignedTx(
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
  const tx = TxRaw.encode(signedTx).finish();
  // return;
  const result = await client.broadcastTx(tx);
  console.log('result : ', result);
  assertIsDeliverTxSuccess(result);
  const { transactionHash } = result;
  console.log('tx : ', `https://api.testnet.cosmos.network/cosmos/tx/v1beta1/txs/${transactionHash}`);
}

// TODO now it's not working
main().catch(console.error);
