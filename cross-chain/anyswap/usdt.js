require('dotenv').config();
const { strict: assert } = require('assert');
const { utils, Wallet, providers } = require('ethers');

var mnemonic = process.env.CROSS_CHAIN_MNEMONIC;

const iface = new utils.Interface([
	'function anySwapOutUnderlying(address token, address to, uint256 amount, uint256 toChainId)',
]);

var router = '0xd1c5966f9f5ee6881ff6b261bbeda45972b1b5f3'; // router address
var token = '0xEDF0c420bc3b92B961C6eC411cc810CA81F5F21a'; // anyTokenAddress
var toAddress = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3'; // to address
var toAmount = '0xa688906bd8b00000'; // to amount
var toChainId = '0x89'; // polygon chainId

// USDT bsc -> polygon
// https://bscscan.com/tx/0x2a89d7534c6962ea7d5e61dcd9ef74e8537eafc5621907277dd8140243474f57
// https://polygonscan.com/tx/0x299284ba8214d29a117a7f719a48ea5ba4d89c4965a8b9a90060b2441bc96bcc

async function main() {
	var wallet = Wallet.fromMnemonic(mnemonic);
	const address = await wallet.getAddress();
	console.log('wallet : ', address);

	const url = 'https://bsc-dataseed1.binance.org';

	const provider = new providers.JsonRpcProvider(url);
	const network = await provider.getNetwork();
	const chainId = network.chainId;

	const { gasPrice } = await provider.getFeeData();

	const balance = await provider.getBalance(address);
	const nonce = await provider.getTransactionCount(address);
	// var value = utils.parseEther('0.001').toHexString();
	console.log('balance : ', balance);
	console.log('anySwapOutUnderlying', token, toAddress, toAmount, toChainId);
	var input = iface.encodeFunctionData('anySwapOutUnderlying', [token, toAddress, toAmount, toChainId]);
	assert.strictEqual(input,
		'0xedbdf5e2000000000000000000000000edf0c420bc3b92b961c6ec411cc810ca81f5f21a000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb3000000000000000000000000000000000000000000000000a688906bd8b000000000000000000000000000000000000000000000000000000000000000000089');

	const txData = {
		chainId,
		nonce,
		to: router,
		// value: '0x00',
		data: input,

		gasPrice,
		// maxFeePerGas,
		// maxPriorityFeePerGas,
	}

	const gasLimit = await provider.estimateGas({ ...txData, from: address });
	var unsignedTx = {
		...txData,
		gasLimit,
	}

	const message = utils.keccak256(utils.serializeTransaction(unsignedTx));
	var signature = wallet._signingKey().signDigest(utils.arrayify(message));

	var signedTx = utils.serializeTransaction(unsignedTx, signature);
	var tx = utils.parseTransaction(signedTx);
	console.log('signed tx : ', tx);

	var { hash } = await provider.sendTransaction(signedTx);
	console.log('txHash : ', hash);
}
main().catch(console.error);