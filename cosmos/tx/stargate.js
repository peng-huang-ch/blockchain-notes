const { assertIsDeliverTxSuccess, SigningStargateClient, GasPrice } = require('@cosmjs/stargate');
const { Secp256k1HdWallet } = require('@cosmjs/amino');
const { coin, coins, decodeTxRaw, DirectSecp256k1HdWallet, Registry } = require("@cosmjs/proto-signing");
const { TxRaw } = require("cosmjs-types/cosmos/tx/v1beta1/tx");
const { fromBase64, toBase64, toHex, fromHex } = require('@cosmjs/encoding');

const mnemonic = 'spice review cycle among deal estate main sport fold source face avocado';

async function main() {
  // const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
  const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic);
  const [firstAccount] = await wallet.getAccounts();
  console.log('firstAccount', firstAccount.address);
  const signerAddress = firstAccount.address;
  const rpcEndpoint = 'https://rpc.testnet.cosmos.network:443';
  // const client = await StargateClient.connect(rpcEndpoint);
  // const gasPrice = GasPrice.fromString('0.025uphoton');
  const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);

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

  const gasLimit = 200000;

  const fee = {
    amount: coins(2000, "uphoton"),
    gas: gasLimit.toString(),
  };

  const sendMsg = {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: {
      fromAddress: signerAddress,
      toAddress: recipient,
      amount: [amount],
    },
  };
  const memo = 'memo';

  const txRaw = await client.sign(signerAddress, [sendMsg], fee, memo);
  const txBytes = TxRaw.encode(txRaw).finish();
  const txHex = toHex(txBytes);
  console.log('txHex', txHex);
  // return;
  const result = await client.broadcastTx(fromHex('0a9b010a92010a1c2f636f736d6f732e62616e6b2e763162657461312e4d736753656e6412720a2d636f736d6f733134686d3234653577657076357168356e79326c6335307632687537667939676b6c6364303777122d636f736d6f7331787639746b6c773764383273657a683968616135373377756667793539766d776536787865351a120a077570686f746f6e12073132333435363712046d656d6f12690a500a460a1f2f636f736d6f732e63727970746f2e736563703235366b312e5075624b657912230a21025802f6b064ae8cd15053422905d304817c3418eb4e79f813e508127a8fc497c912040a02087f181312150a0f0a077570686f746f6e12043230303010c09a0c1a4005bd8d41385b1ff79995ab77f9c7a65fd6f58b08ce3e868f2228cf5c20e53c80476e092fb1c08fb3c5c8cc75c49b37210cedde34d92f57ccb4ff4b6abc36c0b3'));
  console.log('result', result);
  assertIsDeliverTxSuccess(result);
}

main().catch(console.error);

