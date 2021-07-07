const { p2sh, types } = require('./classify');
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

    // test.each(invalid.fromASM)('invalid $script, throw " $description "', ({ script, description }) => {
    //   expect(() => {
    //     fromASM(script);
    //   }).toThrowError(new RegExp(description));
    // });
  });
});
