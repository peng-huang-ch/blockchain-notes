const { default: Wallet } = require('ethereumjs-wallet');

const wallet = Wallet.generate();

console.log('address     : ', wallet.getAddressString());
console.log('private key : ', wallet.getPrivateKeyString());
