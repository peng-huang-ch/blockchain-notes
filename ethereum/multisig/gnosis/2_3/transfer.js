// https://github.com/gnosis/safe-react/blob/5020c0daa31ecc0f26520f206deda5393502ad30/src/logic/safe/store/actions/createTransaction.ts#L53
const assert = require('assert');
const Web3 = require('web3');
const Web3Method = require('web3-core-method');
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getCompatibilityFallbackHandlerDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { bufferToHex, toBuffer, addHexPrefix } = require('ethereumjs-util');
const { stripHexPrefix } = require('ethjs-util');

const { ZERO_ADDRESS, buildSignatureBytes, buildSafeTransaction, signTypedData, sendTx, safeApproveHash, keySignHash } = require('../gnosis');

// eth transfer
async function exec_eth({
	web3,
	chainId,
	sender,
	members,
	multiSigAddress,
	receiptor,
	quantity
}) {
	const amount = quantity;

	const others = members.filter(item => item.address !== sender);
	const { privateKey } = members.find(item => item.address === sender);

	const chain = Chain.Rinkeby;
	const safeSingleton = getSafeSingletonDeployment({ chain });
	const safeSingletonABI = safeSingleton.abi;
	var participants = [];

	const multisigContract = new Contract(safeSingletonABI, multiSigAddress);
	multisigContract.setProvider(web3.currentProvider);
	var multiSigContractNonce = await multisigContract.methods.nonce().call('pending');

	console.log('multiSigContractNonce : ', multiSigContractNonce);
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

	const signedTx = tx.sign(toBuffer(addHexPrefix(privateKey)));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();

	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

// erc20 transfer
async function exec_erc20({
	web3,
	chainId,
	sender,
	members,
	multiSigAddress,
	receiptor,
	tokenAddress,
	quantity,
}) {
	const others = members.filter(item => item.address !== sender);
	const { privateKey } = members.find(item => item.address === sender);

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
	const signedTx = tx.sign(toBuffer(addHexPrefix(privateKey)));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();

	console.log('txid 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);

	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}


async function main() {
	const provider = 'https://rinkeby.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
	const chainId = 4;
	const web3 = new Web3(provider);
	const sender = '0x0d5a689d6a973e945cbbfab37202a1788e5588e7';
	const receiptor = '0x0d5a689d6a973e945cbbfab37202a1788e5588e7';
	const tokenAddress = '0x01be23585060835e02b77ef475b0cc51aa1e0709';
	const quantity = '10000000000000000';
	const multiSigAddress = '0xd7609c88EE60Ec0b2f72234380311dD5f34273FA';
	const threshold = 2;
	const members = [
		{
			address: '0x0d5a689d6a973e945cbbfab37202a1788e5588e7',
			privateKey: ''
		},
		{
			address: '0xE6bac7d1B67690019Dc33fC29F9f156AEa6894B2',
			privateKey: ''

		},
		{
			address: '0xFe7b59Eb9cFB13fb024efD08759Ce4f588CA7363',
			privateKey: ''
		}
	];

	switch (process.argv[2]) {
		case 'exec_erc20':
			await exec_erc20({
				web3,
				chainId,
				members,
				sender,
				receiptor,
				multiSigAddress,
				tokenAddress,
				quantity,
			});
		case 'exec_eth':
			await exec_eth({
				web3,
				chainId,
				members,
				sender,
				receiptor,
				multiSigAddress,
				quantity,
			});
			break;
	}
}

main().catch(console.error);

// node transfer.js exec_erc20
