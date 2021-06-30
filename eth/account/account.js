const { privateToAddress, privateToPublic, isValidPrivate, publicToAddress, toChecksumAddress } = require('ethereumjs-util');
const { ec: EC } = require('elliptic');
// const privateKey = Buffer.from('2ef4813a7b4181f6b0eb57fa4b980740cbd4d827da81c39324870ee3368da087', 'hex');
const privateKey = Buffer.from('8fa11b1b92afdcffce558224b49ea59261afd0aa1b5f4a13f3e54e1a8c2508f9', 'hex');
console.log(isValidPrivate(privateKey));
const publicKey = privateToPublic(privateKey);
const address = privateToAddress(privateKey);
console.log('public key: ', publicKey.toString('hex'));
console.log('address   : ', address.toString('hex'));
console.log('address   : ', publicToAddress(publicKey).toString('hex'));

// console.log('xxx', publicToAddress(Buffer.from('02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5', 'hex')));

console.log('BIP55     : ', toChecksumAddress(publicToAddress(publicKey, true).toString('hex')));

// const pubKey = '02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5';
// console.log('BIP55', toChecksumAddress(publicToAddress(Buffer.from(pubKey), true).toString('hex')));
console.log('---------------');
const ec = new EC('secp256k1');
// const key = ec.genKeyPair();
// console.log('public  key : ', key.getPublic(true, 'hex'));
// console.log('private key : ', key.getPrivate('hex'));

const pair = ec.keyFromPrivate('0x846007d9a3aaa5c8ef9618319d2372f1a587dc34bb42853e378a634c362503b434b4fb6fef03213102e710f87576be7da38cbfd8d17df8e16ea3eb71aec5814', 'hex');
// const pair = ec.keyFromPrivate('0x370BA1dc25C07d0C77Ba9b83fcc75Fcc2a0aC243', 'hex');
// const pair = ec.keyFromPublic('02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5', 'hex');
// const pair = ec.keyFromPublic('026ff0a678820406381a0df428f3783d06927076a85c8beb212d4351346da434bc', 'hex');
const compose = pair.getPublic(true, 'hex');
console.log('compose   : ', compose);
const decompose = pair.getPublic(false, 'hex');
const decomposeBuf = Buffer.from(decompose, 'hex');
const addr = publicToAddress(decomposeBuf, true).toString('hex');
console.log('decompose : ', decompose);
console.log('address   : ', addr);
console.log('bip55 address : ', toChecksumAddress(addr));

pair.sign();
