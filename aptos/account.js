const aptos = require('aptos');
const nacl = require('tweetnacl');

async function main() {
	const signingMessage = new aptos.HexString('0x4cd1').toUint8Array();
	const privateKeyHex = '';
	const aptosCoin = '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>';
	const privateKeyHexStr = new aptos.HexString(privateKeyHex);
	const NODE_URL = 'https://fullnode.devnet.aptoslabs.com';
	const FAUCET_URL = 'https://faucet.devnet.aptoslabs.com';

	const account = new aptos.AptosAccount(privateKeyHexStr.toUint8Array());
	const address = account.address();
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
		console.log(`account2 coins	 : ${accountResource?.data?.coin?.value}. Should be 100_000_000!`);
	}

	// sign
	{
		const signedMsg = nacl.sign(signingMessage, account.signingKey.secretKey);
		console.log('signedMsg : ', aptos.HexString.fromUint8Array(signedMsg).hex());
	}

	// faucet
	{
		const faucetClient = new aptos.FaucetClient(NODE_URL, FAUCET_URL, null);
		// await faucetClient.fundAccount(address, 100_000_000);
	}
}

main().catch(console.error);
