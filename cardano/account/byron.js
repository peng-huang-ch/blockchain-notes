require('dotenv').config();
const { eddsa: EdDSA } = require('elliptic');
var { u8aToHex, hexToU8a, u8aConcat } = require('@polkadot/util');
const ec = new EdDSA('ed25519');

var { mnemonicToEntropy } = require('bip39');
var { u8aToHex } = require('@polkadot/util');
var { Bip32PrivateKey, ByronAddress, EnterpriseAddress, RewardAddress, BaseAddress, StakeCredential, NetworkInfo, PrivateKey, Address, Pointer, PointerAddress, Bip32PublicKey } = require('@emurgo/cardano-serialization-lib-nodejs');

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

function mnemonic() {
  var mnemonic = process.env.CARDANO_MNEMONIC;
  var entropy = mnemonicToEntropy(mnemonic);
  var rootKey = Bip32PrivateKey.from_bip39_entropy(Buffer.from(entropy, 'hex'), Buffer.from(''));

  var account_key = rootKey
    .derive(harden(1852)) //
    .derive(harden(1815))
    .derive(harden(0)); // account #0

  var prv_key = account_key.derive(0).derive(i);

  console.log('account_bech32: ', prv_key.to_bech32());

  var bip32_public_key = prv_key.to_public();
  var private_key = prv_key.to_raw_key();
  var bytes = private_key.as_bytes();
  console.log('bip32_private : ', u8aToHex(bytes));

  var public_key = private_key.to_public();
  var public_key_bytes = public_key.as_bytes();
  console.log('bip32_pub_hex : ', u8aToHex(public_key_bytes));
  console.log('pub_key_bech32: ', public_key.to_bech32());

  var byronAddr = ByronAddress.icarus_from_key(
    bip32_public_key, // Ae2* style icarus address
    NetworkInfo.mainnet().protocol_magic()
  );
  return byronAddr;
  console.log('byronAddr     : ', byronAddr.to_base58());
}

function private() {
  const prv_key = '';
  var prv_key_buf = Buffer.from(prv_key, 'hex');
  var pair = ec.keyFromSecret(prv_key_buf);
  const pub_key_buf = pair.getPublic();
  // console.log('decompose', pub_key_buf);
  console.log('pub_key        hex: ', u8aToHex(pub_key_buf));

  var private_key = PrivateKey.from_normal_bytes(prv_key_buf);
  console.log('private_key bech32: ', private_key.to_bech32());
  console.log('private_key    hex: ', u8aToHex(private_key.as_bytes()));
  console.log('pub_key     bech32: ', private_key.to_public().to_bech32());
  // console.log('pub_key        hex: ', u8aToHex(private_key.to_public().as_bytes()));

  var chain_code = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');
  var bip32_pub_key_buf = u8aConcat(pub_key_buf, chain_code);
  var bip32_pub_key = Bip32PublicKey.from_bytes(bip32_pub_key_buf);
  var magic = NetworkInfo.testnet().protocol_magic();
  console.log('bip32_pub_key bech32: ', bip32_pub_key.to_bech32());
  console.log('pub_key          bech32: ', bip32_pub_key.to_raw_key().to_bech32());
  console.log('pub_key             hex: ', u8aToHex(bip32_pub_key.to_raw_key().as_bytes()));
  console.log('magic                  : ', magic);

  var byronAddr = ByronAddress.icarus_from_key(
    bip32_pub_key, // Ae2* style icarus address
    magic
  );
  console.log('byronAddr', byronAddr.to_base58());
}

private();
