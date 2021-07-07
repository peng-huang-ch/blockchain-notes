const { fromASM, toASM } = require('./script');
const { valid, invalid } = require('./__mocks__/script.json');

describe('Bitcoin script', () => {
  describe('fromASM/toASM', () => {
    test.each(valid)('encodes/decodes $asm', ({ asm }) => {
      const script = fromASM(asm);
      expect(asm).toStrictEqual(toASM(script));
    });

    test.each(invalid.fromASM)('invalid $script, throw " $description "', ({ script, description }) => {
      expect(() => {
        fromASM(script);
      }).toThrowError(new RegExp(description));
    });
  });

  describe('compile (via fromASM)', () => {
    test.each(valid)('compile $asm, expect to be $script', ({ asm, script, nonstandard }) => {
      const scriptSig = fromASM(asm);
      expect(script).toStrictEqual(scriptSig.toString('hex'));
      if (!nonstandard) return;

      const scriptSigNS = fromASM(nonstandard.scriptSig);
      expect(script).toStrictEqual(scriptSigNS.toString('hex'));
    });
  });
});
