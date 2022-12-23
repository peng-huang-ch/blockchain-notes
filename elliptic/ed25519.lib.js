const ed = require('@noble/ed25519');
const nacl = require('tweetnacl');
const assert = require('assert').strict;

async function main() {
	const hashToSign = ed.utils.randomBytes(32);
	const privateKey = ed.utils.randomBytes(32);;
	const keyPair = nacl.sign.keyPair.fromSeed(privateKey);
	const secretKey = keyPair.secretKey;

	// public key
	const edPubKey = await ed.getPublicKey(privateKey);
	const naclPubKey = keyPair.publicKey;
	assert.strictEqual(ed.utils.bytesToHex(edPubKey), ed.utils.bytesToHex(naclPubKey), 'publicKey do not match');

	// signature
	const edSignature = await ed.sign(hashToSign, privateKey);
	const naclSignature = nacl.sign.detached(hashToSign, secretKey);
	assert.strictEqual(ed.utils.bytesToHex(edSignature), ed.utils.bytesToHex(naclSignature), 'signatures do not match');

	// verify
	const edIsValid = await ed.verify(edSignature, hashToSign, edPubKey);
	assert.strictEqual(edIsValid, true, 'noble ed25519 signature verify failed');
	const naclIsValid = nacl.sign.detached.verify(hashToSign, naclSignature, naclPubKey);
	assert.strictEqual(naclIsValid, true, 'tweetnacl ed25519 signature verify failed');

	console.log('All tests passed');
}

main().catch(console.error);
