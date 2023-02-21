const assert = require('node:assert');
const { signTypedData, SignTypedDataVersion, TypedDataUtils } = require('@metamask/eth-sig-util');
const { ethers, utils } = require('ethers');
const { _TypedDataEncoder } = require('@ethersproject/hash');
const { pick } = require('lodash');
const privateKey = '';
const wallet = new ethers.Wallet(privateKey);

const typedData = {
	domain: {
		chainId: 5,
		name: 'Ether Mail',
		verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
		version: '1',
	},
	message: {
		contents: 'Hello, Bob!',
		from: {
			name: 'Cow',
			wallets: ['0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826', '0xDeaDbeefdEAdbeefdEadbEEFdeadbeEFdEaDbeeF'],
		},
		to: [
			{
				name: 'Bob',
				wallets: [
					'0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB',
					'0xB0BdaBea57B0BDABeA57b0bdABEA57b0BDabEa57',
					'0xB0B0b0b0b0b0B000000000000000000000000000',
				],
			},
		],
	},
	primaryType: 'Mail',
	types: {
		EIP712Domain: [
			{
				name: 'name',
				type: 'string',
			},
			{
				name: 'version',
				type: 'string',
			},
			{
				name: 'chainId',
				type: 'uint256',
			},
			{
				name: 'verifyingContract',
				type: 'address',
			},
		],
		Group: [
			{
				name: 'name',
				type: 'string',
			},
			{
				name: 'members',
				type: 'Person[]',
			},
		],
		Mail: [
			{
				name: 'from',
				type: 'Person',
			},
			{
				name: 'to',
				type: 'Person[]',
			},
			{
				name: 'contents',
				type: 'string',
			},
		],
		Person: [
			{
				name: 'name',
				type: 'string',
			},
			{
				name: 'wallets',
				type: 'address[]',
			},
		],
	},
};

async function eth_sign() {
	const digest = '0x1bffdb1502d28dd09de7d3df14168d47881608e3b0ee5b6f2134acbe40224ae8';
	const signature = utils.joinSignature(wallet._signingKey().signDigest(digest));
	assert.strictEqual(
		signature,
		'0xba4eb75c688196292bdffed8a38126e44674710714f68cc828fff507291a16b750fbb5a0394687160f49e6877707f63a3586791e1d323ffae8ff4f074100bbb91b',
		'signature is not correct',
	);
	const address = utils.recoverAddress(digest, signature);
	assert.strictEqual(address, '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3', 'address is not correct');
}

async function personal_sign() {
	const text = 'My email is john@doe.com - Mon, 20 Feb 2023 08:51:22 GMT';
	const hashed = utils.hashMessage(text);

	const messageHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(message));

	const signature = await wallet.signMessage(text);
	assert.strictEqual(utils.joinSignature(wallet._signingKey().signDigest(hashed)), signature, 'signature is not correct');

	assert.strictEqual(utils.recoverAddress(hashed, signature), await wallet.getAddress(), 'recover address is not correct');
}

async function signTypedDataV4() {
	const types = pick(typedData.types, ['Mail', 'Person']); // remove unused types
	const hashed = _TypedDataEncoder.hash(typedData.domain, types, typedData.message);
	const signature = utils.joinSignature(wallet._signingKey().signDigest(hashed));
	assert.strictEqual(signature, await wallet._signTypedData(typedData.domain, types, typedData.message), 'signature is not correct');
}

async function metamask() {
	const signedResult = signTypedData({
		privateKey: utils.arrayify(wallet.privateKey),
		data: typedData,
		version: SignTypedDataVersion.V4,
	});
	const eip712HashResult = TypedDataUtils.eip712Hash(typedData, SignTypedDataVersion.V4);

	const types = pick(typedData.types, ['Mail', 'Person']); // remove unused types
	const hashed = _TypedDataEncoder.hash(typedData.domain, types, typedData.message);

	assert.strictEqual(hashed, utils.hexlify(eip712HashResult), 'eip712Hash is not correct');

	assert.strictEqual(utils.joinSignature(wallet._signingKey().signDigest(hashed)), signedResult, 'signature is not correct');

	assert.strictEqual(await wallet._signTypedData(typedData.domain, types, typedData.message), signedResult, 'signature is not correct');
}

async function main() {
	await eth_sign();
	await personal_sign();
	await signTypedDataV4();
	await metamask();
}

main().catch(console.error);
