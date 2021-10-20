require('dotenv').config();
const assert = require('assert').strict;
const { eddsa: EdDSA } = require('elliptic');
const ec = new EdDSA('ed25519');
var { mnemonicToEntropy } = require('bip39');
var { u8aToHex, hexToU8a } = require('@polkadot/util');
var CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
var { Bip32PrivateKey } = CardanoWasm;
function harden(num) {
  return 0x80000000 + num;
}

// Purpose derivation (See BIP43)
const Purpose = {
  CIP1852: 1852, // see CIP 1852
};

// Cardano coin type (SLIP 44)
const CoinTypes = {
  CARDANO: 1815,
};

const ChainDerivation = {
  EXTERNAL: 0, // from BIP44
  INTERNAL: 1, // from BIP44
  CHIMERIC: 2, // from CIP1852
};

const mnemonic = process.env.CARDANO_MNEMONIC;
const entropy = mnemonicToEntropy(mnemonic);
const rootKey = Bip32PrivateKey.from_bip39_entropy(Buffer.from(entropy, 'hex'), Buffer.from(''));

var account_key = rootKey
  .derive(harden(1852)) //
  .derive(harden(1815))
  .derive(harden(0)); // account #0

var utxo_pub_key = account_key
  .derive(0) // external
  .derive(0)
  .to_public();

var stake_key = account_key
  .derive(2) // external
  .derive(0)
  .to_public();

const prv_key = process.env.CARDANO_PRIVATE_KEY;
var prv_key_buf = Buffer.from(prv_key, 'hex');
var pair = ec.keyFromSecret(prv_key_buf);
var pub_bytes = pair.getPublic();
var pub_key = CardanoWasm.PublicKey.from_bytes(pub_bytes);
var pub_hash = pub_key.hash();
console.log('pub_key.to_raw_key().hash()', pub_key.hash());

var prvKey = CardanoWasm.PrivateKey.from_normal_bytes(prv_key_buf);

var baseAddr = CardanoWasm.BaseAddress.new(
  CardanoWasm.NetworkInfo.mainnet().network_id(), //
  CardanoWasm.StakeCredential.from_keyhash(pub_hash),
  CardanoWasm.StakeCredential.from_keyhash(pub_hash)
);

// return;
// instantiate the tx builder with the Cardano protocol parameters - these may change later on
var txBuilder = CardanoWasm.TransactionBuilder.new(
  // all of these are taken from the mainnet genesis settings
  // linear fee parameters (a*size + b)
  CardanoWasm.LinearFee.new(CardanoWasm.BigNum.from_str('44'), CardanoWasm.BigNum.from_str('155381')),
  // minimum utxo value
  CardanoWasm.BigNum.from_str('1000000'),
  // pool deposit
  CardanoWasm.BigNum.from_str('1000000'),
  // key deposit
  CardanoWasm.BigNum.from_str('1000000')
);

const tx_hash = '3d10756e174d9fa969fa4f103b42c0e81b6d749cd9ba30c7f4f8cf06629ee6ea';
console.log('to_public', u8aToHex(prvKey.to_public().as_bytes()));
txBuilder.add_key_input(
  // prvKey.to_public().hash(),
  CardanoWasm.PublicKey.from_bytes(Buffer.from('a0ac3029969fea162b505da02d4f806e4edc3a5d5d9d4df187b94675b879bc82', 'hex')).hash(),
  CardanoWasm.TransactionInput.new(
    CardanoWasm.TransactionHash.from_bytes(Buffer.from(tx_hash, 'hex')), // tx hash
    0
  ),
  CardanoWasm.Value.new(CardanoWasm.BigNum.from_str('1500000'))
);

// // add a bootstrap input - for ADA held in a Byron-era address
// var byronAddress = CardanoWasm.ByronAddress.from_base58('Ae2tdPwUPEZ71Am6fuqG4hsnr9MmZYDiVJqqdtZEZRdvEHcnjc4sBkqfbq9');
// txBuilder.add_bootstrap_input(
//   byronAddress,
//   CardanoWasm.TransactionInput.new(
//     CardanoWasm.TransactionHash.from_bytes(Buffer.from(tx_hash, 'hex')), // tx hash
//     0 // index
//   ),
//   CardanoWasm.Value.new(CardanoWasm.BigNum.from_str('3000000'))
// );

// base address
var shelleyOutputAddress = CardanoWasm.Address.from_bech32('addr1qx48krx8uepxr9e5jja9aedzcat6xsuy8eqs69lfnvu4tca20vxv0ejzvxtnf996tmj6936h5dpcg0jpp5t7nxee2h3sywjyfa');

// add output to the tx
const output_value = '1330000';
txBuilder.add_output(CardanoWasm.TransactionOutput.new(shelleyOutputAddress, CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(output_value))));

// set the time to live - the absolute slot value before the tx becomes invalid
txBuilder.set_ttl(40442379);

// calculate the min fee required and send any change to an address
txBuilder.add_change_if_needed(shelleyOutputAddress);

// once the transaction is ready, we build it to get the tx body without witnesses
var txBody = txBuilder.build();
var txHash = CardanoWasm.hash_transaction(txBody);

var bytes = txHash.to_bytes();
console.log('ttl', txBody.ttl().toString());
console.log('serialized : ', u8aToHex(txBody.to_bytes()));
console.log('txHash : ', u8aToHex(bytes));
// return;
var witnesses = CardanoWasm.TransactionWitnessSet.new();

// add keyhash witnesses
var vkeyWitnesses = CardanoWasm.Vkeywitnesses.new();
var vkeyWitness = CardanoWasm.make_vkey_witness(txHash, prvKey);
console.log('txHash equal          : ', '0x43753242f0fb12a614a9bc34b2112b399749bef5c53a3b34ebb598004d8e2436' === u8aToHex(txHash.to_bytes()));
console.log('txHash                : ', u8aToHex(txHash.to_bytes()));
console.log('private               : ', u8aToHex(prvKey.as_bytes()));
console.log('to_public             : ', u8aToHex(prvKey.to_public().as_bytes()));
console.log('vkeyWitness.pub_key   : ', u8aToHex(vkeyWitness.vkey().public_key().as_bytes()));
console.log('vkeyWitness.vkey()    : ', u8aToHex(vkeyWitness.vkey().to_bytes()));
console.log('vkeyWitness.signature : ', u8aToHex(vkeyWitness.signature().to_bytes()));

// // sign
console.log('rootKey', rootKey.to_raw_key());
var signature = prvKey.sign(txHash.to_bytes());
var vkey = CardanoWasm.Vkey.new(prvKey.to_public());
var vkeyWitness = CardanoWasm.Vkeywitness.new(vkey, signature);
console.log('to_public             : ', u8aToHex(prvKey.to_public().as_bytes()));
console.log('vkeyWitness.vkey()    : ', u8aToHex(vkeyWitness.vkey().public_key().as_bytes()));
console.log('vkeyWitness.vkey()    : ', u8aToHex(vkeyWitness.vkey().to_bytes()));

vkeyWitnesses.add(vkeyWitness);
witnesses.set_vkeys(vkeyWitnesses);

// create the finalized transaction with witnesses
console.log('witnesses vkeys', witnesses.vkeys());
var transaction = CardanoWasm.Transaction.new(
  txBody,
  witnesses,
  undefined // transaction metadata
);
var bytes = transaction.to_bytes();
var tx_base64 = Buffer.from(bytes, 'hex').toString('base64');
console.log(tx_base64);
console.log(u8aToHex(bytes));
