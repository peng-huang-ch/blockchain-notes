const bitcoin = require('bitcoinjs-lib');
const { fromASM } = require('./script');
const { valid } = require('../__mocks__/script.json');

describe('Bitcoin script', () => {
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
