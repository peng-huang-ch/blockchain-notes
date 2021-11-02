const { networks, bitgo } = require('@bitgo/utxo-lib-v2');
const network = networks.testnet;

const serialized = '0100000001db28cf6161bf01c2db9b2ca549afafaec57bb5a4447fd5f642bf6e2234d02d9a000000006b4830450221009f52b40dd697e9f7d2ea4b4c54e6e5870e4b472812bb6f80a8abdc598183408e02204046bc67052f8cb2e59e5df88d45f9670820b1113aa703fcf5817c0e7e8099b6012102bca8e21b7597c10b51b910f78cadfa42cf969e4a81e7e1a1597f673b813f32cdffffffff021d220000000000001976a9141c71691a111fbc17d978ff92aba0c00825cbd63588acdd020000000000001976a9141c71691a111fbc17d978ff92aba0c00825cbd63588ac00000000';

const tx = bitgo.createTransactionFromHex(serialized, network);
const txb = bitgo.createTransactionBuilderFromTransaction(tx);

const build = txb.build();
console.log('hash 			: ', build.getId());
