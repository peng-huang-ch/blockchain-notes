// Copyright (c) Aptos
// SPDX-License-Identifier: Apache-2.0
// https://github.com/aptos-labs/aptos-core/blob/main/ecosystem/typescript/sdk/examples/typescript/your_coin.ts

const { AptosClient, AptosAccount, CoinClient, TxnBuilderTypes, FaucetClient, HexString } = require("aptos");

const alice = new AptosAccount(HexString.ensure('0x8c9d9e1794ea91cb48c31abcfc54166a818aa542b12de08bb991311c2af7743a').toUint8Array())
const bob = new AptosAccount()
const carol = new AptosAccount()

function getName(address) {
	const names = Object.fromEntries([[alice.address(), 'alice',], [bob.address(), 'bob'], [carol.address(), 'carol']]);
	return names[address] || 'unknown';
}

const NODE_URL = 'https://fullnode.devnet.aptoslabs.com';
const FAUCET_URL = 'https://faucet.devnet.aptoslabs.com';


class YourCoinClient extends AptosClient {
	constructor(NODE_URL) {
		super(NODE_URL);
	}

	/** Register the receiver account to receive transfers for the new coin. */
	async registerCoin(coinTypeAddress, coinReceiver) {
		const rawTxn = await this.generateTransaction(coinReceiver.address(), {
			function: "0x1::managed_coin::register",
			type_arguments: [`${coinTypeAddress.hex()}::moon_coin::MoonCoin`],
			arguments: [],
		});

		const bcsTxn = await this.signTransaction(coinReceiver, rawTxn);
		const pendingTxn = await this.submitTransaction(bcsTxn);

		return pendingTxn.hash;
	}

	/** Mints the newly created coin to a specified receiver address */
	async mintCoin(minter, receiverAddress, amount) {
		const rawTxn = await this.generateTransaction(minter.address(), {
			function: "0x1::managed_coin::mint",
			type_arguments: [`${minter.address()}::moon_coin::MoonCoin`],
			arguments: [receiverAddress.hex(), amount],
		});

		const bcsTxn = await this.signTransaction(minter, rawTxn);
		const pendingTxn = await this.submitTransaction(bcsTxn);

		return pendingTxn.hash;
	}

	// /** transfer the newly created coin to a specified receiver address */
	async transferCoin(coinTypeAddress, receiverAddress, amount, sender) {
		const rawTxn = await super.generateTransaction(sender.address(), {
			function: "0x1::coin::transfer",
			type_arguments: [`${coinTypeAddress}::moon_coin::MoonCoin`],
			arguments: [receiverAddress.hex(), amount],

		});

		const bcsTxn = await this.signTransaction(sender, rawTxn);
		const pendingTxn = await this.submitTransaction(bcsTxn);

		return pendingTxn.hash;
	}

	/** Return the balance of the newly created coin */
	async getBalance(accountAddress, coinTypeAddress) {
		try {
			const resource = await this.getAccountResource(
				accountAddress,
				`0x1::coin::CoinStore<${coinTypeAddress.hex()}::moon_coin::MoonCoin>`,
			);

			return parseInt((resource.data)["coin"]["value"]);
		} catch (e) {
			console.error(e)
			return 0;
		}
	}
}


const client = new YourCoinClient(NODE_URL);
const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

// https://explorer.aptoslabs.com/txn/0x746d169d0b21a6965d8d52faef5e28774fbdd0b106dc6aef119560b8f89ffc67
// https://aptos.dev/tutorials/your-first-coin#step-31-build-the-package
async function publishModule() {
	// const packageMetadata = fs.readFileSync(path.join(modulePath, "build", "Examples", "package-metadata.bcs"));
	// const moduleData = fs.readFileSync(path.join(modulePath, "build", "Examples", "bytecode_modules", "moon_coin.mv"));
	const packageMetadata = '0x084578616d706c657301000000000000000040443730304142343038324344334339424446413644373936313042423535444242384245373437373336463438463145323838414144323339383143423039418a011f8b08000000000002ff3d8c410a02310c45f73945e9de8e177021a23b4f300c12da28653a49694405f1ee368243b2f9ff3dfe5831ce78a3091817723be78f2f5c6a21f5f0a0a659d8ca6de8e701464ca9912ae90467113e48fef18bb144953811c76c785fefa2a7d6579fd2e62ebd5d9188c5f41086fed73f1cd0dccd9abdfbc017478da0ef9900000001096d6f6f6e5f636f696ebb011f8b08000000000002ff6550c10e82300cbdef2b26070389c96e1e2ae1e259f90432a19045e8cc366222e1dfdda662d09e5e5f5fdf6b2a046ca018b42636e866ec919f3c3e6a450081ad6a0ff9c4b82febcc58bb45c0a79945be1d892b52ae7a39a416a941037c6b554768b2f77a287973da56ad9103deb5b9fa0c49b2c326c6000417257bf5c0fc9352a4cb72bc217aef56dc2509621ed4c9dfa42ccf3fe47eddb6b2b7f8a5b24384339b9910b97f4efccd138065fd5b2701000000000300000000000000000000000000000000000000000000000000000000000000010e4170746f734672616d65776f726b00000000000000000000000000000000000000000000000000000000000000010b4170746f735374646c696200000000000000000000000000000000000000000000000000000000000000010a4d6f76655374646c696200';
	const moduleData = '0xa11ceb0b050000000a01000402040403080b04130205151007254308684006a801150abd01050cc2011200000101000200000003000100010503010100010201060c0001080005060c0a020a020201096d6f6f6e5f636f696e0c6d616e616765645f636f696e084d6f6f6e436f696e0b696e69745f6d6f64756c650b64756d6d795f6669656c640a696e697469616c697a65dd7862a1d347806c9470ba6e4d13b91b60ba5539a00065090ce8bbc24c4dd37a00000000000000000000000000000000000000000000000000000000000000010a020a094d6f6f6e20436f696e0a0205044d4f4f4e00020104010000000001070b000700070131060938000200';
	console.log("Publishing MoonCoin package.");
	let txnHash = await client.publishPackage(alice, HexString.ensure(packageMetadata).toUint8Array(), [
		new TxnBuilderTypes.Module(HexString.ensure(moduleData).toUint8Array()),
	]);
	await client.waitForTransaction(txnHash, { checkSuccess: true }); // <:!:publish
	console.log("Published MoonCoin package done. txHash : ", txnHash);
}

