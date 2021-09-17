require('dotenv').config();
var { mnemonicToEntropy } = require('bip39');
var { u8aToHex } = require('@polkadot/util');
var { Bip32PrivateKey, ByronAddress, EnterpriseAddress, RewardAddress, BaseAddress, StakeCredential, NetworkInfo, PrivateKey, Address, Pointer, PointerAddress } = require('@emurgo/cardano-serialization-lib-nodejs');

function harden(num) {
  return 0x80000000 + num;
}

// Purpose derivation (See BIP43)
var Purpose = {
  CIP1852: 1852, // see CIP 1852
};

// Cardano coin type (SLIP 44)
var CoinTypes = {
  CARDANO: 1815,
};

var ChainDerivation = {
  EXTERNAL: 0, // from BIP44
  INTERNAL: 1, // from BIP44
  CHIMERIC: 2, // from CIP1852
};

var mnemonic = process.env.CARDANO_MNEMONIC;
var entropy = mnemonicToEntropy(mnemonic);
var rootKey = Bip32PrivateKey.from_bip39_entropy(Buffer.from(entropy, 'hex'), Buffer.from(''));

var account_key = rootKey
  .derive(harden(1852)) //
  .derive(harden(1815))
  .derive(harden(0)); // account #0

console.log('account_bech32: ', account_key.to_bech32());
var private_key = account_key.to_raw_key();
var bip32_private_bytes = account_key.as_bytes();
var bytes = private_key.as_bytes();
var bip32_public_key = account_key.to_public();

console.log('bip32_private : ', u8aToHex(bip32_private_bytes));
console.log('private     : ', u8aToHex(bytes));

var public_key = private_key.to_public();
var public_key_bytes = public_key.as_bytes();
var bip32_public_key_byets = bip32_public_key.as_bytes();
console.log('pub_key_bytes       : ', u8aToHex(public_key_bytes));
console.log('bip32_pub_key_byets : ', u8aToHex(bip32_public_key_byets));
console.log('pub_key_bech32      : ', public_key.to_bech32());

var byronAddr = ByronAddress.icarus_from_key(
  bip32_public_key, // Ae2* style icarus address
  NetworkInfo.mainnet().protocol_magic()
);
console.log('byronAddr     : ', byronAddr.to_base58());
return;
// ---
// var pub = Buffer.from('8d325e1895be9a8c20773e974b16cf6216accd9e398946a49a110d7f2f114556', 'hex');
var priv = PrivateKey.generate_ed25519();
console.log('priv_hex      :', u8aToHex(priv.as_bytes()));
var pub = priv.to_public();
console.log('pub_hex       :', u8aToHex(pub.as_bytes()));

var utxo_pub_key = account_key
  .derive(0) // external
  .derive(0)
  .to_public();

var stake_key = account_key
  .derive(2) // chimeric
  .derive(0)
  .to_public();

console.log('utxo_pub_key : ', utxo_pub_key.to_bech32());
console.log('stake_key    : ', stake_key.to_bech32());

var baseAddr = BaseAddress.new(
  NetworkInfo.mainnet().network_id(), //
  StakeCredential.from_keyhash(utxo_pub_key.to_raw_key().hash()),
  StakeCredential.from_keyhash(stake_key.to_raw_key().hash())
);

console.log('baseAddr : ', baseAddr.to_address().to_bech32());

// enterprise address without staking ability, for use by exchanges/etc
var enterpriseAddr = EnterpriseAddress.new(
  NetworkInfo.mainnet().network_id(), //
  StakeCredential.from_keyhash(utxo_pub_key.to_raw_key().hash())
);
console.log('enterpriseAddr: ', enterpriseAddr.to_address().to_bech32());

// pointer address - similar to Base address but can be shorter, see formal spec for explanation
var ptrAddr = PointerAddress.new(
  NetworkInfo.mainnet().network_id(),
  StakeCredential.from_keyhash(utxo_pub_key.to_raw_key().hash()),
  Pointer.new(
    100, // slot
    2, // tx index in slot
    0 // cert indiex in tx
  )
);
console.log('ptrAddr: ', ptrAddr.to_address().to_bech32());

var rewardAddr = RewardAddress.new(
  NetworkInfo.mainnet().network_id(), //
  StakeCredential.from_keyhash(stake_key.to_raw_key().hash())
);
console.log('rewardAddr: ', rewardAddr.to_address().to_bech32());
