const aptos = require('aptos');
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

	// // faucet
	// {
	// 	const faucetClient = new aptos.FaucetClient(NODE_URL, FAUCET_URL, null);
	// 	await faucetClient.fundAccount('0x76ee354c4354ae46f741bdf5cdf8987d6e3dc8dfbe62b10a0b7f2de27898bdaf', 100_000_000);
	// }
}

main().catch(console.error);
