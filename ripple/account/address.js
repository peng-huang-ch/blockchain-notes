const { classicAddressToXAddress } = require('ripple-address-codec');
const RippleAPI = require('ripple-lib').RippleAPI;

const api = new RippleAPI({});

// rsuUYDM8d15J44pZbdKumiDcnXHjPEuhXE
// sapyGYwE3bh3JiYU59hFdecU2PovC

// r9jhVPMfEWv2YCP7TNKoqyPUScUt66Hkuq
// snv63YPxpLsqn7NsdGxnqECviNPZ2

const secret = 'sapyGYwE3bh3JiYU59hFdecU2PovC';
const keypair = api.deriveKeypair(secret);
const { publicKey, privateKey } = keypair;
const address = api.deriveAddress(publicKey);
console.log('publicKey  : ', publicKey);
console.log('privateKey : ', privateKey);
const xAddress = classicAddressToXAddress(address, false, true);
const xTestAddress = classicAddressToXAddress(address, false, false);
console.log('address    : ', address);
console.log('x Addr     : ', xAddress);
console.log('x TestAddr : ', xTestAddress);
