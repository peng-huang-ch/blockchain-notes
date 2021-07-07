const { types, p2sh, p2pk, p2pkh } = require('./classify');
const { fromASM } = require('./script');
const { valid, invalid } = require('./__mocks__/classify.json');

describe('Bitcoin classify', () => {
  describe('p2sh', () => {
    const items = valid.filter((item) => item.type === types.P2SH);
    test.each(items)('classifies $output as $type', ({ output, outputHex }) => {
      const hex = fromASM(output);
      expect(outputHex).toEqual(hex.toString('hex'));

      const matched = p2sh(hex);
      expect(matched).toEqual(true);
    });
  });

  describe('p2pk', () => {
    const items = valid.filter((item) => item.type === types.P2PK);
    test.each(items)('classifies $output as $type', ({ output, outputHex }) => {
      const hex = fromASM(output);
      expect(outputHex).toEqual(hex.toString('hex'));

      const matched = p2pk(hex);
      expect(matched).toEqual(true);
    });
  });

  describe('p2pkh', () => {
    const items = valid.filter((item) => item.type === types.P2PKH);
    test.each(items)('classifies $output as $type', ({ output, outputHex }) => {
      const hex = fromASM(output);
      expect(outputHex).toEqual(hex.toString('hex'));

      const matched = p2pkh(hex);
      expect(matched).toEqual(true);
    });
  });
});
