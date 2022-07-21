// https://github.com/gnosis/safe-react/blob/5020c0daa31ecc0f26520f206deda5393502ad30/src/logic/safe/store/actions/createTransaction.ts#L53
const assert = require('assert');
const Web3 = require('web3');
const Web3Method = require('web3-core-method');
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork, CustomChain } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getCompatibilityFallbackHandlerDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { bufferToHex, toBuffer } = require('ethereumjs-util');
const { stripHexPrefix } = require('ethjs-util');

const { ZERO_ADDRESS, buildSignatureBytes, buildSafeTransaction, signTypedData, sendTx, safeApproveHash } = require('../gnosis');
const { ethers } = require('ethers');

// 2-2. eth transfer
async function exec_eth_2_2({
	web3,
	chainId,
	sender,
	members,
	multiSigAddress,
	receiptor,
}) {
	const amount = ethers.utils.parseEther('0.01');
	const others = members.filter(item => item.address !== sender);
	const { privateKey } = members.find(item => item.address === sender);

	const chain = Chain.Rinkeby;
	const safeSingleton = getSafeSingletonDeployment({ chain });
	const safeSingletonABI = safeSingleton.abi;
	var participants = [];

	const multisigContract = new Contract(safeSingletonABI, multiSigAddress);
	multisigContract.setProvider(web3.currentProvider);
	var multiSigContractNonce = await multisigContract.methods.nonce().call();
	console.log('multiSigContractNonce', multiSigContractNonce);

	const safeTx = buildSafeTransaction({
		to: receiptor,
		value: amount,
		nonce: multiSigContractNonce,
	});
	const domain = { verifyingContract: multiSigAddress, chainId };

	for (const item of others) {
		var approverData = await signTypedData(item.privateKey, domain, safeTx);
		participants.push({
			signer: item.address,
			data: approverData
		});
	}


	var approved = safeApproveHash(sender);
	participants.push({
		signer: sender,
		data: approved.data,
	})
	var signatures = buildSignatureBytes(participants);
	console.log('receiptor : ', receiptor)

	const params = [
		receiptor,
		amount,
		'0x',
		0, // operation
		0, // safeTxGas
		0, // dataGas
		0, // gasPrice
		ZERO_ADDRESS, // gasToken
		ZERO_ADDRESS, // refundReceiver
		signatures,
	];

	const safeSingletonContract = new Contract(safeSingletonABI);
	var input = safeSingletonContract.methods.execTransaction(...params).encodeABI();

	const common = new Common({ chain: Chain.Rinkeby, hardfork: Hardfork.London });
	const nonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };

	const gasLimit = await web3.eth.estimateGas({
		from: sender,
		nonce,
		data: input,
		to: multiSigAddress,
		value: '0x00',
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
	const maxFeePerGas = toBN(baseFeePerGas).add(toBN(maxPriorityFeePerGas).addn(100000));

	const tx = Transaction.fromTxData(
		{
			maxFeePerGas,
			maxPriorityFeePerGas,
			to: multiSigAddress,
			data: input,
			value: '0x00',
			nonce: toHex(toBN(nonce)),
			gasLimit: toHex(toBN(gasLimit)),
		},
		opts
	);
	const signedTx = tx.sign(toBuffer(privateKey));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();
	console.log('txid 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);
	// return;
	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

// 2-2. erc20 transfer
async function exec_erc20_2_2({
	chainId,
	web3,
	sender,
	members,
	multiSigAddress,
	receiptor,
	tokenAddress,
}) {
	const others = members.filter(item => item.address !== sender);
	const { privateKey } = members.find(item => item.address === sender);

	const quantity = '10000000000000000';
	const domain = { verifyingContract: multiSigAddress, chainId };

	const raw = '0000000000000000000000000000000000000000000000000000000000000000';
	const amount = stripHexPrefix(toHex(toBN(quantity)));
	const data =
		'0xa9059cbb000000000000000000000000' + // token transfer method
		stripHexPrefix(receiptor) + // to address
		raw.substring(0, raw.length - amount.length) + // placeholder
		amount; // amount

	var participants = [];
	const chain = Chain.Rinkeby;
	const safeSingleton = getSafeSingletonDeployment({ chain });
	const safeSingletonABI = safeSingleton.abi;

	const multisigContract = new Contract(safeSingletonABI, multiSigAddress);
	multisigContract.setProvider(web3.currentProvider);
	const threshold = await multisigContract.methods.getThreshold().call();
	console.log('threshold : ', threshold);

	const multiSigContractNonce = await multisigContract.methods.nonce().call();
	const safeTx = buildSafeTransaction({
		to: tokenAddress,
		data,
		nonce: multiSigContractNonce,
	});

	for (const item of others) {
		var approverData = await signTypedData(item.privateKey, domain, safeTx);
		participants.push({
			signer: item.address,
			data: approverData
		});
	}
	var approved = safeApproveHash(sender);
	participants.push({
		signer: sender,
		data: approved.data,
	})
	var signatures = buildSignatureBytes(participants);

	const params = [
		tokenAddress,
		0, // value
		data,
		0, // operation
		0, // safeTxGas
		0, // dataGas
		0, // gasPrice
		ZERO_ADDRESS, // gasToken
		ZERO_ADDRESS, // refundReceiver
		signatures,
	];

	const safeSingletonContract = new Contract(safeSingletonABI);
	var input = safeSingletonContract.methods.execTransaction(...params).encodeABI();

	const common = new Common({ chain: Chain.Rinkeby, hardfork: Hardfork.London });
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
	const maxFeePerGas = toBN(baseFeePerGas).add(toBN(maxPriorityFeePerGas));

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
	const signedTx = tx.sign(toBuffer(privateKey));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();

	console.log('txid 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);

	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

// 2-2. swap usdc -> usdt
async function exec_erc20_2_2_approve({
	web3,
	common,
	chainId,
	provider,
	sender,
	members,
	multiSigAddress,
	tokenAddress,
	swapContract,
}) {
	const others = members.filter(item => item.address !== sender);
	const { privateKey } = members.find(item => item.address === sender);

	const amount = ethers.BigNumber.from(2).pow(256).sub(1).toHexString();
	console.log('amount : ', amount);

	const domain = { verifyingContract: multiSigAddress, chainId };
	const iface = new ethers.utils.Interface([
		'function approve(address spender, uint256 amount) external returns (bool)',
	]);
	const data = iface.encodeFunctionData('approve', [swapContract, amount]);
	console.log('data   : ', data);

	var participants = [];
	const safeSingleton = getSafeSingletonDeployment({ chain: chainId });
	const safeSingletonABI = safeSingleton.abi;

	const multisigContract = new Contract(safeSingletonABI, multiSigAddress);
	multisigContract.setProvider(web3.currentProvider);
	const threshold = await multisigContract.methods.getThreshold().call();
	console.log('threshold : ', threshold);

	const multiSigContractNonce = await multisigContract.methods.nonce().call();
	const safeTx = buildSafeTransaction({
		to: tokenAddress,
		data,
		nonce: multiSigContractNonce,
	});

	for (const item of others) {
		var approverData = await signTypedData(item.privateKey, domain, safeTx);
		participants.push({
			signer: item.address,
			data: approverData
		});
	}
	var approved = safeApproveHash(sender);
	participants.push({
		signer: sender,
		data: approved.data,
	})
	var signatures = buildSignatureBytes(participants);

	const params = [
		tokenAddress,
		0, // value
		data,
		0, // operation
		0, // safeTxGas
		0, // dataGas
		0, // gasPrice
		ZERO_ADDRESS, // gasToken
		ZERO_ADDRESS, // refundReceiver
		signatures,
	];

	const safeSingletonContract = new Contract(safeSingletonABI);
	var input = safeSingletonContract.methods.execTransaction(...params).encodeABI();

	const senderNonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };

	const gasLimit = await web3.eth.estimateGas({
		from: sender,
		nonce: senderNonce,
		to: multiSigAddress,
		data: input,
	});

	const block = await provider.getBlock('latest');
	const maxPriorityFeePerGas = ethers.BigNumber.from("30000000000");
	const maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);

	const tx = Transaction.fromTxData(
		{
			maxFeePerGas: maxFeePerGas.toHexString(),
			maxPriorityFeePerGas: maxPriorityFeePerGas.toHexString(),
			to: multiSigAddress,
			data: input,
			value: '0x00',
			nonce: toHex(toBN(senderNonce)),
			gasLimit: toHex(toBN(gasLimit)),
			type: 0x2,
		},
		opts
	);
	const signedTx = tx.sign(toBuffer(privateKey));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();

	console.log('txid 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);

	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

// 2-2. swap usdt -> usdc (1inch swap)
async function exec_erc20_2_2_swap({
	web3,
	common,
	chainId,
	provider,
	sender,
	members,
	multiSigAddress,
	swapContract,
}) {
	const others = members.filter(item => item.address !== sender);
	const { privateKey } = members.find(item => item.address === sender);

	const amount = ethers.BigNumber.from(2).pow(256).sub(1).toHexString();
	console.log('amount : ', amount);

	const domain = { verifyingContract: multiSigAddress, chainId };
	const data = '0x7c02520000000000000000000000000013927a60c7bf4d3d00e3c1593e0ec713e35d210600000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000180000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f0000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000000000004b1f1e2435a9c96f7330faea190ef6a7c8d7000100000000000000000000000050e08a5daf5b1520140941ca9cc6b5cae10e6a4c000000000000000000000000000000000000000000000000000000000001382000000000000000000000000000000000000000000000000000000000000118b400000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002080000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000a4b757fed60000000000000000000000004b1f1e2435a9c96f7330faea190ef6a7c8d70001000000000000000000000000c2132d05d31c914a87c6611c10748aeb04b58e8f0000000000000000000000002791bca1f2de4661ed88a30c99a7a9449aa841740000000000000000002dc6c01111111254fb6c44bac0bed2854e76f90643097d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000cfee7c08'

	var participants = [];
	const safeSingleton = getSafeSingletonDeployment({ chain: chainId });
	const safeSingletonABI = safeSingleton.abi;

	const multisigContract = new Contract(safeSingletonABI, multiSigAddress);
	multisigContract.setProvider(web3.currentProvider);
	const threshold = await multisigContract.methods.getThreshold().call();
	console.log('threshold : ', threshold);

	const multiSigContractNonce = await multisigContract.methods.nonce().call();
	const safeTx = buildSafeTransaction({
		to: swapContract,
		data,
		nonce: multiSigContractNonce,
	});

	for (const item of others) {
		var approverData = await signTypedData(item.privateKey, domain, safeTx);
		participants.push({
			signer: item.address,
			data: approverData
		});
	}
	var approved = safeApproveHash(sender);
	participants.push({
		signer: sender,
		data: approved.data,
	})
	var signatures = buildSignatureBytes(participants);

	const params = [
		swapContract,
		0, // value
		data,
		0, // operation
		0, // safeTxGas
		0, // dataGas
		0, // gasPrice
		ZERO_ADDRESS, // gasToken
		ZERO_ADDRESS, // refundReceiver
		signatures,
	];

	const safeSingletonContract = new Contract(safeSingletonABI);
	var input = safeSingletonContract.methods.execTransaction(...params).encodeABI();

	const senderNonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };

	const gasLimit = await web3.eth.estimateGas({
		from: sender,
		nonce: senderNonce,
		to: multiSigAddress,
		data: input,
	});

	const block = await provider.getBlock('latest');
	const maxPriorityFeePerGas = ethers.BigNumber.from("30000000000");
	const maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);

	const tx = Transaction.fromTxData(
		{
			maxFeePerGas: maxFeePerGas.toHexString(),
			maxPriorityFeePerGas: maxPriorityFeePerGas.toHexString(),
			to: multiSigAddress,
			data: input,
			value: '0x00',
			nonce: toHex(toBN(senderNonce)),
			gasLimit: toHex(toBN(gasLimit)),
			type: 0x2,
		},
		opts
	);
	const signedTx = tx.sign(toBuffer(privateKey));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();
	// return;
	console.log('txid 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);

	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

async function main() {
	const node = 'https://polygon-rpc.com';
	const chainId = 137;
	const common = Common.custom(CustomChain.PolygonMainnet, { eips: [1559], hardfork: Hardfork.London });
	const web3 = new Web3(node);
	const provider = new ethers.getDefaultProvider(node, {
		chainId,
	});
	const sender = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
	const receiptor = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
	const tokenAddress = '0x2791bca1f2de4661ed88a30c99a7a9449aa84174';
	const multiSigAddress = '0x50E08A5DAf5B1520140941CA9cC6b5cae10E6A4C';
	const swapContract = '0x1111111254fb6c44bac0bed2854e76f90643097d';

	const members = [
		{
			address: '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3',
			privateKey: ''
		},
		{
			address: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
			privateKey: ''
		}
	];
	switch (process.argv[2]) {
		case 'eth_2_2':
			await exec_eth_2_2({
				web3,
				common,
				chainId,
				members,
				sender,
				receiptor,
				multiSigAddress,
			});
			break;
		case 'erc20_2_2':
			await exec_erc20_2_2({
				web3,
				common,
				chainId,
				members,
				sender,
				receiptor,
				multiSigAddress,
				tokenAddress
			});
			break;
		case 'exec_erc20_2_2_approve':
			await exec_erc20_2_2_approve({
				web3,
				common,
				chainId,
				provider,
				members,
				sender,
				receiptor,
				multiSigAddress,
				tokenAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
				swapContract,
			});
			break;
		case 'exec_erc20_2_2_swap':
			await exec_erc20_2_2_swap({
				web3,
				common,
				chainId,
				provider,
				members,
				sender,
				receiptor,
				multiSigAddress,
				tokenAddress,
				swapContract,
			});
			break;
	}
}
main().catch(console.error);



