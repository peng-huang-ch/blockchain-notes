// https://github.com/gnosis/safe-react/blob/5020c0daa31ecc0f26520f206deda5393502ad30/src/logic/safe/store/actions/createTransaction.ts#L53
const Web3 = require('web3');
const { ethers, BigNumber } = require('ethers');
const Web3Method = require('web3-core-method');
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { addHexPrefix, bufferToHex, toBuffer } = require('ethereumjs-util');
const { stripHexPrefix } = require('ethjs-util');

const { buildSignatureBytes, buildSafeTransaction, signTypedData, sendTx, safeApproveHash } = require('../gnosis');

// 2-2. eth transfer
async function exec_eth_2_2({
	web3,
	common,
	members,
	safeAddress,
	receiptor,
	sender, senderPrivetKey,
}) {
	const chainId = common.chainIdBN().toNumber();
	const amount = ethers.utils.parseEther('0.01');
	const others = members.filter((item) => item.address !== sender);

	const chain = Chain.Rinkeby;
	const safeSingleton = getSafeSingletonDeployment({ chain });
	const safeSingletonABI = safeSingleton.abi;
	var participants = [];

	const multisigContract = new Contract(safeSingletonABI, safeAddress);
	multisigContract.setProvider(web3.currentProvider);
	var multiSigContractNonce = await multisigContract.methods.nonce().call();

	const safeTx = buildSafeTransaction({
		to: receiptor,
		value: amount,
		nonce: multiSigContractNonce,

		safeTxGas: '45677',
		baseGas: 21000 + +'54948',
		dataGas: 21000 + +'54948',
		gasPrice: '1000000027',
		gasToken: '0x0000000000000000000000000000000000000000',
		refundReceiver: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
	});

	const domain = { verifyingContract: safeAddress, chainId };
	for (const item of others) {
		var approverData = await signTypedData(item.privateKey, domain, safeTx);
		participants.push({
			signer: item.address,
			data: approverData,
		});
	}

	var approved = safeApproveHash(sender);
	participants.push({
		signer: sender,
		data: approved.data,
	});
	var signatures = buildSignatureBytes(participants);

	console.log('signatures : ', signatures);
	console.log('receiptor : ', receiptor);

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

	const safeSingletonContract = new Contract(safeSingletonABI);
	var input = safeSingletonContract.methods.execTransaction(...params).encodeABI();

	const nonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };

	const gasLimit = await web3.eth.estimateGas({
		from: sender,
		nonce,
		data: input,
		to: safeAddress,
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
			to: safeAddress,
			data: input,
			value: '0x00',
			nonce: toHex(toBN(nonce)),
			gasLimit: toHex(toBN(gasLimit)),
		},
		opts,
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

// 1-2. erc20 transfer
async function exec_erc20_2_2({
	web3,
	common,
	members,
	safeAddress,
	receiptor,
	tokenAddress,
	sender,
	senderPrivetKey
}) {
	const chainId = common.chainIdBN().toNumber();
	const opts = { common };
	const quantity = '10000000000000000';
	const domain = { verifyingContract: safeAddress, chainId };

	const raw = '0000000000000000000000000000000000000000000000000000000000000000';
	const amount = stripHexPrefix(toHex(toBN(quantity)));
	const data =
		'0xa9059cbb000000000000000000000000' + // token transfer method
		stripHexPrefix(receiptor) + // to address
		raw.substring(0, raw.length - amount.length) + // placeholder
		amount; // amount

	var participants = [];
	const safeSingleton = getSafeSingletonDeployment({ chain: chainId });
	const safeSingletonABI = safeSingleton.abi;

	const multisigContract = new Contract(safeSingletonABI, safeAddress);
	multisigContract.setProvider(web3.currentProvider);
	const threshold = await multisigContract.methods.getThreshold().call();
	console.log('threshold : ', threshold);
	console.log('safeAddress : ', safeAddress);

	const gasPrice = await web3.eth.getGasPrice();
	const multiSigContractNonce = await multisigContract.methods.nonce().call();
	const safeTx = buildSafeTransaction({
		to: tokenAddress,
		data,
		nonce: multiSigContractNonce,

		"safeTxGas": "52069",
		"baseGas": 74688,
		"dataGas": 74688,
		"gasPrice": "1000000030",
		"gasToken": "0x0000000000000000000000000000000000000000",
		"refundReceiver": sender,
	});
	// 1000000030

	console.log('safeTx : ', safeTx);

	for (const item of members) {
		var approverData = await signTypedData(item.privateKey, domain, safeTx);
		participants.push({
			signer: item.address,
			data: approverData,
		});
	}

	var approved = safeApproveHash(sender);
	participants.push(approved);
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

	const safeSingletonContract = new Contract(safeSingletonABI);
	var input = safeSingletonContract.methods.execTransaction(...params).encodeABI();

	const senderNonce = await web3.eth.getTransactionCount(sender);

	const gasLimit = await web3.eth.estimateGas({
		from: sender,
		nonce: senderNonce,
		to: safeAddress,
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
	const txData = {
		maxFeePerGas,
		maxPriorityFeePerGas,
		to: safeAddress,
		data: input,
		value: '0x00',
		nonce: toHex(toBN(senderNonce)),
		gasLimit: toHex(toBN(gasLimit)),
	}
	console.log('txData : ', txData);
	const tx = Transaction.fromTxData(
		txData,
		opts,
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

async function main() {
	const provider = 'https://goerli.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
	const chainId = Chain.Goerli;
	const common = new Common({ chain: chainId, hardfork: Hardfork.London });

	const web3 = new Web3(provider);
	const sender = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
	const senderPrivetKey = '';

	const receiptor = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
	const tokenAddress = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB';
	const safeAddress = '0xe60CB774c8a5c443Cd5A833E2d0D902d4eC3F9E4';

	const members = [
		{
			address: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
			privateKey: '',
		},
		{
			address: '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3',
			privateKey: '',
		},
	];

	switch (process.argv[2]) {
		case 'eth_2_2':
			await exec_eth_2_2({
				web3,
				common,
				members,
				receiptor,
				safeAddress,
				sender,
				senderPrivetKey,
			});
			break;
		case 'erc20_2_2':
			await exec_erc20_2_2({
				web3,
				common,
				members,
				sender,
				senderPrivetKey,
				receiptor,
				safeAddress,
				tokenAddress,
			});
			break;
	}
}
main().catch(console.error);



export * as A from 'a'