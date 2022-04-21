// https://github.com/gnosis/safe-react/blob/5020c0daa31ecc0f26520f206deda5393502ad30/src/logic/safe/store/actions/createTransaction.ts#L53
const Web3 = require('web3');
const Web3Method = require('web3-core-method');
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getCompatibilityFallbackHandlerDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { bufferToHex, toBuffer } = require('ethereumjs-util');
const { stripHexPrefix } = require('ethjs-util');

const { ZERO_ADDRESS, buildSignatureBytes, signTypedData, sendTx, safeApproveHash } = require('../gnosis');

// 1-2. eth transfer
async function exec_eth_1_2({
	web3,
	sender,
	privateKey,
	multiSigAddress,
	receiptor,
}) {
	const chain = Chain.Rinkeby;
	const safeSingleton = getSafeSingletonDeployment({ chain });
	const safeSingletonABI = safeSingleton.abi;

	var signature = "0x000000000000000000000000" + stripHexPrefix(sender) + "0000000000000000000000000000000000000000000000000000000000000000" + "01";

	const amount = '10000000000000000';
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
		signature,
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
	const signedTx = tx.sign(toBuffer(privateKey));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();
	console.log('txid 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);

	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

// 1-2. erc20 transfer
async function exec_erc20_1_2({
	web3,
	sender,
	privateKey,
	multiSigAddress,
	receiptor,
	tokenAddress,
}) {
	const chain = Chain.Rinkeby;
	const safeSingleton = getSafeSingletonDeployment({ chain });
	const safeSingletonAddress = safeSingleton.networkAddresses[chain];
	const safeSingletonABI = safeSingleton.abi;

	var participants = [];
	const approved = safeApproveHash(sender);
	participants.push(approved);
	var signatures = buildSignatureBytes(participants);

	const quantity = '10000000000000000';

	const raw = '0000000000000000000000000000000000000000000000000000000000000000';
	const amount = stripHexPrefix(toHex(toBN(quantity)));

	const data =
		'0xa9059cbb000000000000000000000000' + // token transfer method
		stripHexPrefix(receiptor) + // to address
		raw.substring(0, raw.length - amount.length) + // placeholder
		amount; // amount

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
	const nonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };

	const gasLimit = await web3.eth.estimateGas({
		from: sender,
		nonce,
		to: multiSigAddress,
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
	const signedTx = tx.sign(toBuffer(privateKey));
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
	const multiSigAddress = '0xd7609c88EE60Ec0b2f72234380311dD5f34273FA';

	switch (process.argv[2]) {
		case 'eth_2_2':
			await exec_eth_1_2({
				web3,
				sender,
				receiptor,
				privateKey,
				multiSigAddress,
			});
			break;
		case 'erc20_2_2':
			await exec_erc20_1_2({
				web3,
				sender,
				receiptor,
				privateKey,
				multiSigAddress,
				tokenAddress,
			});
			break;
	}
}
main().catch(console.error);
