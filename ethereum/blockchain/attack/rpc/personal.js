const { request } = require('./request');

// https://geth.ethereum.org/docs/rpc/ns-personal
async function personal_importRawKey(uri, key, password) {
  return request(uri, 'personal_importRawKey', [key, password]);
}

async function personal_listAccounts(uri) {
  return request(uri, 'personal_listAccounts');
}

async function personal_unlockAccount(uri, address, passphrase, duration) {
  return request(uri, 'personal_unlockAccount', [address, passphrase, duration]);
}

exports.personal_importRawKey = personal_importRawKey;
exports.personal_listAccounts = personal_listAccounts;
exports.personal_unlockAccount = personal_unlockAccount;
