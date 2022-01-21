require('dotenv').config();
const assert = require('assert');

const { assertIsDeliverTxSuccess, SigningStargateClient, GasPrice, defaultRegistryTypes } = require('@cosmjs/stargate');
const { DirectSecp256k1HdWallet, Registry, makeAuthInfoBytes, encodePubkey, makeSignDoc, makeSignBytes } = require('@cosmjs/proto-signing');
const { coins, encodeSecp256k1Pubkey, encodeSecp256k1Signature } = require('@cosmjs/amino');
const { TxRaw } = require("cosmjs-types/cosmos/tx/v1beta1/tx");
const { fromBase64, toBase64, toHex, fromHex } = require('@cosmjs/encoding');
const crypto = require("@cosmjs/crypto")
const { Int53 } = require("@cosmjs/math")
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

const mnemonic = process.env.MNEMONIC;
const privKey = process.env.PRIV_KEY;

const priv = Buffer.from(privKey, 'hex');
const keypair = ec.keyFromPrivate(priv);

const registry = new Registry(defaultRegistryTypes);

async function direct() {
  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
  const [firstAccount] = await wallet.getAccounts();
  var sec256k1Pubkey = fromHex(keypair.getPublic(true, 'hex'));
  const rpcEndpoint = 'https://rpc.testnet.cosmos.network:443';
  const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);

  const account = await client.getAccount(firstAccount.address);
  console.log('account', account);

  // const balance = await client.getBalance(firstAccount.address, 'uphoton');
  // console.log('balance', balance);

  const chainId = await client.getChainId();
  console.log('chainId', chainId);

  const senderAddress = account.address;
  const recipientAddress = 'cosmos1xv9tklw7d82sezh9haa573wufgy59vmwe6xxe5';
  const amount = {
    denom: 'uphoton',
    amount: '1234567',
  };
  const gasLimit = 200000;

  const fee = {
    amount: coins(2000, "uphoton"),
    gas: gasLimit.toString(),
  };

  const sendMsg = {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: {
      fromAddress: senderAddress,
      toAddress: recipientAddress,
      amount: [amount],
    },
  };
  const signingData = {
    chainId: chainId,
    accountNumber: account.accountNumber,
    sequence: account.sequence,
    sec256k1Pubkey: sec256k1Pubkey,
  }

  const memo = 'some memo';

  var txRaw = await client.signDirect(senderAddress, [sendMsg], fee, memo, signingData);
  const txBytes = TxRaw.encode(txRaw).finish();

  var txRaw_2 = await signDirect([sendMsg], fee, memo, signingData);
  const txBytes_2 = TxRaw.encode(txRaw_2).finish();

  assert.equal(toHex(txRaw.bodyBytes), toHex(txRaw_2.bodyBytes), 'txRaw bodyBytes should be equal.');
  assert.equal(toHex(txRaw.authInfoBytes), toHex(txRaw_2.authInfoBytes), 'txRaw authInfoBytes should be equal.');

  const result = await client.broadcastTx(txBytes_2);
  console.log('result', result);
  assertIsDeliverTxSuccess(result);
}


async function signDirect(msgs, fee, memo, signerData) {
  const { accountNumber, sequence, sec256k1Pubkey, chainId } = signerData;

  const pubkey = encodePubkey(encodeSecp256k1Pubkey(sec256k1Pubkey));
  const txBodyEncodeObject = {
    typeUrl: "/cosmos.tx.v1beta1.TxBody",
    value: {
      messages: msgs,
      memo: memo,
    },
  };

  const txBodyBytes = registry.encode(txBodyEncodeObject);

  const gasLimit = Int53.fromString(fee.gas).toNumber();
  const authInfoBytes = makeAuthInfoBytes([{ pubkey, sequence }], fee.amount, gasLimit);
  const signDoc = makeSignDoc(txBodyBytes, authInfoBytes, chainId, accountNumber);
  const signBytes = makeSignBytes(signDoc);

  const hashedMessage = toHex(crypto.sha256(signBytes));

  const { r, s, recoveryParam } = keypair.sign(hashedMessage, { canonical: true });
  const signatureBytes = new Uint8Array([...Uint8Array.from(r.toArray()), ...Uint8Array.from(s.toArray())]);
  var signature = encodeSecp256k1Signature(sec256k1Pubkey, signatureBytes);

  return TxRaw.fromPartial({
    bodyBytes: txBodyBytes,
    authInfoBytes,
    signatures: [fromBase64(signature.signature)],
  });
}

direct().catch(console.error);