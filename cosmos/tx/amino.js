require('dotenv').config();

const { AminoTypes, StargateClient, defaultRegistryTypes } = require('@cosmjs/stargate');
const { assertIsDeliverTxSuccess, SigningStargateClient } = require('@cosmjs/stargate');
const { Registry, makeAuthInfoBytes, encodePubkey } = require('@cosmjs/proto-signing');
const { coins, encodeSecp256k1Pubkey, makeSignDoc, serializeSignDoc, encodeSecp256k1Signature } = require('@cosmjs/amino');
const { fromBase64, toHex, fromHex } = require('@cosmjs/encoding');
const { SignMode } = require('cosmjs-types/cosmos/tx/signing/v1beta1/signing');
const { TxRaw } = require('cosmjs-types/cosmos/tx/v1beta1/tx');
const crypto = require('@cosmjs/crypto');
const { Int53 } = require('@cosmjs/math');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const privKey = process.env.PRIV_KEY;

async function amino() {
  const prefix = 'cosmos';
  const aminoTypes = new AminoTypes({ prefix });
  const registry = new Registry(defaultRegistryTypes);

  const priv = Buffer.from(privKey, 'hex');
  const keypair = ec.keyFromPrivate(priv);

  const signerAddress = 'cosmos14hm24e5wepv5qh5ny2lc50v2hu7fy9gklcd07w';
  var sec256k1Pubkey = fromHex(keypair.getPublic(true, 'hex'));

  console.log('signer address : ', signerAddress);

  const rpcEndpoint = 'https://rpc.testnet.cosmos.network:443';

  const client = await StargateClient.connect(rpcEndpoint);

  const signerAccount = await client.getAccount(signerAddress);
  console.log('account', signerAccount);

  const balance = await client.getBalance(signerAddress, 'uphoton');
  console.log('balance', balance);

  const chainId = await client.getChainId();
  console.log('chainId', chainId);
  const recipient = 'cosmos1xv9tklw7d82sezh9haa573wufgy59vmwe6xxe5';
  const amount = {
    denom: 'uphoton',
    amount: '1234567',
  };
  const gasLimit = 200000;
  const fee = {
    amount: coins(2000, 'uphoton'),
    gas: gasLimit.toString(),
  };
  console.log('fee', JSON.stringify(client.fees, null, 2));

  const msg = {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress: signerAddress,
      toAddress: recipient,
      amount: [amount],
    },
  };

  const memo = 'memo';
  const signingInstruction = {
    accountNumber: signerAccount.accountNumber,
    sequence: signerAccount.sequence,
    chainId,
    msgs: [msg],
    fee,
    memo,
  };

  const pubkey = encodePubkey(encodeSecp256k1Pubkey(sec256k1Pubkey));
  const signMode = SignMode.SIGN_MODE_LEGACY_AMINO_JSON;
  const messages = signingInstruction.msgs;
  const { accountNumber, sequence } = signingInstruction;

  const msgs = messages.map((msg) => aminoTypes.toAmino(msg));
  console.log('msgs', JSON.stringify(msgs, null, 2));

  const signDoc = makeSignDoc(msgs, fee, chainId, memo, accountNumber, sequence);

  const signBytes = serializeSignDoc(signDoc);
  const message = toHex(crypto.sha256(signBytes));
  console.log('message : ', message);

  // the `canonical` option ensures creation of lowS signature representations
  const { r, s, recoveryParam } = keypair.sign(message, { canonical: true });
  const signatureBytes = new Uint8Array([...Uint8Array.from(r.toArray()), ...Uint8Array.from(s.toArray())]);
  var signature = encodeSecp256k1Signature(sec256k1Pubkey, signatureBytes);
  const signed = signDoc;

  console.log('singed', signed);
  console.log('signature', signature.signature);
  console.log('signature hex', toHex(fromBase64(signature.signature)));

  const signedTxBody = {
    messages: signed.msgs.map((msg) => aminoTypes.fromAmino(msg)),
    memo: signed.memo,
  };

  const signedTxBodyEncodeObject = {
    typeUrl: '/cosmos.tx.v1beta1.TxBody',
    value: signedTxBody,
  };

  console.log('signedTxBodyEncodeObject : ', JSON.stringify(signedTxBodyEncodeObject));

  const signedTxBodyBytes = registry.encode(signedTxBodyEncodeObject);
  console.log('signedTxBodyBytes :', toHex(signedTxBodyBytes));

  const signedGasLimit = Int53.fromString(signed.fee.gas).toNumber();
  const signedSequence = Int53.fromString(signed.sequence).toNumber();
  const signedAuthInfoBytes = makeAuthInfoBytes([{ pubkey, sequence: signedSequence }], signed.fee.amount, signedGasLimit, signMode);

  var txRaw = TxRaw.fromPartial({
    bodyBytes: signedTxBodyBytes,
    authInfoBytes: signedAuthInfoBytes,
    signatures: [fromBase64(signature.signature)],
  });

  var txBytes = TxRaw.encode(txRaw).finish();
  console.log(toHex(txBytes));
  // return;
  const result = await client.broadcastTx(txBytes);
  console.log('result', result);
  assertIsDeliverTxSuccess(result);
}

amino().catch(console.error);
