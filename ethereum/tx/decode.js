const { Transaction } = require('@ethereumjs/tx');
const { stripZeros } = require('ethereumjs-util');
const ETH = require('@ethereumjs/common');
const Common = ETH.default;
const Chain = ETH.Chain;

const common = new Common({ chain: Chain.Ropsten });

const buf = Buffer.from('f8ca82011585012a05f1ff82f7dc943d073b55358ffcba24275320e4010efae7a83b3780b86423b872dd000000000000000000000000ae7eba2ef5bb8b2420728c65c081d30d84559eb100000000000000000000000076c9a2c1685718935e7e8e8fe130aae73a05099d000000000000000000000000000000000000000000000000000000000000000429a035fd2550d7d52c55041525b1f69dbe7c38248401fec036f11b53ca98365227a49f2057e2b60222fdb9418644f8a09924ab6a3a5ea92340e6f49121ed6af5e676', 'hex');
const tx = Transaction.fromSerializedTx(buf, { common });
console.log(tx.toJSON());
