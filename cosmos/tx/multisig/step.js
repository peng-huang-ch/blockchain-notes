const { DirectSecp256k1HdWallet, Registry, makeAuthInfoBytes, encodePubkey, decodePubkey, makeSignDoc, makeSignBytes } = require('@cosmjs/proto-signing');
const {
  Secp256k1HdWallet,
  SigningCosmosClient,
  coins,
} = require("@cosmjs/launchpad");
const { toBase64, toHex, fromHex } = require('@cosmjs/encoding');
const crypto = require('@cosmjs/crypto');
const { createMultisigThresholdPubkey, encodeSecp256k1Pubkey, pubkeyToAddress, pubkeyToRawAddress, makeCosmoshubPath } = require('@cosmjs/amino');
const { defaultRegistryTypes, SigningStargateClient, StargateClient, Tendermint34Client, buildFeeTable, GasPrice } = require('@cosmjs/stargate');
const tx_1 = require('@cosmjs/stargate/build/codec/cosmos/tx/v1beta1/tx');
const tx_4 = require('@cosmjs/stargate/build/codec/cosmos/tx/v1beta1/tx');

var pubKeys = [
  "02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5",
  "0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd",
  "02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266"
].map(key => Buffer.from(key, 'hex')).map(key => {
  return {
    type: "tendermint/PubKeySecp256k1",
    value: toBase64(key),
  }
});

async function main() {
  const threshold = 2;
  const prefix = 'cosmos';

  const multisig = createMultisigThresholdPubkey(pubKeys, threshold, true);
  const multisigAddress = pubkeyToAddress(multisig, prefix);
  const recipient = multisigAddress;
  const registry = new Registry(defaultRegistryTypes);
  const rpcEndpoint = 'https://rpc.testnet.cosmos.network:443';
  const client = await StargateClient.connect(rpcEndpoint);

  console.log('multisigAddress : ', multisigAddress);
  const gasPrice = GasPrice.fromString('0.025uphoton');
  const account = await client.getAccount(multisigAddress);
  console.log('account', account);

  const balance = await client.getBalance(multisigAddress, 'uphoton');
  console.log('balance', balance);

  const chainId = await client.getChainId();
  console.log('chainId', chainId);

  const amount = {
    denom: 'uphoton',
    amount: '100000',
  };

  const msg = {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress: firstAccount.address,
      toAddress: recipient,
      amount: [amount],
    },
  };
  const fee = { amount: [{ amount: '2000', denom: 'uphoton' }], gas: '80000' };
  const signerData = { accountNumber: 625, sequence: 7, chainId: 'cosmoshub-testnet' };
  const gasLimit = fee.gas;
  const txBodyEncodeObject = {
    typeUrl: '/cosmos.tx.v1beta1.TxBody',
    value: {
      messages: [msg],
      // memo: '',
    },
  };
  console.log(JSON.stringify(txBodyEncodeObject, null, 4));
  const txBodyBytes = registry.encode(txBodyEncodeObject);

  const txAuthInfoBytes = makeAuthInfoBytes([pub], fee.amount, gasLimit, signerData.sequence);
  // const txAuthInfoBytes = makeAuthInfoBytes([pubkey], fee.amount, gasLimit, signerData.sequence);
  console.log('txBody', toHex(txBodyBytes));
  console.log('----');
  console.log(toHex(txBodyBytes));
  console.log(toHex(txAuthInfoBytes));
  console.log('----');
  const tmpTx = tx_4.TxRaw.fromPartial({
    bodyBytes: txBodyBytes,
    authInfoBytes: txAuthInfoBytes,
  });
  const tx_bytes = tx_4.TxRaw.encode(tmpTx).finish();
  console.log('tx_bytes', toHex(tx_bytes));

  const newTx = tx_4.TxRaw.decode(fromHex(toHex(tx_bytes)));
  console.log('new Tx : ', newTx);

  const newTxAuthInfo = tx_4.AuthInfo.decode(newTx.authInfoBytes);
  console.log('newTxAuthInfo : ', tx_4.AuthInfo.toJSON(newTxAuthInfo));
  console.log('newTxAuthInfo : ', JSON.stringify(tx_4.AuthInfo.toJSON(newTxAuthInfo), null, 4));

  const signDoc = makeSignDoc(txBodyBytes, txAuthInfoBytes, signerData.chainId, signerData.accountNumber);
  console.log('signDoc', signDoc);

  const signBytes = makeSignBytes(signDoc);
  const hashedMessage = crypto.sha256(signBytes);
  console.log('hashedMessage : ', toHex(hashedMessage));
  // return;
  const txRaw = await client.signDirect(firstAccount.address, [msg], fee, '', signerData);
  const txBytes = tx_4.TxRaw.encode(txRaw).finish();
  console.log(toHex(txBytes));
  console.log(toHex(result) === toHex(txBytes));
  return;
  const tx = tx_4.TxRaw.decode(txBytes);
  console.log('tx', tx);
  // assertIsBroadcastTxSuccess(result2);
}

main().catch(console.error);
