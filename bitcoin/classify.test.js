const { types, p2sh, p2pk, p2pkh, p2wsh, p2wpkh, multisig } = require('./classify');
const { fromASM } = require('./script');
const { valid, invalid } = require('./__mocks__/classify.json');

describe('Bitcoin classify', () => {
  describe('valid', () => {
    describe('p2sh', () => {
      const items = valid.filter((item) => item.type === types.P2SH);
      test.each(items)('classifies $output is $type', ({ output, outputHex }) => {
        const hex = fromASM(output);
        expect(outputHex).toEqual(hex.toString('hex'));

        const matched = p2sh(hex);
        expect(matched).toEqual(true);
      });
    });

    describe('p2pk', () => {
      const items = valid.filter((item) => item.type === types.P2PK);
      test.each(items)('classifies $output is $type', ({ output, outputHex }) => {
        const hex = fromASM(output);
        expect(outputHex).toEqual(hex.toString('hex'));

        const matched = p2pk(hex);
        expect(matched).toEqual(true);
      });
    });

    describe('p2pkh', () => {
      const items = valid.filter((item) => item.type === types.P2PKH);
      test.each(items)('classifies $output is $type', ({ output, outputHex }) => {
        const hex = fromASM(output);
        expect(outputHex).toEqual(hex.toString('hex'));

        const matched = p2pkh(hex);
        expect(matched).toEqual(true);
      });
    });

    describe('p2wsh', () => {
      const items = valid.filter((item) => item.type === types.P2WSH);
      test.each(items)('classifies $output is $type', ({ output, outputHex }) => {
        const hex = fromASM(output);
        expect(outputHex).toEqual(hex.toString('hex'));

        const matched = p2wsh(hex);
        expect(matched).toEqual(true);
      });
    });

    describe('p2wpkh', () => {
      const items = valid.filter((item) => item.type === types.P2WPKH);
      test.each(items)('classifies $output is $type', ({ output, outputHex }) => {
        const hex = fromASM(output);
        expect(outputHex).toEqual(hex.toString('hex'));

        const matched = p2wpkh(hex);
        expect(matched).toEqual(true);
      });
    });

    describe('multisig', () => {
      const items = valid.filter((item) => item.type === types.P2MS);
      test.each(items)('classifies $output is $type', ({ output, outputHex }) => {
        const hex = fromASM(output);
        expect(outputHex).toEqual(hex.toString('hex'));

        const matched = multisig(hex);
        expect(matched).toEqual(true);
      });
    });
  });
});
