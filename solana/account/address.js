const { u8aToHex } = require('@polkadot/util');
const web3 = require('@solana/web3.js');

function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
const wallet = web3.Keypair.generate();
const { publicKey, secretKey } = wallet;
console.log(publicKey.toString()); //address
console.log(publicKey.toBuffer().toString('hex'));
console.log(buf2hex(secretKey));
console.log(u8aToHex(secretKey));
