require('dotenv').config();
const { PrivateKey, Networks, Transaction } = require('bitcore-lib');

var secret = process.env.ECDSA_SECRET;
const priv = new PrivateKey(secret, Networks.testnet);

console.log('address    : ', priv.toAddress().toString());

var utxo = {
  txid: '5ab958a2a62d2e905128fbe0faebc998a92abf365aaa8db3f319c280dda32bc1',
  outputIndex: 0,
  address: 'n1cScasu6XVoDki38WYAJH4ZJGRAfG8XRN',
  script: '76a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac',
  satoshis: 10000,
};

const tx = new Transaction();
tx.from(utxo);
tx.to('mnv5WqA2nw1L5SHepFFVNYZMeHUC9WCfRU', 8000);
tx.change('mnv5WqA2nw1L5SHepFFVNYZMeHUC9WCfRU');
tx.fee(300);
tx.enableRBF();
tx.sign(priv);
const bl = tx.isRBF();
console.log('bl', bl);

const serialized = tx.serialize();
console.log('serialized', serialized);

const newTx = new Transaction();
console.log(newTx.isRBF());

newTx.from(utxo);
newTx.to('n1cScasu6XVoDki38WYAJH4ZJGRAfG8XRN', 7000);
newTx.change('n1cScasu6XVoDki38WYAJH4ZJGRAfG8XRN');
newTx.fee(1800);
newTx.enableRBF();
newTx.sign(priv);

const newSerialized = newTx.serialize();
console.log('new serialized : ', newSerialized);
