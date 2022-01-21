

require('dotenv').config();
const { strict: assert } = require('assert');
const { fromBase64, fromHex, toHex } = require('@cosmjs/encoding');
const { coins, createMultisigThresholdPubkey, encodeSecp256k1Pubkey, pubkeyToAddress, makeCosmoshubPath } = require('@cosmjs/amino');
const { AminoTypes, defaultRegistryTypes, assertIsDeliverTxSuccess, SigningStargateClient, StargateClient, makeMultisignedTx } = require('@cosmjs/stargate');
const { Registry, makeAuthInfoBytes } = require('@cosmjs/proto-signing');
const { Secp256k1HdWallet, makeSignDoc, serializeSignDoc } = require('@cosmjs/amino');
const { TxRaw, AuthInfo, Fee } = require("cosmjs-types/cosmos/tx/v1beta1/tx");
const { SignMode } = require('cosmjs-types/cosmos/tx/signing/v1beta1/signing');
const { Int53, } = require("@cosmjs/math");
const crypto = require("@cosmjs/crypto")
const aminoTypes = new AminoTypes();
const registry = new Registry(defaultRegistryTypes);

async function getMnemonicPubKeyAndAddress(mnemonic, prefix) {
  const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [makeCosmoshubPath(0)],
  });
  const [account] = await wallet.getAccounts();
  const secp256k1PubKey = encodeSecp256k1Pubkey(account.pubkey);
  const address = pubkeyToAddress(secp256k1PubKey, prefix);
  return { wallet, secp256k1PubKey, pubkey: toHex(account.pubkey), address };
}

async function makeAminoSignDoc(
  messages,
  fee,
  memo,
  signerData,
) {
  const { accountNumber, sequence, chainId } = signerData;
  const msgs = messages.map((msg) => aminoTypes.toAmino(msg));
  return makeSignDoc(msgs, fee, chainId, memo, accountNumber, sequence);
}


async function signInstruction(mnemonic, instruction, rpcEmd) {
  const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
    hdPaths: [makeCosmoshubPath(0)],
  });

  const [account] = await wallet.getAccounts();
  const pubkey = encodeSecp256k1Pubkey(account.pubkey);

  const signerData = {
    accountNumber: instruction.accountNumber,
    sequence: instruction.sequence,
    chainId: instruction.chainId,
  };

  // const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);
  // var txRaw = await client.signDirect(senderAddress, [sendMsg], fee, memo, signerData);

  const signDoc = await makeAminoSignDoc(instruction.msgs, instruction.fee, instruction.memo, signerData);
  const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON;

  const [acc] = await wallet.getAccountsWithPrivkeys();
  const { privkey } = acc;
  const message = crypto.sha256(serializeSignDoc(signDoc));

  const signature = await crypto.Secp256k1.createSignature(message, privkey);
  const signatureBytes = new Uint8Array([...signature.r(32), ...signature.s(32)]);

  console.log('pubkey     : ', toHex(account.pubkey));
  console.log('message    : ', toHex(message));
  console.log('signature  : ', toHex(signatureBytes));

  const signed = signDoc;

  const signedTxBody = {
    messages: signed.msgs.map((msg) => aminoTypes.fromAmino(msg)),
    memo: signed.memo,
  };

  const signedTxBodyEncodeObject = {
    typeUrl: '/cosmos.tx.v1beta1.TxBody',
    value: signedTxBody,
  };

  const signedTxBodyBytes = registry.encode(signedTxBodyEncodeObject);
  const signedGasLimit = Int53.fromString(signed.fee.gas).toNumber();
  const signedSequence = Int53.fromString(signed.sequence).toNumber();
  const signedAuthInfoBytes = makeAuthInfoBytes([{ pubkey, sequence: signedSequence }], signed.fee.amount, signedGasLimit, signMode);
  const signatures = [signatureBytes];
  const authInfo = AuthInfo.decode(signedAuthInfoBytes);
  // const { signerInfos, fee: authFee } = authInfo;

  const tx = TxRaw.fromPartial({
    bodyBytes: signedTxBodyBytes,
    authInfoBytes: signedAuthInfoBytes,
    signatures,
  })

  return [pubkey, signatures[0], signedTxBodyBytes, tx];
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

  const keys = await Promise.all([
    AARON,
    PHCC,  //phcc
    PENG
  ].map((mnemonic) => getMnemonicPubKeyAndAddress(mnemonic, prefix)));

  const secp256k1PubKeys = keys.map((item) => item.secp256k1PubKey);
  const pubKeys = keys.map((item) => item.pubkey);


  var multisigPubkey = createMultisigThresholdPubkey(secp256k1PubKeys, threshold, true);
  const multisigAddress = pubkeyToAddress(multisigPubkey, prefix);
  console.log('multisigAddress : ', multisigAddress);

  // account
  const accountOnChain = await client.getAccount(multisigAddress);
  assert(accountOnChain, 'Account does not exist on chain');
  console.log('accountOnChain : ', accountOnChain);

  // balance
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

  console.log('msg       : ', JSON.stringify(msg, null, 4));
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
    [AARON, PHCC, PENG].map(async (mnemonic) => signInstruction(mnemonic, signingInstruction, rpcEndpoint)));
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
  const tx = TxRaw.encode(signedTx).finish();
  console.log('tx : ', toHex(tx));

  const result = await client.broadcastTx(tx);
  console.log('result : ', result);
  assertIsDeliverTxSuccess(result);
  const { transactionHash } = result;
  console.log('tx : ', `https://api.testnet.cosmos.network/cosmos/tx/v1beta1/txs/${transactionHash}`);
}

main().catch(console.error);
