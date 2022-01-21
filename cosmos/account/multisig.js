const { strict } = require('assert');
const { Bech32, fromHex, toBase64, toHex } = require('@cosmjs/encoding');
const { createMultisigThresholdPubkey, pubkeyToAddress, pubkeyToRawAddress } = require('@cosmjs/amino');

function makeMultsigAccount(pubkeys, threshold, prefix) {
	const multisig = createMultisigThresholdPubkey(pubkeys, threshold, true);
	const multisigAddress = pubkeyToAddress(multisig, prefix);
	console.log('multisigAddress : ', multisigAddress);

	const group = {
		type: "tendermint/PubKeyMultisigThreshold",
		value: {
			threshold,
			pubkeys,
		},
	};

	var rawAddress = pubkeyToRawAddress(group);
	strict.equal(Bech32.encode(prefix, rawAddress), multisigAddress, 'should be equal')
}

async function main() {
	const threshold = 2;
	const prefix = "cosmos";
	var pubkeys = [
		"02f4147da97162a214dbe25828ee4c4acc4dc721cd0c15b2761b43ed0292ed82b5",
		"0377155e520059d3b85c6afc5c617b7eb519afadd0360f1ef03aff3f7e3f5438dd",
		"02f44bce3eecd274e7aa24ec975388d12905dfc670a99b16e1d968e6ab5f69b266"
	].map(key => Buffer.from(key, 'hex')).map(key => {
		return {
			type: "tendermint/PubKeySecp256k1",
			value: toBase64(key),
		}
	});
	makeMultsigAccount(pubkeys, threshold, prefix);
}

main().catch(console.error);