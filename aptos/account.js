const aptos = require('aptos');
const assert = require('assert').strict;
const nacl = require('tweetnacl');

async function main() {
	const signingMessage = new aptos.HexString('0x4cd1').toUint8Array();
	const privateKeyHex = '0x4cd1fff838717a1a175df49a502107f0377476a79d256ecd696121f72226a61c';
	const aptosCoin = '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>';
	const privateKeyHexStr = new aptos.HexString(privateKeyHex);
	const NODE_URL = 'https://fullnode.devnet.aptoslabs.com';
	const FAUCET_URL = 'https://faucet.devnet.aptoslabs.com';

	const account = new aptos.AptosAccount(privateKeyHexStr.toUint8Array());
	const address = account.address();
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

	// public key -> address
	{
		const pubKeyHexStr = aptos.HexString.ensure('0xf5678bc8513c5247ad8a9ee547bc39be283a97de6511facea0e66ef6b91c5a47');

		const pubKey = new aptos.TxnBuilderTypes.Ed25519PublicKey(pubKeyHexStr.toUint8Array())
		const multiSigPublicKey = new aptos.TxnBuilderTypes.MultiEd25519PublicKey([pubKey], 0);
		const authKey = aptos.TxnBuilderTypes.AuthenticationKey.fromMultiEd25519PublicKey(multiSigPublicKey);
		const address = authKey.derivedAddress().hex();
		// assert.strictEqual(address, '0xf7201ffdfac8f6d3b2ea5c98b4932b3c4b7d3c3565e734288a374c9f0616333b')
	}

	// faucet
	{
		const faucetClient = new aptos.FaucetClient(NODE_URL, FAUCET_URL, null);
		await faucetClient.fundAccount('0xf7201ffdfac8f6d3b2ea5c98b4932b3c4b7d3c3565e734288a374c9f0616333b', 100_000_000);
	}
}

main().catch(console.error);
