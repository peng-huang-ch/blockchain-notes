const { DirectSecp256k1HdWallet } = require('@cosmjs/proto-signing');
const { assertIsBroadcastTxSuccess, SigningStargateClient, StargateClient, Tendermint34Client, buildFeeTable, GasPrice } = require('@cosmjs/stargate');
const { CommunityPoolSpendProposal } = require('@cosmjs/stargate/build/codec/cosmos/distribution/v1beta1/distribution');

const mnemonic = 'spice review cycle among deal estate main sport fold source face avocado';

async function main() {
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
  console.log('feee', JSON.stringify(client.fees, null, 2));
  // return;
  const result = await client.sendTokens(firstAccount.address, recipient, [amount], 'Have fun with your star coins');
  console.log('result', result);
  assertIsBroadcastTxSuccess(result);
}

main().catch(console.error);
