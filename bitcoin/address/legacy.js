const { payments, networks } = require('bitcoinjs-lib');


function p2pkh_address(pubkey, network) {
  const { address } = payments.p2pkh({ pubkey, network });
  return address;
}

function p2wpkh_address(pubkey, network) {
  const { address } = payments.p2wpkh({ pubkey, network });
  return address;
}

function p2sh_p2wpkh_address(pubkey, network) {
  const p2sh = payments.p2sh({
    redeem: payments.p2wpkh({
      pubkey,
      network
    }),
    network
  });
  return p2sh.address;
}

// https://bitcointools.site/tool/pubkey-to-address

function main() {
  const network = networks.bitcoin;
  var pubKey = '031b98c9f3bee12048d0ea57db25372db8da504b65b2adf023123c3cc464c6f283';
  const pubkey = Buffer.from(pubKey, 'hex');

  var p2pkhAddr = p2pkh_address(pubkey, network);
  console.log('p2pkh Address: ', p2pkhAddr);

  var p2wpkhAddr = p2wpkh_address(pubkey, network);
  console.log('p2wpkh Address: ', p2wpkhAddr);

  var p2sh_p2wpkhAddr = p2sh_p2wpkh_address(pubkey, network);
  console.log('p2sh_p2wpkh Address: ', p2sh_p2wpkhAddr);

}

main();
