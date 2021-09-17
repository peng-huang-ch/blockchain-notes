require('dotenv').config();
const assert = require('assert').strict;
var { mnemonicToEntropy } = require('bip39');
var { u8aToHex, u8aConcat } = require('@polkadot/util');
var CardanoWasm = require('@emurgo/cardano-serialization-lib-nodejs');
function harden(num) {
  return 0x80000000 + num;
}

var txBuilder = CardanoWasm.TransactionBuilder.new(
  // all of these are taken from the mainnet genesis settings
  // linear fee parameters (a*size + b)
  CardanoWasm.LinearFee.new(CardanoWasm.BigNum.from_str('44'), CardanoWasm.BigNum.from_str('155381')),
  // minimum utxo value
  CardanoWasm.BigNum.from_str('1000000'),
  // pool deposit
  CardanoWasm.BigNum.from_str('500000000'),
  // key deposit
  CardanoWasm.BigNum.from_str('2000000')
);

const prv_key = process.env.CARDANO_PRIVATE_KEY;
var prv_key_buf = Buffer.from(prv_key, 'hex');

var chain_code = Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex');

var private_key = CardanoWasm.PrivateKey.from_normal_bytes(prv_key_buf);
var pub_key_buf = private_key.to_public().as_bytes();
var bip32_pub_key_buf = u8aConcat(pub_key_buf, chain_code);

var bip32_public_key = CardanoWasm.Bip32PublicKey.from_bytes(bip32_pub_key_buf);
var byronAddr = CardanoWasm.ByronAddress.icarus_from_key(
  bip32_public_key, // Ae2* style icarus address
  CardanoWasm.NetworkInfo.mainnet().protocol_magic()
);

console.log('CardanoWasm.NetworkInfo.mainnet().protocol_magic()', CardanoWasm.NetworkInfo.mainnet().protocol_magic());
console.log('byronAddr     : ', byronAddr.to_base58());

const tx_hash = '9382e520c7bcfe46b22422ce08b8f5eef3e683a82b7a8d69521ca318f15e5518';
const tx_hash_index = 0;

// add a bootstrap input - for ADA held in a Byron-era address
var byronAddress = CardanoWasm.ByronAddress.from_base58('Ae2tdPwUPEYyA78QaXm3MdgQn7VYRooZjo6f5MBCvwXbGHALLtFj72pjqor');
txBuilder.add_bootstrap_input(
  byronAddress,
  CardanoWasm.TransactionInput.new(
    CardanoWasm.TransactionHash.from_bytes(Buffer.from(tx_hash, 'hex')), // tx hash
    tx_hash_index
  ),
  CardanoWasm.Value.new(CardanoWasm.BigNum.from_str('1829150'))
);

console.log('byronAddress.to_address', byronAddress.to_base58());
// add output to the tx
var output_value = '1500000';
txBuilder.add_output(
  CardanoWasm.TransactionOutput.new(
    byronAddress.to_address(), // to address
    CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(output_value))
  )
);

var changerAddress = CardanoWasm.ByronAddress.from_base58('Ae2tdPwUPEYyA78QaXm3MdgQn7VYRooZjo6f5MBCvwXbGHALLtFj72pjqor');
// var output_value = '150000';
// txBuilder.add_output(
//   CardanoWasm.TransactionOutput.new(
//     changerAddress.to_address(), // to address
//     CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(output_value))
//   )
// );

// set the time to live - the absolute slot value before the tx becomes invalid
txBuilder.set_ttl(41117585);
// txBuilder.set_fee(CardanoWasm.BigNum.from_str('168625'));

// calculate the min fee required and send any change to an address
txBuilder.add_change_if_needed(changerAddress.to_address());

// once the transaction is ready, we build it to get the tx body without witnesses
var txBody = txBuilder.build();
var txHash = CardanoWasm.hash_transaction(txBody);
var witnesses = CardanoWasm.TransactionWitnessSet.new();

var bootstrapWitnesses = CardanoWasm.BootstrapWitnesses.new();

