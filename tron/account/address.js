const TronWeb = require('tronweb');
const utils = TronWeb.utils;

const { ec: EC } = require('elliptic');
const ec = new EC('secp256k1');

function genPriKey() {
  const ec = new EC('secp256k1');
  const key = ec.genKeyPair();
  const priKey = key.getPrivate();
  const pubKeyHex = key.getPublic(false, 'hex');

  let priKeyHex = priKey.toString('hex');

  while (priKeyHex.length < 64) {
    priKeyHex = `0${priKeyHex}`;
  }
  console.log('priKeyHex', priKeyHex);
  console.log('pubKeyHex', pubKeyHex);
  console.log('fromPrivateKey(privateKey)', TronWeb.address.fromPrivateKey(priKeyHex));
  return utils.code.hexStr2byteArray(priKeyHex);
}

// const priKey = genPriKey();
// const com_addrBytes = utils.crypto.getAddressFromPriKey(priKey);
// const base58Addr = utils.crypto.getBase58CheckAddress(com_addrBytes);
// console.log('base58Addr', base58Addr);

// const bytes = utils.crypto.genPriKey();
// const hexStr = utils.bytes.byteArray2hexStr(bytes);
// console.log('hexStr', hexStr);

const privateKey = '';
const publicKey = '';

const pair = ec.keyFromPublic(publicKey, 'hex');
const decompose = pair.getPublic(false, 'hex');

const com_priKeyBytes = utils.code.hexStr2byteArray(privateKey);
const pubBytes = utils.crypto.getPubKeyFromPriKey(com_priKeyBytes);
console.log('pub hex: ', utils.code.byteArray2hexStr(pubBytes));

const com_addressBytes = utils.crypto.computeAddress(pubBytes);
const base58 = utils.crypto.getBase58CheckAddress(com_addressBytes);

console.log('pubBytes', pubBytes);
const com_pubKeyBytes = utils.code.hexStr2byteArray(decompose);

console.log('pub key to address : ', utils.crypto.getBase58CheckAddress(utils.crypto.computeAddress(com_pubKeyBytes)));
console.log('priv to address    : ', TronWeb.address.fromPrivateKey(privateKey));
console.log('priv to address    : ', base58);
console.log();
console.log('expected addr', 'TBHyRnhWGUpbrFBwZEyxgSQa7rKWvLCej3');
// console.log('priv to address', TronWeb.utils.crypto.fromPrivateKey('02ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231'));
// const address = tronWeb.address.fromHex('418840E6C55B9ADA326D211D818C34A994AECED808');
// console.log('address', address);
