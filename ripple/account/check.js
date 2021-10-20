const base = require('base-x');
const { classicAddressToXAddress, decodeAccountID } = require('ripple-address-codec');
const RippleAPI = require('ripple-lib').RippleAPI;
const bs58 = base('rpshnaf39wBUDNEGHJKLM4PQRST7VWXYZ2bcdeCg65jkm8oFqi1tuvAxyz');

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

function seqEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}

function isValidAddress(address) {
  const expectedLength = 20;
  const withoutSum = decodeChecked(address);
  const versionBytes = withoutSum.slice(0, -expectedLength);
  if (seqEqual(versionBytes, [0])) {
    return true;
  }
  return false;
}

function decodeChecked(base58string) {
  const buffer = bs58.decode(base58string);
  if (buffer.length < 5) {
    throw new Error('invalid_input_size: decoded data must have length >= 5');
  }
  if (!verifyCheckSum(buffer)) {
    throw new Error('checksum_invalid');
  }
  return buffer.slice(0, -4);
}

function verifyCheckSum(bytes) {
  const computed = sha256(sha256(bytes.slice(0, -4))).slice(0, 4);
  const checksum = bytes.slice(-4);
  return seqEqual(computed, checksum);
}

{
  const address = 'rDogsAY9kUNG3b4U3NjFa447MhA5zsLXp';
  const valid = isValidAddress(address);
  console.log('isValid', valid);
  const decode = decodeAccountID(address);
  console.log('decode', decode);
}
