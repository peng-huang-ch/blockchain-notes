const Web3 = require('web3');
const { ethers } = require('ethers');
const Web3Method = require('web3-core-method');
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getCompatibilityFallbackHandlerDeployment, getMultiSendCallOnlyDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { addHexPrefix, bufferToHex, toBuffer } = require('ethereumjs-util');

const { buildSignatureBytes, buildSafeTransaction, signTypedData, sendTx, safeApproveHash, encodeMultiSend } = require('../gnosis');

async function deploySafeTx({
	chainId,
	endpoint,
	owners,
	threshold,
}) {
	const version = '1.3.0';
	const safeSingleton = getSafeSingletonDeployment({ version });
	const safeSingletonAddress = safeSingleton.networkAddresses[chainId];
	const safeSingletonABI = safeSingleton.abi;

	const proxyFactory = getProxyFactoryDeployment();
	const proxyFactoryABI = proxyFactory.abi;
	const proxyFactoryAddress = proxyFactory.networkAddresses[chainId];

	const compatHandler = getCompatibilityFallbackHandlerDeployment();
	const compatHandlerAddress = compatHandler.networkAddresses[chainId];

	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
	const params = [
		owners,
		threshold,
		ZERO_ADDRESS,
		'0x',
		compatHandlerAddress, // fallback handler
		ZERO_ADDRESS,
		0,
		ZERO_ADDRESS,
	];

	const safeSingletonContract = new Contract(safeSingletonABI);
	const initializer = safeSingletonContract.methods.setup(...params).encodeABI();
	const saltNonce = 1672531400000 || Date.now();

	const proxyFactoryContract = new Contract(proxyFactoryABI, proxyFactoryAddress);
	proxyFactoryContract.setProvider(endpoint);

	const creationCode = await proxyFactoryContract.methods.proxyCreationCode().call();
	const deploymentCode = ethers.utils.solidityPack(["bytes", "uint256"], [creationCode, safeSingletonAddress])

	const input = proxyFactoryContract.methods.createProxyWithNonce(safeSingletonAddress, initializer, saltNonce).encodeABI();

	var salt = ethers.utils.solidityKeccak256(
		["bytes32", "uint256"],
		[ethers.utils.solidityKeccak256(["bytes"], [initializer]), saltNonce]
	)
	var safeAddress = ethers.utils.getCreate2Address(proxyFactoryAddress, salt, ethers.utils.keccak256(deploymentCode))

	const safeTx = buildSafeTransaction({
		data: input,
		to: proxyFactoryAddress,
		value: '0x00',
	});
	return { safeAddress, safeTx }
}


// 2-2. native coin
async function exec_eth({
	web3,
	common,
	members,
	safeAddress,
	receiptor,
}) {
	const chainId = common.chainIdBN().toNumber();
	const gasPrice = await web3.eth.getGasPrice();
	const amount = toHex(toBN(gasPrice).mul(toBN(350000)));
	const safeSingleton = getSafeSingletonDeployment({ chain: chainId });

	const safeSingletonABI = safeSingleton.abi;
	var participants = [];

	const safeContract = new Contract(safeSingletonABI, safeAddress);
	safeContract.setProvider(web3.currentProvider);
	// var safeContractNonce = await safeContract.methods.nonce().call();
	var safeContractNonce = 0;

	const safeTx = buildSafeTransaction({
		to: receiptor,
		value: amount,
		nonce: safeContractNonce,
	});

	const domain = { verifyingContract: safeAddress, chainId };
	for (const item of members) {
		var approverData = await signTypedData(item.privateKey, domain, safeTx);
		participants.push({
			signer: item.address,
			data: approverData,
		});
	}

	var signatures = buildSignatureBytes(participants);

	console.log('signatures : ', signatures);
	console.log('receiptor : ', receiptor);

	const params = [
		safeTx.to,
		safeTx.value, // value
		safeTx.data, // data
		safeTx.operation, // operation
		safeTx.safeTxGas, // safeTxGas
		safeTx.baseGas, // dataGas
		safeTx.gasPrice, // gasPrice
		safeTx.gasToken, // gasToken
		safeTx.refundReceiver, // refundReceiver
		signatures,
	];

	const safeSingletonContract = new Contract(safeSingletonABI);
	var input = safeSingletonContract.methods.execTransaction(...params).encodeABI();

	return buildSafeTransaction({
		data: input,
		to: safeAddress,
		value: '0x00',
	});
}

async function main() {
	const endpoint = 'https://goerli.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
	const chainId = Chain.Goerli;
	const common = new Common({ chain: chainId, hardfork: Hardfork.London });

	const web3 = new Web3(endpoint);
	const sender = '0xE6bac7d1B67690019Dc33fC29F9f156AEa6894B2';
	const senderPrivetKey = '';

	const receiptor = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';

	const members = [
		{
			address: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
			privateKey: '',
		},
		{
			address: '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3',
			privateKey: '',
		}
	];

	// https://goerli.etherscan.io/tx/0x77fc4833222de5d23f03e4f1491e23cfa4fdc51725f620f50a3d73a0e1ee4086
	// 1. send eth to a new contract // 

	// https://goerli.etherscan.io/tx/0x13d9bfbf5666fa3e591c93f481aea2874e700b04b1958a0494eb117169a69d1e
	// 2.1. deploy the safe contract 
	// 2.2. send the tx fee to the relayer
	const { safeTx: safeDeployTx, safeAddress } = await deploySafeTx({
		chainId,
		endpoint,
		owners: [...members.map((item) => item.address), '0xFe7b59Eb9cFB13fb024efD08759Ce4f588CA7363'],
		threshold: 2,
	});
	console.log('safeAddress : ', safeAddress);
	// return;
	const safeTransferTx = await exec_eth({
		web3,
		common,
		members,
		receiptor,
		safeAddress,
	});
	const txs = [
		buildSafeTransaction(safeDeployTx),
		buildSafeTransaction(safeTransferTx),
	];
	// return;
	const multiSend = getMultiSendCallOnlyDeployment({ chain: chainId });
	const multiSendHandlerAddress = multiSend.networkAddresses[chainId];

	const multiSendABI = multiSend.abi;
	const transactions = encodeMultiSend(txs);
	const iface = new ethers.utils.Interface(multiSendABI);
	const data = iface.encodeFunctionData('multiSend', [transactions])

	// common
	const senderNonce = await web3.eth.getTransactionCount(sender);

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
	const maxFeePerGas = toBN(baseFeePerGas).add(toBN(maxPriorityFeePerGas));

	const tx = Transaction.fromTxData(
		{
			maxFeePerGas,
			maxPriorityFeePerGas: toBN(maxPriorityFeePerGas),
			gasLimit: toHex(toBN(gasLimit)),
			value: '0x00',
			...txData,
		},
		{ common }
	);
	const signedTx = tx.sign(toBuffer(addHexPrefix(senderPrivetKey)));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();

	console.log('txId 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);
	// return;
	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);

}
main().catch(console.error);
