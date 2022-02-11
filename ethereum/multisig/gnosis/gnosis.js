const { _TypedDataEncoder } = require("@ethersproject/hash");
const { arrayify, splitSignature, hexZeroPad, joinSignature } = require("@ethersproject/bytes");

const EC = require('elliptic').ec;
const { stripHexPrefix } = require("ethjs-util");
const ec = new EC('secp256k1');

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const EIP712_SAFE_TX_TYPE = {
	SafeTx: [
		{ type: "address", name: "to" },
		{ type: "uint256", name: "value" },
		{ type: "bytes", name: "data" },
		{ type: "uint8", name: "operation" },
		{ type: "uint256", name: "safeTxGas" },
		{ type: "uint256", name: "baseGas" },
		{ type: "uint256", name: "gasPrice" },
		{ type: "address", name: "gasToken" },
		{ type: "address", name: "refundReceiver" },
		{ type: "uint256", name: "nonce" },
	]
}

function sendTx(web3, data) {
	return new Promise((resolve, reject) => {
		web3.eth
			.sendSignedTransaction(data)
			.once('transactionHash', hash => {
				resolve(hash);
			})
			.on('error', function (error) {
				reject(error);
			});
	});
}

function buildSafeTransaction(template) {
	return {
		to: template.to,
		value: template.value || 0,
		data: template.data || "0x",
		operation: template.operation || 0,
		safeTxGas: template.safeTxGas || 0,
		baseGas: template.baseGas || 0,
		gasPrice: template.gasPrice || 0,
		gasToken: template.gasToken || ZERO_ADDRESS,
		refundReceiver: template.refundReceiver || ZERO_ADDRESS,
		nonce: template.nonce,
	};
}


function calculateSafeTransactionHash(chainId, verifyingContract, safeTx) {
	return _TypedDataEncoder.hash({ verifyingContract, chainId }, EIP712_SAFE_TX_TYPE, safeTx)
}

function buildSignatureBytes(signatures) {
	signatures.sort((left, right) => left.signer.toLowerCase().localeCompare(right.signer.toLowerCase()))
	let signatureBytes = "0x"
	for (const sig of signatures) {
		signatureBytes += stripHexPrefix(sig.data)
	}
	return signatureBytes
}

function keySignHash(privateKey, hash) {
	const typedDataHash = arrayify(hash);
	const keyPair = ec.keyFromPrivate(privateKey);
	var signature = keyPair.sign(typedDataHash, { canonical: true });

	return joinSignature(splitSignature({
		recoveryParam: signature.recoveryParam,
		r: hexZeroPad("0x" + signature.r.toString(16), 32),
		s: hexZeroPad("0x" + signature.s.toString(16), 32),
	}));
}

async function signTypedData(privateKey, domain, safeTx, provider) {
	const populated = await _TypedDataEncoder.resolveNames(domain, EIP712_SAFE_TX_TYPE, safeTx, (name) => {
		return provider?.resolveName(name);
	});
	const safeHash = calculateSafeTransactionHash(populated.domain.chainId, populated.domain.verifyingContract, populated.value);
	const typedDataHash = arrayify(safeHash);
	return keySignHash(privateKey, typedDataHash);
}

function safeApproveHash(signerAddress) {
	return {
		signer: signerAddress,
		data:
			"0x000000000000000000000000" +
			stripHexPrefix(signerAddress) +
			"0000000000000000000000000000000000000000000000000000000000000000" +
			"01",
	};

}

exports.keySignHash = keySignHash;
exports.buildSafeTransaction = buildSafeTransaction;
exports.safeApproveHash = safeApproveHash;
exports.sendTx = sendTx;
exports.signTypedData = signTypedData;
exports.ZERO_ADDRESS = ZERO_ADDRESS;
exports.EIP712_SAFE_TX_TYPE = EIP712_SAFE_TX_TYPE;
exports.buildSignatureBytes = buildSignatureBytes;
exports.calculateSafeTransactionHash = calculateSafeTransactionHash;
