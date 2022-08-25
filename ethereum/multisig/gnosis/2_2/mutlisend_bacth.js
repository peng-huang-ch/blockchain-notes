const assert = require('assert');
const Web3 = require('web3');
const Web3Method = require('web3-core-method');
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getMultiSendCallOnlyDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { bufferToHex, toBuffer, addHexPrefix } = require('ethereumjs-util');

const { buildSignatureBytes, buildSafeTransaction, signTypedData, sendTx, safeApproveHash, keySignHash, encodeMultiSend } = require('../gnosis');
const { utils } = require('ethers');

async function sign({
	web3,
	chainId,
	members,
	multisigContract,
	safeTx
}) {
	const safeAddress = multisigContract._address;
	const domain = { verifyingContract: safeAddress, chainId };
	var participants = [];
	multisigContract.setProvider(web3.currentProvider);

	for (const item of members) {
		var approverData = await signTypedData(item.privateKey, domain, safeTx);
		participants.push({
			signer: item.address,
			data: approverData
		});
	}
	var signatures = buildSignatureBytes(participants);
	const params = [
		safeTx.to,
		safeTx.value, // value
		safeTx.data,
		safeTx.operation, // operation
		safeTx.safeTxGas, // safeTxGas
		safeTx.baseGas, // dataGas
		safeTx.gasPrice, // gasPrice
		safeTx.gasToken, // gasToken
		safeTx.refundReceiver, // refundReceiver
		signatures,
	];

	var input = multisigContract.methods.execTransaction(...params).encodeABI();
	return input;
}

async function main() {
	const provider = 'https://goerli.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
	const chainId = Chain.Goerli;
	const common = new Common({ chain: chainId, hardfork: Hardfork.London });
	const web3 = new Web3(provider);
	const sender = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
	const senderPrivetKey = ''

	const receiptor = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
	// const tokenAddress = '0x01be23585060835e02b77ef475b0cc51aa1e0709';
	const tokenAddress = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB';
	const safeAddress = '0xe60CB774c8a5c443Cd5A833E2d0D902d4eC3F9E4';
	const members = [
		{
			address: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
			privateKey: ''
		},
		{
			address: '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3',
			privateKey: ''
		}
	];
	const safeSingleton = getSafeSingletonDeployment({ chain: chainId });
	const safeSingletonABI = safeSingleton.abi;


	const multiSend = getMultiSendCallOnlyDeployment({ chain: chainId });
	const multiSendHandlerAddress = multiSend.networkAddresses[chainId];
	console.log('multiSendHandlerAddress : ', multiSendHandlerAddress);
	const multiSendABI = multiSend.abi;
	const multisigContract = new Contract(safeSingletonABI, safeAddress);
	multisigContract.setProvider(web3.currentProvider);
	// var multiSigContractNonce = 10;
	var multiSigContractNonce = await multisigContract.methods.nonce().call();
	const safeTxs = [
		buildSafeTransaction({ to: tokenAddress, operation: 0, nonce: 15, data: '0xa9059cbb000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb30000000000000000000000000000000000000000000000000de0b6b3a7640000' }),
		buildSafeTransaction({ to: tokenAddress, operation: 0, nonce: 16, data: '0xa9059cbb000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb30000000000000000000000000000000000000000000000001bc16d674ec80000' }),
	]
	const inputs = await Promise.all(safeTxs.map((tx) => sign({ web3, chainId, members, multisigContract, safeTx: tx })));
	const txs = inputs.map((input) => {
		return {
			operation: 0,
			to: safeAddress,
			value: 0,
			data: input,
		}
	})
	const transactions = encodeMultiSend(txs)
	const iface = new utils.Interface(multiSendABI);
	const data = iface.encodeFunctionData('multiSend', [transactions])

	// common
	const senderNonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };

	const txData = {
		from: sender,
		nonce: senderNonce,
		to: multiSendHandlerAddress,
		data,
	};
	const gasLimit = await web3.eth.estimateGas(txData);

	web3.eth.extend({
		methods: [
			new Web3Method({
				name: 'maxPriorityFeePerGas',
				call: 'eth_maxPriorityFeePerGas',
			}),
		],
	});
	const maxPriorityFeePerGas = await web3.eth.maxPriorityFeePerGas();

	const block = await web3.eth.getBlock('pending');
	const baseFeePerGas = block['baseFeePerGas'];
	const maxFeePerGas = toBN(baseFeePerGas).add(toBN(maxPriorityFeePerGas).muln(2));

	const tx = Transaction.fromTxData(
		{
			maxFeePerGas,
			maxPriorityFeePerGas,
			gasLimit: toHex(toBN(gasLimit)),
			value: '0x00',
			...sendTx,
		},
		opts
	);
	const signedTx = tx.sign(toBuffer(addHexPrefix(senderPrivetKey)));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();

	console.log('txid 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);
	// return;
	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

main().catch(console.error);