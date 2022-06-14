require('dotenv').config();
const { strict: assert } = require('assert');
const { utils, Wallet, providers, BigNumber } = require('ethers');

var mnemonic = process.env.CROSS_CHAIN_MNEMONIC;

const iface = new utils.Interface([
	'function anySwapOutNative(address token, address to, uint256 toChainID) payable',
	'function anySwapOutUnderlying(address token, address to, uint256 amount, uint256 toChainID)',
]);


// CLV para chain -> bsc
// https://clvscan.com/tx/0x2c6a01b4ff0b90c0d9c3c9ad2ba55768d155e3e9b55f0937987dbaa0656f4486
// https://bridgeapi.anyswap.exchange/v2/history/details?params=0x2c6a01b4ff0b90c0d9c3c9ad2ba55768d155e3e9b55f0937987dbaa0656f4486
// https://bscscan.com/tx/0xd37f0d47a77e7bb49795c2c80c1ea9eac7faf6029578d7ee5491012b6c0661cd

async function clv_para_to_bsc() {
	var anySwapRouter = '0x218c3c3d49d0e7b37aff0d8bb079de36ae61a4c0'; // router address
	var anyTokenAddress = '0xc1be9a4d5d45beeacae296a7bd5fadbfc14602c4'; // anyTokenAddress
	var toAddress = '0x0495EE61A6c19494Aa18326d08A961c446423cA2'; // to address
	var toAmount = 6; // to amount
	var toChainId = '0x38'; // BNB chainId

	var wallet = Wallet.fromMnemonic(mnemonic);
	const address = await wallet.getAddress();
	console.log('wallet address: ', address);

	const value = '4000000000000000000';
	// const url = 'https://api-para.clover.finance';
	const url = 'wss://clover.api.onfinality.io/public-ws';

	const provider = new providers.getDefaultProvider(url);
	const network = await provider.getNetwork();
	const chainId = network.chainId;

	console.log('network : ', network);
	console.log('chainId : ', chainId);

	const { gasPrice } = await provider.getFeeData();
	console.log('gasPrice : ', gasPrice);
	const balance = await provider.getBalance(address);
	console.log('balance  : ', balance);

	var nonce = await provider.getTransactionCount(address);

	console.log('nonce : ', nonce);
	console.log('anySwapOutNative', anyTokenAddress, toAddress, toChainId);
	var input = iface.encodeFunctionData('anySwapOutNative', [anyTokenAddress, toAddress, toChainId]);
	console.log('input :', input);

	assert.strictEqual(input,
		'0xa5e56571000000000000000000000000c1be9a4d5d45beeacae296a7bd5fadbfc14602c40000000000000000000000000495ee61a6c19494aa18326d08a961c446423ca20000000000000000000000000000000000000000000000000000000000000038');

	const txData = {
		chainId,
		nonce: nonce,
		to: anySwapRouter,
		data: input,

		gasPrice: gasPrice,
		gasLimit: BigNumber.from('0x01a289').toHexString(),
		value: BigNumber.from(value).toHexString(),
	}

	var unsignedTx = {
		...txData,
	}

	const message = utils.keccak256(utils.serializeTransaction(unsignedTx));
	var signature = wallet._signingKey().signDigest(utils.arrayify(message));

	var signedTx = utils.serializeTransaction(unsignedTx, signature);
	console.log('signedTx : ', signedTx);
	var tx = utils.parseTransaction(signedTx);
	var txHash = tx.hash;
	console.log('txHash    : ', txHash);
	console.log('signed tx : ', tx);

	var { hash } = await provider.sendTransaction(signedTx);
	console.log('txHash : ', hash);
}
// clv_para_to_bsc().catch(console.error);

// CLV bsc -> para chain
// https://bscscan.com/tx/0x6dead5bef6712facd86d83ee88917d1e7c2ebc0193b14104db9012e8e10ff1ef
// https://bridgeapi.anyswap.exchange/v2/history/details?params=0x6dead5bef6712facd86d83ee88917d1e7c2ebc0193b14104db9012e8e10ff1ef
// https://clvscan.com/tx/0xdc449325e32816afd3971ace69102d9bf7b52fa102bff1b85a4b34d4010377ed

async function bsc_to_clv_para() {
	var anySwapRouter = '0xf9736ec3926703e85c843fc972bd89a7f8e827c0'; // router address
	var anyTokenAddress = '0x845ab325e3e4ec379c68047313d66bbd631e59a9'; // anyTokenAddress
	var toAddress = '0x0495EE61A6c19494Aa18326d08A961c446423cA2'; // to address
	var toChainId = '1024'; // CLV para chainId

	var wallet = Wallet.fromMnemonic(mnemonic);
	const address = await wallet.getAddress();
	console.log('wallet address: ', address);

	const toAmount = '4000000000000000000';
	const url = 'https://bsc-dataseed1.binance.org/';

	const provider = new providers.JsonRpcProvider(url);
	const network = await provider.getNetwork();
	const chainId = network.chainId;

	console.log('network : ', network);
	console.log('chainId : ', chainId);

	const { gasPrice } = await provider.getFeeData();
	console.log('gasPrice : ', gasPrice);
	const balance = await provider.getBalance(address);
	console.log('balance  : ', balance);

	var nonce = await provider.getTransactionCount(address);

	var input = iface.encodeFunctionData('anySwapOutUnderlying', [anyTokenAddress, toAddress, toAmount, toChainId]);
	console.log('input :', input);
	assert.strictEqual(input,
		'0xedbdf5e2000000000000000000000000845ab325e3e4ec379c68047313d66bbd631e59a90000000000000000000000000495ee61a6c19494aa18326d08a961c446423ca20000000000000000000000000000000000000000000000003782dace9d9000000000000000000000000000000000000000000000000000000000000000000400');

	const txData = {
		chainId,
		nonce: 0x1 || nonce,
		to: anySwapRouter,
		data: input,

		gasPrice: BigNumber.from(0x12a05f200).toHexString() || gasPrice,
		gasLimit: BigNumber.from(96855).toHexString(),
		// maxPriorityFeePerGas: BigNumber.from('0x0ba43b7400').toHexString(),
		// maxFeePerGas: BigNumber.from('0x0ba43b7400').toHexString(),
		value: BigNumber.from(0).toHexString(),
	}

	var unsignedTx = {
		...txData,
	}

	const message = utils.keccak256(utils.serializeTransaction(unsignedTx));
	var signature = wallet._signingKey().signDigest(utils.arrayify(message));

	var signedTx = utils.serializeTransaction(unsignedTx, signature);
	console.log('signedTx : ', signedTx);
	var tx = utils.parseTransaction(signedTx);
	var txHash = tx.hash;
	console.log('txHash    : ', txHash);
	console.log('signed tx : ', tx);
	return;
	var { hash } = await provider.sendTransaction(signedTx);
	console.log('txHash : ', hash);
}

bsc_to_clv_para().catch(console.error)