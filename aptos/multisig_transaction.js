/* eslint-disable no-console */
// Copyright (c) Aptos
// SPDX-License-Identifier: Apache-2.0
// https://github.com/aptos-labs/aptos-core/blob/main/ecosystem/typescript/sdk/examples/typescript/multisig_transaction.ts

const { AptosClient, AptosAccount, FaucetClient, HexString, BCS, TransactionBuilder, TransactionBuilderABI, TransactionBuilderMultiEd25519, TxnBuilderTypes } = require("aptos");
const assert = require('assert').strict;
const nacl = require('tweetnacl');

const NODE_URL = "https://fullnode.devnet.aptoslabs.com";
const FAUCET_URL = "https://faucet.devnet.aptoslabs.com";
const aptosCoinStore = '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>';

async function sdk() {
	const client = new AptosClient(NODE_URL);
	const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

	// Generate 3 key pairs and account instances
	const account1 = new AptosAccount();
	const account2 = new AptosAccount();
	const account3 = new AptosAccount();

	// Create a 2 out of 3 MultiEd25519PublicKey. '2 out of 3' means for a multisig transaction
	// to be executed, at least 2 accounts must have signed the transaction.
	// See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519PublicKey.html#constructor
	const multiSigPublicKey = new TxnBuilderTypes.MultiEd25519PublicKey(
		[
			new TxnBuilderTypes.Ed25519PublicKey(account1.signingKey.publicKey),
			new TxnBuilderTypes.Ed25519PublicKey(account2.signingKey.publicKey),
			new TxnBuilderTypes.Ed25519PublicKey(account3.signingKey.publicKey),
		],
		// Threshold
		2,
	);

	// Each Aptos account stores an auth key. Initial account address can be derived from auth key.
	// See https://aptos.dev/basics/basics-accounts for more details.
	const authKey = TxnBuilderTypes.AuthenticationKey.fromMultiEd25519PublicKey(multiSigPublicKey);

	// Derive the multisig account address and fund the address with 5000 AptosCoin.
	const multisigAccountAddress = authKey.derivedAddress();
	await faucetClient.fundAccount(multisigAccountAddress, 100_000_000);

	let resources = await client.getAccountResources(multisigAccountAddress);
	let accountResource = resources.find((r) => r.type === aptosCoinStore);
	let balance = parseInt(accountResource?.data.coin.value);
	assert(balance === 100_000_000);
	console.log(`multisig account coins: ${balance}. Should be 100000000!`);

	const account4 = new AptosAccount();
	// Creates a receiver account and fund the account with 0 AptosCoin
	await faucetClient.fundAccount(account4.address(), 0);
	resources = await client.getAccountResources(account4.address());
	accountResource = resources.find((r) => r.type === aptosCoinStore);
	balance = parseInt(accountResource?.data.coin.value);
	assert(balance === 0);
	console.log(`account4 coins: ${balance}. Should be 0!`);

	const token = new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString("0x1::aptos_coin::AptosCoin"));

	// TS SDK support 3 types of transaction payloads: `EntryFunction`, `Script` and `Module`.
	// See https://aptos-labs.github.io/ts-sdk-doc/ for the details.
	const entryFunctionPayload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
		TxnBuilderTypes.EntryFunction.natural(
			// Fully qualified module name, `AccountAddress::ModuleName`
			"0x1::coin",
			// Module function
			"transfer",
			// The coin type to transfer
			[token],
			// Arguments for function `transfer`: receiver account address and amount to transfer
			[BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(account4.address())), BCS.bcsSerializeUint64(123)],
		),
	);

	const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
		client.getAccount(multisigAccountAddress),
		client.getChainId(),
	]);

	// See class definiton here
	// https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.RawTransaction.html#constructor.
	const rawTxn = new TxnBuilderTypes.RawTransaction(
		// Transaction sender account address
		TxnBuilderTypes.AccountAddress.fromHex(multisigAccountAddress),
		BigInt(sequenceNumber),
		entryFunctionPayload,
		// Max gas unit to spend
		BigInt(10000),
		// Gas price per unit
		BigInt(100),
		// Expiration timestamp. Transaction is discarded if it is not executed within 10 seconds from now.
		BigInt(Math.floor(Date.now() / 1000) + 10),
		new TxnBuilderTypes.ChainId(chainId),
	);

	// account1 and account3 sign the transaction
	const txnBuilder = new TransactionBuilderMultiEd25519((signingMessage) => {
		const sigHexStr1 = account1.signBuffer(signingMessage);
		const sigHexStr3 = account3.signBuffer(signingMessage);

		// Bitmap masks which public key has signed transaction.
		// See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#createBitmap
		const bitmap = TxnBuilderTypes.MultiEd25519Signature.createBitmap([0, 2]);

		// See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#constructor
		const multiEd25519Sig = new TxnBuilderTypes.MultiEd25519Signature(
			[
				new TxnBuilderTypes.Ed25519Signature(sigHexStr1.toUint8Array()),
				new TxnBuilderTypes.Ed25519Signature(sigHexStr3.toUint8Array()),
			],
			bitmap,
		);

		return multiEd25519Sig;
	}, multiSigPublicKey);

	const bcsTxn = txnBuilder.sign(rawTxn);
	const transactionRes = await client.submitSignedBCSTransaction(bcsTxn);

	await client.waitForTransaction(transactionRes.hash);

	resources = await client.getAccountResources(multisigAccountAddress);
	accountResource = resources.find((r) => r.type === aptosCoinStore);
	balance = parseInt(accountResource?.data.coin.value);
	console.log(`multisig account coins: ${balance}.`);

	resources = await client.getAccountResources(account4.address());
	accountResource = resources.find((r) => r.type === aptosCoinStore);
	balance = parseInt(accountResource?.data.coin.value);
	assert(balance === 123);
	console.log(`account4 coins: ${balance}. Should be 123!`);
}

