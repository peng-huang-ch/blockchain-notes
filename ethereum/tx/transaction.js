const assert = require('assert');
const { ethers, utils } = require('ethers')
const { TransactionFactory } = require('@ethereumjs/tx');
const { default: Common, Hardfork } = require('@ethereumjs/common');

const privateKey = '';

async function ethereumjs(chainId, txData) {
	const common = Common.custom(chainId, { hardfork: Hardfork.London, chain: chainId })
	const typedTransaction = TransactionFactory.fromTxData(txData, { common });
	const messageTosign = typedTransaction.getMessageToSign(true);
	const message = utils.hexlify(messageTosign);
	const request = {
		...typedTransaction.toJSON(),
		chainId,
		type: typedTransaction.type,
	}
	const serializedTransaction = ethers.utils.serializeTransaction(request);
	const msg = ethers.utils.keccak256(serializedTransaction);

	assert.strictEqual(msg, message, 'message mismatch');
	const signedTransaction = typedTransaction.sign(Buffer.from(privateKey, 'hex'));
	return utils.hexlify(signedTransaction.hash());
}

async function ethersjs(chainId, txData) {
	const unsignedTransaction = {
		...txData,
		chainId,
	}
	const message = ethers.utils.keccak256(ethers.utils.serializeTransaction(unsignedTransaction));

	const wallet = new ethers.Wallet(privateKey);
	const signature = wallet._signingKey().signDigest(ethers.utils.arrayify(message));

	const signedTransacion = utils.serializeTransaction(unsignedTransaction, signature);
	const hash = ethers.utils.keccak256(signedTransacion)
	return hash;
}

// https://goerli.etherscan.io/tx/0x6d9a2610589239b175d50a70c640fb659e7d3c75390fff98fc52dd543c63c097
async function main() {
	// const endpoint = 'https://goerli.infura.io/v3/you_key';
	// const provider = ethers.providers.JsonRpcProvider(endpoint);

	const chainId = 5;
	const hash = '0x6d9a2610589239b175d50a70c640fb659e7d3c75390fff98fc52dd543c63c097';
	const txData = {
		chainId,
		gasLimit: "0x5208",
		"accessList": [],
		"data": "0x",
		"maxFeePerGas": "0x59682f1e",
		"maxPriorityFeePerGas": "0x59682f00",
		"nonce": "0x76",
		"to": "0x2501a57b3625f9762698097c72e3ec06f8de1ee7",
		"type": 2,
		"value": "0x38d7ea4c68000"
	};
	const ethereumjsHash = await ethereumjs(chainId, txData);
	const ethersjsHash = await ethersjs(chainId, txData);
	assert.strictEqual(ethereumjsHash, hash, 'ethereumjs hash mismatch');
	assert.strictEqual(ethersjsHash, hash, 'ethersjs hash mismatch');
}

main().catch(console.error)