
require('dotenv').config();
const { utils, Wallet, providers } = require('ethers');

const mnemonic = process.env.CROSS_CHAIN_MNEMONIC;

const iface = new utils.Interface([
	'function approve(address spender, uint256 amount)',
]);

async function approve() {
	var wallet = Wallet.fromMnemonic(mnemonic);
	const address = await wallet.getAddress();
	console.log('wallet : ', address);

	var url = 'https://bsc-dataseed2.binance.org/';

	var router = '0xd1c5966f9f5ee6881ff6b261bbeda45972b1b5f3';
	var token = '0xEDF0c420bc3b92B961C6eC411cc810CA81F5F21a';
	var amount = '115792089237316195423570985008687907853269984665640564039457584007913129639935';
	const provider = new providers.JsonRpcProvider(url);
	const network = await provider.getNetwork();
	const chainId = network.chainId;

	const { gasPrice } = await provider.getFeeData();

	const balance = await provider.getBalance(address);
	const nonce = await provider.getTransactionCount(address);
	console.log('balance : ', balance);

	var input = iface.encodeFunctionData('approve', [router, amount]);

	const txData = {
		// type: 1,
		chainId,
		nonce,
		to: token,
		data: input,

		value: '0x00',

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
	// var signature = wallet._signingKey().signDigest(utils.arrayify(message));

	// var signedTx = utils.serializeTransaction(unsignedTx, signature);
	// var tx = utils.parseTransaction(signedTx);
	// console.log('signed tx : ', tx);

	var signedTx = await wallet.signTransaction(unsignedTx);

	var { hash } = await provider.sendTransaction(signedTx);
	console.log('txHash : ', hash);
}
approve().catch(console.error);