async function main() {
	const expiration_timestamp_secs = 1672531204n;
	const client = new AptosClient(NODE_URL);
	const faucetClient = new FaucetClient(NODE_URL, FAUCET_URL);

	// Generate 3 key pairs and account instances
	const privateKeyHex1 = '0x16eaec9ab1c8f8cf64703ccc147e8b5d554ee8738fac372afb37256142bf0624';
	const privateKeyBytes1 = new HexString(privateKeyHex1).toUint8Array();
	const account1 = new AptosAccount(privateKeyBytes1);

	const privateKeyHex2 = '0x37072fb5c8c60c7a231e6d02ca8f87e20498d03d5df0a728fb4ecf5bdf620b42';
	const privateKeyBytes2 = new HexString(privateKeyHex2).toUint8Array();
	const account2 = new AptosAccount(privateKeyBytes2);

	const privateKeyHex3 = '0x80788bafb59eecd31aeb869f3934916dee373b458d12fb71de1e629e5633c16d';
	const privateKeyBytes3 = new HexString(privateKeyHex3).toUint8Array();
	const account3 = new AptosAccount(privateKeyBytes3);
	{
		console.log('account1	: ', account1.toPrivateKeyObject());
		console.log('account2	: ', account2.toPrivateKeyObject());
		console.log('account3	: ', account3.toPrivateKeyObject());
	}
	// Create a 2 out of 3 MultiEd25519PublicKey. '2 out of 3' means for a multisig transaction
	// to be executed, at least 2 accounts must have signed the transaction.
	// See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519PublicKey.html#constructor
	const multiSigPublicKey = new TxnBuilderTypes.MultiEd25519PublicKey(
		[
			new TxnBuilderTypes.Ed25519PublicKey(account1.signingKey.publicKey),
			new TxnBuilderTypes.Ed25519PublicKey(account2.signingKey.publicKey),
			new TxnBuilderTypes.Ed25519PublicKey(account3.signingKey.publicKey),
		],
		// Threshold
		2,
	);

	// Each Aptos account stores an auth key. Initial account address can be derived from auth key.
	// See https://aptos.dev/basics/basics-accounts for more details.
	const authKey = TxnBuilderTypes.AuthenticationKey.fromMultiEd25519PublicKey(multiSigPublicKey);

	// Derive the multisig account address and fund the address with 5000 AptosCoin.

	const multiSigAccountAddress = authKey.derivedAddress();
	console.log('multiSigAccountAddress : ', multiSigAccountAddress);
	// await faucetClient.fundAccount(multiSigAccountAddress, 100_000_000);
	console.log('Funded multisig account address', multiSigAccountAddress.hex());

	let resources = await client.getAccountResources(multiSigAccountAddress);
	let accountResource = resources.find((r) => r.type === aptosCoinStore);
	let balance = accountResource?.data.coin.value;
	console.log('Balance of multisig account address', balance);

	let receiverAccount;
	{
		var privateKeyHex = '0xea10a580a56a5cb656c99e99e96eb97a3d9893e63d625e4749f46b92f5380777';
		const account = new AptosAccount(new HexString(privateKeyHex).toUint8Array());
		receiverAccount = account;
		// Creates a receiver account and fund the account with 0 AptosCoin
		// resources = await client.getAccountResources(account.address());
		// accountResource = resources.find((r) => r.type === aptosCoinStore);
		// balance = accountResource?.data?.coin.value;
		// console.log('Balance of receiver account address', balance);
	}

	const typeTag = new TxnBuilderTypes.TypeTagStruct(TxnBuilderTypes.StructTag.fromString("0x1::aptos_coin::AptosCoin"));

	// TS SDK support 3 types of transaction payloads: `EntryFunction`, `Script` and `Module`.
	// See https://aptos-labs.github.io/ts-sdk-doc/ for the details.
	const entryFunctionPayload = new TxnBuilderTypes.TransactionPayloadEntryFunction(
		TxnBuilderTypes.EntryFunction.natural(
			// Fully qualified module name, `AccountAddress::ModuleName`
			"0x1::coin",
			// Module function
			"transfer",
			// The coin type to transfer
			[typeTag],
			// Arguments for function `transfer`: receiver account address and amount to transfer
			[BCS.bcsToBytes(TxnBuilderTypes.AccountAddress.fromHex(receiverAccount.address())), BCS.bcsSerializeUint64(717)],
		),
	);
	console.log('receiver address : ', receiverAccount.address());
	console.log("payload 		  : ", HexString.fromUint8Array(BCS.bcsToBytes(entryFunctionPayload)).hex());

	// const transactionBuilder = new TransactionBuilderABI(COIN_ABIS.map((abi) => new HexString(abi).toUint8Array()));
	// const entryFunctionPayload = transactionBuilder.buildTransactionPayload(
	// 	"0x1::coin::transfer",
	// 	['0x1::aptos_coin::AptosCoin'],
	// 	[receiverAccount.address().hex(), 123],
	// );

	const [{ sequence_number: sequenceNumber }, chainId] = await Promise.all([
		client.getAccount(multiSigAccountAddress),
		client.getChainId(),
	]);

	// See class definition here
	// https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.RawTransaction.html#constructor.
	const rawTxn = new TxnBuilderTypes.RawTransaction(
		// Transaction sender account address
		TxnBuilderTypes.AccountAddress.fromHex(multiSigAccountAddress),
		BigInt(sequenceNumber),
		entryFunctionPayload,
		// Max gas unit to spend
		BigInt(10000),
		// Gas price per unit
		BigInt(100),
		// Expiration timestamp. Transaction is discarded if it is not executed within 10 seconds from now.
		BigInt(expiration_timestamp_secs),
		new TxnBuilderTypes.ChainId(chainId),
	);

	// account1 and account3 sign the transaction
	const signingMsg = TransactionBuilder.getSigningMessage(rawTxn);

	console.log("rawTxn bytes	  : ", HexString.fromUint8Array(BCS.bcsToBytes(rawTxn)).hex());
	console.log("signingMsg 	  : ", HexString.fromUint8Array(signingMsg).hex());

	const signedMsg1 = nacl.sign(signingMsg, account1.signingKey.secretKey);
	const sigHexStr1 = HexString.fromUint8Array(signedMsg1.slice(0, 64));
	const signedMsg3 = nacl.sign(signingMsg, account3.signingKey.secretKey);
	const sigHexStr3 = HexString.fromUint8Array(signedMsg3.slice(0, 64));

	const bitmap = TxnBuilderTypes.MultiEd25519Signature.createBitmap([0, 2]);
	console.log("signedMsg1 : ", HexString.fromUint8Array(signedMsg1).hex())
	console.log("signedMsg3 : ", HexString.fromUint8Array(signedMsg3).hex())

	// See https://aptos-labs.github.io/ts-sdk-doc/classes/TxnBuilderTypes.MultiEd25519Signature.html#constructor
	const multiEd25519Sig = new TxnBuilderTypes.MultiEd25519Signature(
		[
			new TxnBuilderTypes.Ed25519Signature(sigHexStr1.toUint8Array()),
			new TxnBuilderTypes.Ed25519Signature(sigHexStr3.toUint8Array()),
		],
		bitmap,
	);
	const authenticator = new TxnBuilderTypes.TransactionAuthenticatorMultiEd25519(
		multiSigPublicKey,
		multiEd25519Sig,
	);

	const signedTxn = new TxnBuilderTypes.SignedTransaction(rawTxn, authenticator);
	const bcsTxn = BCS.bcsToBytes(signedTxn);


	const transactionRes = await client.submitSignedBCSTransaction(bcsTxn);

	console.log('Transaction submitted tx hash : ', transactionRes.hash);
	await client.waitForTransaction(transactionRes.hash);

	resources = await client.getAccountResources(multiSigAccountAddress);
	accountResource = resources.find((r) => r.type === aptosCoinStore);
	balance = parseInt(accountResource.data?.coin.value);
	console.log(`multisig account coins: ${balance}.`);

	resources = await client.getAccountResources(receiverAccount.address());
	accountResource = resources.find((r) => r.type === aptosCoinStore);
	balance = parseInt(accountResource?.data?.coin.value);
	console.log(`receiver account coins: ${balance}.`);
}

// sdk().catch(console.error);
main().catch(console.error);