async function registerCoin(coinReceiver) {
	const receiverAddress = coinReceiver.address();
	const coinTypeAddress = alice.address();
	console.log(`${getName(receiverAddress)} registers the newly created coin so he can receive it from Alice`);
	txnHash = await client.registerCoin(alice.address(), coinReceiver);
	await client.waitForTransaction(txnHash, { checkSuccess: true });
	console.log(`${getName(receiverAddress)} registered the newly created coin. txHash : `, txnHash);
	console.log(`${getName(receiverAddress)}'s initial MoonCoin balance: ${await client.getBalance(receiverAddress, coinTypeAddress)}.`);
}

async function mintCoin(coinReceiver) {
	const receiverAddress = coinReceiver.address();
	const coinTypeAddress = alice.address();
	console.log(`Alice mints ${getName(receiverAddress)} some of the new coin.`);
	txnHash = await client.mintCoin(alice, receiverAddress, 10000000);
	await client.waitForTransaction(txnHash, { checkSuccess: true });
	console.log(`Alice mints ${getName(receiverAddress)} some of the new coin. txHash : `, txnHash);
	console.log(`${getName(receiverAddress)}'s updated MoonCoin balance: ${await client.getBalance(receiverAddress, coinTypeAddress)}.`);
}

async function transferCoin(coinSender, coinReceiver) {
	const coinTypeAddress = alice.address();
	const senderAddress = coinSender.address();
	const receiverAddress = coinReceiver.address();
	console.log(`${getName(senderAddress)} -> ${getName(receiverAddress)} some of the new coin.`);
	const txnHash = await client.transferCoin(coinTypeAddress, receiverAddress, 10000000, coinSender);
	await client.waitForTransaction(txnHash, { checkSuccess: true });
	console.log(`${getName(senderAddress)} -> ${getName(receiverAddress)} some of the new coin. txHash : ${txnHash}`);
	console.log(`${getName(receiverAddress)} updated MoonCoin balance: ${await client.getBalance(receiverAddress, coinTypeAddress)}.`);
}

async function main() {
	// // Create two accounts, Alice and Bob, and fund Alice but not Bob
	// const alice = new AptosAccount();
	// const bob = new AptosAccount();

	console.log("\n=== Addresses ===");
	console.log(`Alice: ${alice.address()}`);
	console.log(`Bob: ${bob.address()}`);

	// Create accounts.
	// :!:>section_2
	// const alice = new AptosAccount();
	// const bob = new AptosAccount(); // <:!:section_2

	await faucetClient.fundAccount(bob.address(), 100_000_000);
	await faucetClient.fundAccount(carol.address(), 100_000_000);
	// return;
	// Print out account addresses.
	console.log("=== Addresses ===");
	console.log(`Alice: ${alice.address()}`);
	console.log(`Bob: ${bob.address()}`);
	console.log("");

	// alice should publish the package firstly, for the following minting and transferring.
	// you should compile the packageMetadata and moduleData annaully.
	// see the detail. https://aptos.dev/tutorials/your-first-coin#step-31-build-the-package
	// await publishModule();
	// 1. alice mint bob some coins
	// 1.1 bob should register firstly
	await registerCoin(bob);
	// 1.2 alice mint coin for bob
	await mintCoin(bob); //

	// 2. bob -> carol 10_000_000
	// 1. carol should register firstly
	await registerCoin(carol);
	// 2. then bob transfer carol some of the new coin
	await transferCoin(bob, carol); // bob -> carol 10_000_000

}

if (require.main === module) {
	main().catch(console.error)
}
