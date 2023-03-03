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
const { CustomChain } = require('@ethereumjs/common');

async function exec({
	web3,
	chainId,
	sender,
	senderPrivetKey,
	members,
	multisigContract,
	safeTx
}) {
	const multiSigAddress = multisigContract._address;
	const domain = { verifyingContract: multiSigAddress, chainId };
	var participants = [];
	multisigContract.setProvider(web3.currentProvider);

	for (const item of members) {
		var approverData = await signTypedData(item.privateKey, domain, safeTx);
		participants.push({
			signer: item.address,
			data: approverData
		});
	}

	var approved = safeApproveHash(sender);
	participants.push(approved)

	var signatures = buildSignatureBytes(participants);
	console.log('signatures : ', signatures)
	// return;
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
	console.log("input : ", input);

	const common = Common.custom(CustomChain.PolygonMainnet, {
		hardfork: Hardfork.London
	});
	// common.en
	const senderNonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };

	const gasLimit = await web3.eth.estimateGas({
		from: sender,
		nonce: senderNonce,
		to: multiSigAddress,
		data: input,
	});

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
			to: multiSigAddress,
			data: input,
			value: '0x00',
			nonce: toHex(toBN(senderNonce)),
			gasLimit: toHex(toBN(gasLimit)),

		},
		opts
	);
	const signedTx = tx.sign(toBuffer(addHexPrefix(senderPrivetKey)));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();

	console.log('txid 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);
	return;
	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

async function main() {
	const provider = 'https://polygon-rpc.com/';
	const chainId = 137;
	const web3 = new Web3(provider);

	const sender = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
	const senderPrivetKey = ''

	const receiptor = '0x0495EE61A6c19494Aa18326d08A961c446423cA2';
	// const tokenAddress = '0x01be23585060835e02b77ef475b0cc51aa1e0709';
	const tokenAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';
	const multiSigAddress = '0xfb8f30d39db5930b8db03d2d408edb28562c917a';
	const members = [
		{
			address: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
			privateKey: ''
		},
		// {
		// 	address: '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3',
		// 	privateKey: ''
		// }
	];

	const safeSingleton = getSafeSingletonDeployment({ chain: chainId });
	const safeSingletonABI = safeSingleton.abi;

	const multiSend = getMultiSendCallOnlyDeployment({ chain: chainId });
	const multiSendHandlerAddress = multiSend.networkAddresses[chainId];

	const multiSendABI = multiSend.abi;
	const multisigContract = new Contract(safeSingletonABI, multiSigAddress);
	multisigContract.setProvider(web3.currentProvider);
	var multiSigContractNonce = await multisigContract.methods.nonce().call();
	console.log('multiSigContractNonce : ', multiSigContractNonce)
	// return
	var multiSigContractNonce = 5;
	const txs = [
		// buildSafeTransaction({ to: tokenAddress, operation: 0, data: '0x095ea7b30000000000000000000000001111111254fb6c44bac0bed2854e76f90643097d1999999999999999999999999999999999999999999999999999999999999999' }),
		buildSafeTransaction({ to: tokenAddress, operation: 0, data: '0xa9059cbb000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb300000000000000000000000000000000000000000000000000000000000003e8' }),
	]
	const transaction = encodeMultiSend(txs)
	const iface = new utils.Interface(multiSendABI);
	const data = iface.encodeFunctionData('multiSend', [transaction])

	const safeTx = buildSafeTransaction({
		to: multiSendHandlerAddress,
		data,
		operation: 1,
		nonce: multiSigContractNonce
	});

	return await exec({
		web3,
		chainId,
		members,
		sender,
		senderPrivetKey,
		multisigContract,
		safeTx
	});
}

main().catch(console.error);