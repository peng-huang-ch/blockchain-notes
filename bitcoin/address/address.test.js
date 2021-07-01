const bitcoin = require('bitcoinjs-lib');
const { toBase58Address, toBase32Address } = require('./address');

describe('Bitcoin address', () => {
  test('p2pk', () => {
    const pub = '02d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645c';
    const pubkey = Buffer.from(pub, 'hex');

    const { address: p2pk_address } = bitcoin.payments.p2pkh({ pubkey });
    const address = toBase58Address(pubkey);

    expect(address).toEqual(p2pk_address);
    expect(address).toEqual('1LoVGDgRs9hTfTNJNuXKSpywcbdvwRXpmK');
  });

  test('p2wpkh', () => {
    const pub = '02d0de0aaeaefad02b8bdc8a01a1b8b11c696bd3d66a2c5f10780d95b7df42645c';
    const pubkey = Buffer.from(pub, 'hex');

    const { address: p2wpkh_address } = bitcoin.payments.p2wpkh({ pubkey });
    const address = toBase32Address(pubkey);

    expect(address).toEqual(p2wpkh_address);
    expect(address).toEqual('bc1qmy63mjadtw8nhzl69ukdepwzsyvv4yex5qlmkd');
  });
});