// var bootstrapWitness = CardanoWasm.make_icarus_bootstrap_witness(txHash, byronAddress, prvKey);

var vkey = CardanoWasm.Vkey.new(private_key.to_public());
var signature = private_key.sign(txHash.to_bytes());
var bootstrapWitness = CardanoWasm.BootstrapWitness.new(
  vkey,
  signature,
  chain_code, //
  byronAddress.attributes()
);
bootstrapWitnesses.add(bootstrapWitness);
witnesses.set_bootstraps(bootstrapWitnesses);

// create the finalized transaction with witnesses
var transaction = CardanoWasm.Transaction.new(
  txBody,
  witnesses,
  undefined // transaction metadata
);
var bytes = transaction.to_bytes();
var tx_base64 = Buffer.from(bytes, 'hex').toString('base64');
console.log('tx base64 : ', tx_base64);
console.log('tx binary : ', u8aToHex(bytes));

var rawData = 'g6QAgYJYICHHitcKiVUWYheDd1WlNTACYn32HajUkb59PlIKPcU+AQGCglgrgtgYWCGDWBxlbU36eac5yGmVbizPJOVegyP1/5vOz/KShAo/oAAae5zkwBoAIZHAglgrgtgYWCGDWBxaKCUwhFT1wKj64A5bQNx4iWdZraefd4X73hwOoAAaNLPHlBoAUQBdAhoAApKxAxoCYd6goQKBhFgge8cgXymCMnUVunbenDi1F5ZRmu9JHeENFlrK7Hg1tk1YQLF+je1Qwqbm5/i/GUlQ/uOCXpO0GZqpDgDomXi3KC2DD8uZ04/SNtdkNmrPOaiX1ch9Dop2vSdr9StsMpkEWgFYIMW7kXCpLThtf6bPDTyGVlgb3bK7rKdJqJu65nYRF3JeQaD2';
console.log('rawData eq: ', tx_base64 === rawData);
function parse(rawData) {
  var buffer = Buffer.from(rawData, 'base64');
  var transaction = CardanoWasm.Transaction.from_bytes(buffer);
  var tx = transaction.body();
  var txHash = CardanoWasm.hash_transaction(tx);

  console.log('txHash : ', u8aToHex(txHash.to_bytes()));
  var inputs = tx.inputs();
  for (let i = 0; i < inputs.len(); i++) {
    var input = inputs.get(i);
    console.log('input.txid  : ', u8aToHex(input.transaction_id().to_bytes()));
    console.log('input.index : ', input.index());
  }

  var outputs = tx.outputs();
  for (let i = 0; i < outputs.len(); i++) {
    var output = outputs.get(i);
    console.log('output.addr  : ', CardanoWasm.ByronAddress.from_address(output.address()).to_base58());
    console.log('output.amount : ', output.amount().coin().to_str());
  }

  var ttl = tx.ttl();
  console.log('ttl: ', ttl);

  var fee = tx.fee();
  console.log('fee: ', fee.to_str());

  var to_bytes = tx.to_bytes();
  console.log('tx to_bytes: ', u8aToHex(to_bytes));

  var vkeyWitness = transaction.witness_set();
  var bootstraps = vkeyWitness.bootstraps();
  var bootstrap = bootstraps.get(0);
  var chain_code = bootstrap.chain_code();

  console.log('bootstraps.hex: ', u8aToHex(bootstrap.to_bytes()));
  console.log('bootstrap.pub_key   : ', u8aToHex(bootstrap.vkey().public_key().as_bytes()));
  console.log('bootstrap.vkey()    : ', u8aToHex(bootstrap.vkey().to_bytes()));
  console.log('bootstrap.signature : ', u8aToHex(bootstrap.signature().to_bytes()));
  console.log('bootstrap.chain_code: ', u8aToHex(chain_code));
}

console.log('-parse raw data--');
parse(rawData);
console.log('-parse raw completed--');
console.log('------------------');
