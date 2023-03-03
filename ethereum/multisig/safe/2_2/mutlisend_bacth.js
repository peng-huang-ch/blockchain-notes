const assert = require('assert');
const Web3 = require('web3');
const ethers = require('ethers')
const Web3Method = require('web3-core-method');
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getMultiSendCallOnlyDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { bufferToHex, toBuffer, addHexPrefix } = require('ethereumjs-util');

const { buildSignatureBytes, buildSafeTransaction, signTypedData, sendTx, safeApproveHash, keySignHash, encodeMultiSend } = require('../gnosis');
const { utils } = require('ethers');

function getRandomAddress() {
	const wallet = ethers.Wallet.createRandom()
	console.log('address:', wallet.address)
	console.log('mnemonic:', wallet.mnemonic.phrase)
	console.log('privateKey:', wallet.privateKey)
	return wallet.address;
}
async function sign({
	web3,
	chainId,
	members,
	safeContract,
	safeTx
}) {
	const safeAddress = safeContract._address;
	const domain = { verifyingContract: safeAddress, chainId };
	var participants = [];
	safeContract.setProvider(web3.currentProvider);

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

	var input = safeContract.methods.execTransaction(...params).encodeABI();
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
	const safeContract = new Contract(safeSingletonABI, safeAddress);
	safeContract.setProvider(web3.currentProvider);
	// var safeContractNonce = 10;
	var safeContractNonce = await safeContract.methods.nonce().call();

	// const addresses = [
	// 	'0x0495EE61A6c19494Aa18326d08A961c446423cA2',
	// 	'0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3',
	// 	'0xFe7b59Eb9cFB13fb024efD08759Ce4f588CA7363',
	// 	'0xE6bac7d1B67690019Dc33fC29F9f156AEa6894B2',
	// 	'0x0d5A689D6a973E945cbBfab37202A1788E5588E7',
	// 	'0xbDb3bd7b3F3DAEADC58D00EF5f15ED9a476B8fe3',
	// 	'0x2B0EfCF16EC1E4C5eD82dBB4Fce9B4811485e650',
	// 	getRandomAddress(),
	// 	getRandomAddress(),
	// 	getRandomAddress(),
	// ];

	const count = 45;
	const addresses = Array(count).fill(0).map(() => getRandomAddress());

	const safeTxs = Array(count).fill(0).map((_, i) => {
		var nonce = +safeContractNonce + i * 2;
		const iface = new utils.Interface(['function transfer(address to, uint256 value)']);
		const address = addresses[i];
		const value = 1000000;
		const data = iface.encodeFunctionData('transfer', [address, value]);
		return [
			buildSafeTransaction({ to: address, operation: 0, nonce, value }), // ETH
			buildSafeTransaction({ to: tokenAddress, operation: 0, nonce: nonce + 1, data }), // ERC20
		]
	}).flat();
	console.log('safeTxs : ', safeTxs);

	const inputs = await Promise.all(safeTxs.map((tx) => sign({ web3, chainId, members, safeContract, safeTx: tx })));

	const txs = inputs.map((input) => {
		return {
			operation: 0,
			to: safeAddress,
			value: 0,
			data: input,
		}
	})

	var safeAddress1 = '0x5B6200F07C235A0Eb085282B3173ac6682bfcbBF';
	var safeContract1 = new Contract(safeSingletonABI, safeAddress1);
	safeContract1.setProvider(web3.currentProvider);
	var safeContractNonce1 = await safeContract1.methods.nonce().call();
	// console.log('safeContractNonce1 : ', safeContractNonce1);
	const safeTxs1 = Array(count).fill().map((_, i) => {
		var nonce = +safeContractNonce1 + i * 2;
		const iface = new utils.Interface(['function transfer(address to, uint256 value)']);
		const address = addresses[i];
		const value = 1000000;
		const data = iface.encodeFunctionData('transfer', [address, value]);
		return [
			buildSafeTransaction({ to: address, operation: 0, nonce, value }),
			buildSafeTransaction({ to: tokenAddress, operation: 0, nonce: nonce + 1, data }),
		]
	}).flat();
	const inputs2 = await Promise.all(safeTxs1.map((tx) => sign({ web3, chainId, members, safeContract: safeContract1, safeTx: tx })));
	const txs2 = inputs2.map((input) => {
		return {
			operation: 0,
			to: safeAddress1,
			value: 0,
			data: input,
		}
	})

	const transactions = encodeMultiSend([...txs, ...txs2]);
	const iface = new utils.Interface(multiSendABI);
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

	console.log('txid 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);
	// return;
	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

main().catch(console.error);