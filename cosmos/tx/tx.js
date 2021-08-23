const { DirectSecp256k1HdWallet, Registry, makeAuthInfoBytes, encodePubkey, decodePubkey, makeSignDoc, makeSignBytes } = require('@cosmjs/proto-signing');
const { toBase64, toHex, fromHex } = require('@cosmjs/encoding');
const { encodeSecp256k1Pubkey } = require('@cosmjs/amino');
const crypto = require('@cosmjs/crypto');
const { defaultRegistryTypes, SigningStargateClient, StargateClient, Tendermint34Client, buildFeeTable, GasPrice } = require('@cosmjs/stargate');
const tx_1 = require('@cosmjs/stargate/build/codec/cosmos/tx/v1beta1/tx');
const tx_4 = require('@cosmjs/stargate/build/codec/cosmos/tx/v1beta1/tx');

const mnemonic = 'spice review cycle among deal estate main sport fold source face avocado';

async function main() {
  const registry = new Registry(defaultRegistryTypes);

  const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
  const [firstAccount] = await wallet.getAccounts();
  console.log('firstAccount', firstAccount.address);
  // const rpcEndpoint = 'http://10.0.152.117:26657/';
  const rpcEndpoint = 'https://rpc.testnet.cosmos.network:443';
  // const client = await StargateClient.connect(rpcEndpoint);
  const gasPrice = GasPrice.fromString('0.025uphoton');
  const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet, { gasPrice });

  const account = await client.getAccount(firstAccount.address);
  console.log('account', account);

  const balance = await client.getBalance(firstAccount.address, 'uphoton');
  console.log('balance', balance);

  const chainId = await client.getChainId();
  console.log('chainId', chainId);
  const recipient = 'cosmos1xv9tklw7d82sezh9haa573wufgy59vmwe6xxe5';
  const amount = {
    denom: 'uphoton',
    amount: '1234567',
  };
  console.log('fee', JSON.stringify(client.fees, null, 2));

  const result = await client.sendTokens(firstAccount.address, recipient, [amount], '');
  console.log('result', toHex(result));
  // return;
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
  // const placeholder = '020000000000000000000000000000000000000000000000000000000000000001';

  const pub = encodePubkey(encodeSecp256k1Pubkey(fromHex('025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c9')));
  const x = decodePubkey(pub);
  console.log(x, x.type);
  return;
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
