const aptos = require('aptos');
const assert = require('assert').strict;
const nacl = require('tweetnacl');
const { sha3_256 } = require('@noble/hashes/sha3');

function pubKeyToAddress(publicKey) {
	const hash = sha3_256.create();
	hash.update(publicKey);
	hash.update("\0");
	return aptos.HexString.fromUint8Array(hash.digest());
}

async function main() {
	const signingMessage = new aptos.HexString('0x4cd1').toUint8Array();
	const privateKeyHex = '0x4cd1fff838717a1a175df49a502107f0377476a79d256ecd696121f72226a61c';
	const aptosCoin = '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>';
	const privateKeyHexStr = new aptos.HexString(privateKeyHex);
	const NODE_URL = 'https://fullnode.devnet.aptoslabs.com';
	const FAUCET_URL = 'https://faucet.devnet.aptoslabs.com';

	const account = new aptos.AptosAccount(privateKeyHexStr.toUint8Array());
	const address = account.address();
	// public key -> address
	{
		const pubKeyHexStr = aptos.HexString.ensure('0xacdf5b6a88282858e157589119ea965cdeedab5f062ee3fb252b65cb15f7cbe9');
		const address = pubKeyToAddress(pubKeyHexStr.toUint8Array());
		assert.strictEqual(address.hex(), '0xdd7862a1d347806c9470ba6e4d13b91b60ba5539a00065090ce8bbc24c4dd37a')
	}
	// fund account
	{
		const faucetClient = new aptos.FaucetClient(NODE_URL, FAUCET_URL, null);
		await faucetClient.fundAccount('0x689b4250f7d1c3784c5fb947fc9f15fd8e1842b4425976d8a44e4221150b1f79', 100_000_000);
	}

	// account
	{
		const privateKeyObject = account.toPrivateKeyObject();
		console.log('address			: ', address);
		console.log('privateKeyObject	: ', privateKeyObject);
	}

	// resources
	{
		const client = new aptos.AptosClient(NODE_URL);
		const resources = await client.getAccountResources(address);
		const accountResource = resources.find((r) => r.type === aptosCoin);
		console.log('resources 		 : ', resources);
		console.log('accountResource : ', accountResource);
		console.log(`account coins	 : ${accountResource?.data?.coin?.value}. Should be 100_000_000!`);
	}

	// sign
	{
		const signedMsg = nacl.sign(signingMessage, account.signingKey.secretKey);
		console.log('signedMsg : ', aptos.HexString.fromUint8Array(signedMsg).hex());
	}
	{
		const pubKeyHexStr = aptos.HexString.ensure('0xacdf5b6a88282858e157589119ea965cdeedab5f062ee3fb252b65cb15f7cbe9');
		const address = pubKeyToAddress(pubKeyHexStr.toUint8Array());
		console.log('address : ', address.hex());
	}
	// faucet
	{
		const faucetClient = new aptos.FaucetClient(NODE_URL, FAUCET_URL, null);
		await faucetClient.fundAccount('0xf7201ffdfac8f6d3b2ea5c98b4932b3c4b7d3c3565e734288a374c9f0616333b', 100_000_000);
	}
}

main().catch(console.error);
