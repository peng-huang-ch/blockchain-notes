require('dotenv').config();
const { Avalanche, BinTools, Buffer, avm, utils } = require('avalanche');
const { Serialization } = utils;
const bintools = BinTools.getInstance();
const serialization = Serialization.getInstance();
const { SECRET_KEY_1 } = process.env;
const avalanche = new Avalanche('api.avax-test.network', 443, 'https', 5);
const xchain = avalanche.XChain(); //returns a reference to the X-Chain used by AvalancheJS

const myKeyChain = xchain.keyChain();

async function main() {
  var msg = serialization.bufferToType(Buffer.from('c74f28c8abbe0a4f656eab6a70980d7bd8849ed53972cfb75dd461b7e8d15f18', 'hex'), 'cb58');
  console.log('msg', msg);
  const KeyPair = avm.KeyPair;
  var kp = new KeyPair(myKeyChain.hrp, myKeyChain.chainid);

  const keyPair = myKeyChain.importKey(Buffer.from(SECRET_KEY_1, 'hex'));
  var pub_hex = keyPair.getPublicKey().toString('hex');
  console.log('pub  hex : ', pub_hex);
  console.log('addr     : ', keyPair.getAddressString());
  console.log('addr buf : ', keyPair.getAddress().toString('hex'));

  var expected_signature = '4e9b4279d46e2d1d967a3558210743fde1b51950932dd8cf426ed96790da4f706f41cee97924f47ab160850db4e3b09039afd5053e958486f927822c93c229f101';
  var signature = keyPair.sign(msg);
  console.log('signature   : ', signature.toString('hex'));
  console.log('signature eq: ', signature.toString('hex') === expected_signature);
  var kp = new avm.KeyPair(myKeyChain.hrp, myKeyChain.chainid);

  const addr = KeyPair.addressFromPublicKey(keyPair.getPublicKey());
  // kp['pubk'] = kpPub;
  const type = 'bech32';
  var addrString = serialization.bufferToType(addr, type, myKeyChain.hrp, myKeyChain.chainid);

  console.log('pub buf  : ', addrString);
  console.log('addr     : ', keyPair.getAddressString());
  console.log('addr buf : ', keyPair.getAddress().toString('hex'));
  console.log('addr     : ', kp.getAddressString());
  console.log('addr buf : ', kp.getAddress().toString('hex'));
  console.log('pub hex  : ', keyPair.getPublicKey().toString('hex'));
  return;

  // const balance = await xchain.getBalance(address, 'AVAX');
  // console.log('balance', balance);
  //   console.log('newAddress1', newAddress1.getAddress());
}

main().catch(console.error);
