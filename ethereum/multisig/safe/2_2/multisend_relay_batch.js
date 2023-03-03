const assert = require('assert');
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getMultiSendCallOnlyDeployment } = require('@gnosis.pm/safe-deployments');
const { toBN, toHex } = require('web3-utils');
const { utils, ethers } = require('ethers');
const { bufferToHex, toBuffer, addHexPrefix } = require('ethereumjs-util');
const { buildSignatureBytes, buildSafeTransaction, signTypedData, keySignHash, encodeMultiSend } = require('../gnosis');

function getRandomAddress() {
	return ethers.Wallet.createRandom().address;
}

async function sign({
	chainId,
	members,
	safeContract,
	safeTx
}) {
	const safeAddress = safeContract.address;
	const domain = { verifyingContract: safeAddress, chainId };
	var participants = [];

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
	return safeContract.interface.encodeFunctionData('execTransaction', params);
}

async function main() {
	const endpoint = 'https://goerli.infura.io/v3/412156d0fcd6484eb8c919543c04b50e';
	const provider = new ethers.providers.JsonRpcProvider(endpoint);
	const gasPrice = await provider.getGasPrice();
	console.log('gasPrice : ', gasPrice.toString());

	const chainId = Chain.Goerli;
	const common = new Common({ chain: chainId, hardfork: Hardfork.London });
	const sender = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
	const senderPrivetKey = ''

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
	const safeContract = new ethers.Contract(safeAddress, safeSingletonABI, provider);

	var safeContractNonce = await safeContract.nonce();
	var safeContractNonce = safeContractNonce.toNumber();
	console.log('safeContractNonce		 : ', safeContractNonce);

	const count = 2;
	const safeTxs = Array(count).fill(0).map((_, i) => {
		var nonce = +safeContractNonce + i;
		const iface = new utils.Interface(['function transfer(address to, uint256 value)']);
		const address = getRandomAddress();
		const value = 1000000;
		const data = iface.encodeFunctionData('transfer', [address, value]);
		console.log('to : ', tokenAddress);
		console.log('data : ', data);
		return [
			// buildSafeTransaction({ to: address, operation: 0, nonce, value }), // ETH
			buildSafeTransaction({ to: tokenAddress, operation: 0, nonce, data }), // ERC20
		]
	}).flat();

	// const inputs = await Promise.all(safeTxs.map((safeTx) => sign({ chainId, members, safeContract, safeTx })));

	const transactions = encodeMultiSend(safeTxs);
	const iface = new utils.Interface(multiSendABI);
	const data = iface.encodeFunctionData('multiSend', [transactions]);

	const senderNonce = await provider.getTransactionCount(sender);
	console.log('gasPrice : ', gasPrice.toNumber());

	const safeTx = buildSafeTransaction({
		operation: 1,
		to: multiSendHandlerAddress,
		nonce: safeContractNonce,
		data,

		// call the safe relay service to estimate the gas safeTxGas,baseGas,gasToken,gasPrice
		safeTxGas: 98429,
		baseGas: 57684 + 21000,
		gasToken: "0x0000000000000000000000000000000000000000",
		gasPrice: 1000244747, // 1.000244747 Gwei. if eip1559 tx should compare with the maxFeePerGas.
	});
	console.log('safeTx : ', safeTx);

	const safeData = await sign({ chainId, members, safeContract, safeTx });
	const txData = {
		from: sender,
		nonce: senderNonce,
		to: safeContract.address,
		data: safeData,
	};
	const gasLimit = await provider.estimateGas(txData);
	console.log('gasLimit : ', gasLimit.toNumber());

	const { maxPriorityFeePerGas } = await provider.getFeeData();

	const block = await provider.getBlock('latest');
	const baseFeePerGas = block['baseFeePerGas'];
	const maxFeePerGas = toBN(baseFeePerGas).add(toBN(maxPriorityFeePerGas)).toNumber();
	console.log('maxFeePerGas : ', maxFeePerGas);

	const transaction = {
		maxFeePerGas: toHex(toBN(maxFeePerGas)),
		maxPriorityFeePerGas: toHex(toBN(maxPriorityFeePerGas)),
		gasLimit: toHex(toBN(gasLimit)),
		type: 2,
		...txData,
	};

	// const serializeTransaction = ethers.utils.serializeTransaction(transaction);
	// const wallet = new ethers.Wallet(senderPrivetKey);
	// const signature = await wallet.signTransaction(serializeTransaction);
	// console.log('signature : ', signature);
	// return;

	// console.log('hash message : ', ethers.utils.keccak256(serializeTransaction));
	const tx = Transaction.fromTxData(
		{
			maxFeePerGas: toHex(toBN(maxFeePerGas)),
			maxPriorityFeePerGas: toHex(toBN(maxPriorityFeePerGas)),
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
	const { hash } = await provider.sendTransaction(bufferToHex(serialized));
	console.log('hash', hash);
}

main().catch(console.error);