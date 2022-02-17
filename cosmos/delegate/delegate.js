const { DirectSecp256k1HdWallet, Registry } = require("@cosmjs/proto-signing");
const {
	assertIsDeliverTxSuccess,
	SigningStargateClient,
} = require("@cosmjs/stargate");

const { MsgWithdrawDelegatorReward } = require("cosmjs-types/cosmos/distribution/v1beta1/tx");

const { MsgDelegate, MsgUndelegate, MsgBeginRedelegate } = require("cosmjs-types/cosmos/staking/v1beta1/tx");


const rpcEndpoint = 'https://rpc.testnet.cosmos.network:443';

async function delegate() {
	const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
	const [account] = await wallet.getAccounts();

	const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet, { gasPrice: '1000uphoton' });
	var delegatorAddress = account.address;
	var signerAddress = account.address;

	console.log('account address	   : ', signerAddress);
	var { accountNumber, sequence } = await client.getAccount(signerAddress);

	console.log('account accountNumber : ', accountNumber);
	console.log('account sequence	   : ', sequence);

	const validatorAddress = 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd';

	var amount = {
		denom: "uphoton",
		amount: "1234567",
	};

	const fee = {
		amount: [
			{
				denom: "uphoton",
				amount: "2000",
			},
		],
		gas: "180000", // 180k
	};
	const memo = "Use your power wisely";
	const delegateMsg = {
		typeUrl: "/cosmos.staking.v1beta1.MsgDelegate",
		value: MsgDelegate.fromPartial({
			delegatorAddress: delegatorAddress,
			validatorAddress: validatorAddress,
			amount: amount,
		}),
	};
	const result = await client.signAndBroadcast(
		signerAddress,
		[delegateMsg],
		fee,
		memo
	);

	console.log('result : ', result);
	assertIsDeliverTxSuccess(result);
}

async function undelegate() {
	const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
	const [account] = await wallet.getAccounts();

	const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);
	var delegatorAddress = account.address;
	var signerAddress = account.address;
	console.log('signerAddress: ', signerAddress);
	var { accountNumber } = await client.getAccount(signerAddress);
	console.log('account accountNumber : ', accountNumber);

	const validatorAddress = 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd';

	var amount = {
		denom: "uphoton",
		amount: "1234567",
	};

	const fee = {
		amount: [
			{
				denom: "uphoton",
				amount: "2000",
			},
		],
		gas: "180000", // 180k
	};

	const memo = "Use your power wisely";
	const unDelegateMsg = {
		typeUrl: "/cosmos.staking.v1beta1.MsgUndelegate",
		value: MsgUndelegate.fromPartial({
			delegatorAddress: delegatorAddress,
			validatorAddress: validatorAddress,
			amount: amount,
		}),
	};

	const result = await client.signAndBroadcast(
		signerAddress,
		[unDelegateMsg],
		fee,
		memo
	);
	console.log('result : ', result);
	assertIsDeliverTxSuccess(result);
}

async function redelegate() {
	const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
	const [account] = await wallet.getAccounts();

	const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);
	var delegatorAddress = account.address;
	var signerAddress = account.address;
	console.log('signerAddress: ', signerAddress);
	var { accountNumber } = await client.getAccount(signerAddress);
	console.log('account accountNumber : ', accountNumber);

	const validatorAddress = 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd';

	var amount = {
		denom: "uphoton",
		amount: "1234567",
	};

	const fee = {
		amount: [
			{
				denom: "uphoton",
				amount: "2000",
			},
		],
		gas: "180000", // 180k
	};

	const memo = "Use your power wisely";
	const redelegateMsg = {
		typeUrl: "/cosmos.staking.v1beta1.MsgBeginRedelegate",
		value: MsgBeginRedelegate.fromPartial({
			validatorSrcAddress: validatorAddress,
			validatorDstAddress: validatorAddress,
			delegatorAddress: delegatorAddress,
			amount: amount,
		}),
	};

	const result = await client.signAndBroadcast(
		signerAddress,
		[redelegateMsg],
		fee,
		memo
	);
	console.log('result : ', result);
	assertIsDeliverTxSuccess(result);
}

async function withdrawRewards() {
	const wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic);
	const [account] = await wallet.getAccounts();

	const client = await SigningStargateClient.connectWithSigner(rpcEndpoint, wallet);
	var delegatorAddress = account.address;
	var signerAddress = account.address;
	console.log('signerAddress: ', signerAddress);
	var { accountNumber } = await client.getAccount(signerAddress);
	console.log('account accountNumber : ', accountNumber);

	const validatorAddress = 'cosmosvaloper17qukqafj25wn8gdjwzlmlcm9xl00rxxe2lxujd';

	const fee = {
		amount: [
			{
				denom: "uphoton",
				amount: "2000",
			},
		],
		gas: "180000", // 180k
	};

	const memo = "Use your power wisely";
	const withdrawMsg = {
		typeUrl: "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward",
		value: MsgWithdrawDelegatorReward.fromPartial({
			delegatorAddress: delegatorAddress,
			validatorAddress: validatorAddress,
		}),
	};

	const result = await client.signAndBroadcast(
		signerAddress,
		[withdrawMsg],
		fee,
		memo
	);
	console.log('result : ', result);
	assertIsDeliverTxSuccess(result);
}

delegate().catch(console.error);
// undelegate().catch(console.error);
// redelegate().catch(console.error);
// withdrawRewards().catch(console.error)
