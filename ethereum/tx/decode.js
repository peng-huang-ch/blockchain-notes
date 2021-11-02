const { TransactionFactory } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');

const common = new Common({ chain: Chain.Ropsten, hardfork: Hardfork.London });

const buf = Buffer.from('02f8920382018984b2d05e0084b2d05e008301adb09438d727badd0cb8dc67c9db7e2f95067b952c3b3880b86423b872dd000000000000000000000000726063423641b0d028d17e32960a0288b818783d000000000000000000000000726063423641b0d028d17e32960a0288b818783d0000000000000000000000000000000000000000000000000000000000000008c0808080', 'hex');
const tx = TransactionFactory.fromSerializedData(buf, { common });
console.log(tx.toJSON());
