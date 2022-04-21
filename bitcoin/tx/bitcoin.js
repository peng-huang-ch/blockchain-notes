require('dotenv').config();
const { ECPair, Psbt, networks, payments } = require('bitcoinjs-lib');
const network = networks.testnet;

var secret = process.env.ECDSA_SECRET;

const signer = ECPair.fromPrivateKey(Buffer.from(secret, 'hex'), network);
const pubkey = signer.publicKey;

const { address } = payments.p2pkh({ pubkey, network });
console.log('pubkey  : ', pubkey.toString('hex'));
console.log('address : ', address);

// https://github.com/bitcoinjs/bitcoinjs-lib/blob/master/test/integration/transactions.spec.ts
function createPsbtTx() {
	const psbt = new Psbt({ network });
	psbt.setVersion(2); // These are defaults. This line is not needed.
	psbt.setLocktime(0)

	psbt.addInput({
		hash: '3b948165cfb707320ccdc9582b5acc7cdad213bc81b7edb37546e1334d802b38',
		index: 0,
		sequence: 0xffffffff, // These are defaults. This line is not needed.
		// tx raw data
		nonWitnessUtxo: Buffer.from('0100000001b2533a7e2329b92b576309969ef39e987f1ce62d76d1a3e714e1f73b830f7404010000006b483045022100e950df33415553a6cdd9665d4d6d3f03568ad0e2feb429efe19f4fc78da66714022059e3ffdf36d300a9352b971f8c48180ec0cef2325f61948488480430bc24d1ed012102ff26c5980685ae12d25312a8df8224c951a68272013425ffa60327d7d4b54231ffffffff0210270000000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ace71a0100000000001976a914dc6c3c43e5d2c934602095103d3cbf84ddc797f288ac00000000', 'hex')
	});

	psbt.addOutput({
		address: 'n1cScasu6XVoDki38WYAJH4ZJGRAfG8XRN',
		value: 9800
	});

	psbt.signInput(0, signer);

	psbt.finalizeAllInputs();

	const serialized = psbt.extractTransaction().toHex();
	console.log('serialized : ', serialized);

}

createPsbtTx();