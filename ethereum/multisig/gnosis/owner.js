// https://github.com/gnosis/safe-react/blob/5020c0daa31ecc0f26520f206deda5393502ad30/src/logic/safe/store/actions/createTransaction.ts#L53
const assert = require('assert');
const Web3 = require('web3');
const Web3Method = require('web3-core-method');
const { ethers } = require("ethers");
const { _TypedDataEncoder } = require("@ethersproject/hash");
const { arrayify, splitSignature, hexZeroPad, joinSignature } = require("@ethersproject/bytes");
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getCompatibilityFallbackHandlerDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { bufferToHex, toBuffer, addHexPrefix } = require('ethereumjs-util');
const { stripHexPrefix } = require('ethjs-util');

const { ZERO_ADDRESS, buildSafeTransaction, buildSignatureBytes, signTypedData, sendTx, safeApproveHash } = require('./gnosis');

// 1_2 to 2_2
async function changeThreshold_1_2_to_2_2({
	web3,
	sender,
	privateKey,
	multiSigAddress,
	threshold,
}) {
	const chain = Chain.Rinkeby;
	const safeSingleton = getSafeSingletonDeployment({ chain });
	const safeSingletonAddress = safeSingleton.networkAddresses[chain];
	const safeSingletonABI = safeSingleton.abi;

	var participants = [];
	var approved = safeApproveHash(sender);

	participants.push({
		signer: sender,
		data: approved.data
	})
	const signatures = buildSignatureBytes(participants);

	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

	const safeSingletonContract = new Contract(safeSingletonABI);
	const data = safeSingletonContract.methods.changeThreshold(threshold).encodeABI();

	const params = [
		multiSigAddress,
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

	var input = safeSingletonContract.methods.execTransaction(...params).encodeABI();

	const common = new Common({ chain: Chain.Rinkeby, hardfork: Hardfork.London });
	const nonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };

	const gasLimit = await web3.eth.estimateGas({
		from: sender,
		to: multiSigAddress,
		nonce,
		data: input,
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
	const maxFeePerGas = toBN(baseFeePerGas).add(toBN(maxPriorityFeePerGas));

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
	const signedTx = tx.sign(toBuffer(addHexPrefix(privateKey)));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();
	console.log('txid 		: ', toHex(txHash));

	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

async function changeThreshold_2_2_to_2_1({
	chainId,
	web3,
	sender,
	approverKey,
	privateKey,
	multiSigAddress,
	threshold,
}) {
	const chain = Chain.Rinkeby;
	const safeSingleton = getSafeSingletonDeployment({ chain });
	const safeSingletonAddress = safeSingleton.networkAddresses[chain];
	const safeSingletonABI = safeSingleton.abi;

	const safeSingletonContract = new Contract(safeSingletonABI);
	const data = safeSingletonContract.methods.changeThreshold(threshold).encodeABI();

	var participants = [];

	const multisigContract = new Contract(safeSingletonABI, multiSigAddress);
	multisigContract.setProvider(web3.currentProvider);
	var multiSigContractNonce = await multisigContract.methods.nonce().call();

	const safeTx = buildSafeTransaction({
		to: multiSigAddress,
		data,
		nonce: multiSigContractNonce,
	});
	var domain = { verifyingContract: multiSigAddress, chainId };
	var approverData = await signTypedData(approverKey, domain, safeTx);

	participants.push({
		signer: approver,
		data: approverData
	});

	var approved = safeApproveHash(sender);
	participants.push({
		signer: sender,
		data: approved.data,
	})
	var signatures = buildSignatureBytes(participants);

	const params = [
		multiSigAddress,
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

	var input = safeSingletonContract.methods.execTransaction(...params).encodeABI();

	const common = new Common({ chain: Chain.Rinkeby, hardfork: Hardfork.London });
	const senderNonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };

	var gasLimit = await web3.eth.estimateGas({
		from: sender,
		to: multiSigAddress,
		nonce: senderNonce,
		data: input,
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
	const maxFeePerGas = toBN(baseFeePerGas).add(toBN(maxPriorityFeePerGas));

	const tx = Transaction.fromTxData(
		{
			maxFeePerGas,
			maxPriorityFeePerGas,
			to: multiSigAddress,
			data: input,
			value: '0x00',
			nonce: toHex(toBN(senderNonce)),
			gasLimit: toHex(toBN(gasLimit))
		},
		opts
	);
	const signedTx = tx.sign(toBuffer(addHexPrefix(privateKey)));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();
	console.log('txid 		: ', toHex(txHash));

	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
	return;
}


// 1_2 to 2_2
changeThreshold_1_2_to_2_2({
	web3,
	sender,
	privateKey,
	multiSigAddress,
	threshold: 2,
}).catch(console.error);
return;

// 2_2 to 1_2
changeThreshold_2_2_to_2_1({
	chainId,
	web3,
	approver,
	approverKey,
	sender,
	privateKey,
	multiSigAddress,
	threshold: 1,
}).catch(console.error);