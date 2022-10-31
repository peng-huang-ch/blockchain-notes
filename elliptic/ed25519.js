require('dotenv').config();
const crypto = require('crypto');
const { eddsa: EdDSA } = require('elliptic');
const { addHexPrefix, toBuffer } = require('ethereumjs-util');
const ed = require('@noble/ed25519');
const ec = new EdDSA('ed25519');

async function edVerify() {
	// keys, messages & other inputs can be Uint8Arrays or hex strings
	// Uint8Array.from([0xde, 0xad, 0xbe, 0xef]) === 'deadbeef'
	// const privateKey = ed.utils.randomPrivateKey();
	// const message = Uint8Array.from([0xab, 0xbc, 0xcd, 0xde]);
	// const publicKey = await ed.getPublicKey(privateKey);
	// const signaturse = await ed.sign(message, privateKey);
	var message = '68656c6c6f20776f726c64';
	var signature = 'eb2f1f23b70163f24d09a94c432133443e4e87eb0a3fc3999375258545e00892c384cc38d57d16ebc698474b413b5f10db7e7b17320de11972679f6f66ab6508';
	var publicKey = '7b53f5074cd12e1d39f7a2c93e05cacd2132058e4dc595d88ebb7e545b12ced5';
	const isValid = await ed.verify(signature, message, publicKey);
	console.log('Match:', isValid);

};

function generate() {
	const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
	const message = 'Hello world!';

	const signature = crypto.sign(null, Buffer.from(message), privateKey);
	const verified = crypto.verify(null, Buffer.from(message), publicKey, signature)

	console.log('signature 	: ');
	console.log('privateKey : ', privateKey.export({ format: 'der', type: 'pkcs8' }).toString('hex'))
	console.log('isMatch    : ', verified);
	console.log('generated complete. \n');
}

function verify() {
	var secret = process.env.ED25519_SECRET;
	var secret = toBuffer(addHexPrefix(secret));

	// Import public key
	var message = '68656c6c6f20776f726c64';
	var message = toBuffer(addHexPrefix(message));
	var signature = 'd457ebfb6ad19ffe14b658b76a5d9ed71ec03fc172e1c402403c4147579a9189135412d02e278494e5257286ceba6b3f82b3f8435117a65b37ba36c6c0eae60f';
	var pub = 'db8a3fa848d200541efe3ac0168b4773ac8604629af64e35119c45b1d0216723';
	var key = ec.keyFromPublic(pub, 'hex');

	// Verify signature
	var isMatch = key.verify(message, signature);
	console.log('isMatch  : ', isMatch);

	var key = ec.keyFromSecret(secret);
	var pub = key.getPublic('hex');

	console.log('pub key  : ', pub);
	const sig = key.sign(message);
	console.log('sigHex	  :', sig.toHex().toLowerCase());
	console.log('verify complete. \n');
}

function main() {
	generate();
	verify();
	edVerify();
}

main()