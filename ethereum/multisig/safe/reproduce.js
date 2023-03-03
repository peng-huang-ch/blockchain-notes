const assert = require('assert');
const BigNumber = require('bignumber.js');
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const {
	getSafeSingletonDeployment,
	getProxyFactoryDeployment,
	getCompatibilityFallbackHandlerDeployment,
} = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');

// https://rinkeby.etherscan.io/tx/0xaf80043ff6294af68e7b7ae5e6068be71011c87dbff5e6abbaae29c4ac874423
function reproduce() {
	const chain = Chain.Rinkeby;
	const safeSingleton = getSafeSingletonDeployment({ chain });
	const safeSingletonAddress = safeSingleton.networkAddresses[chain];
	const safeSingletonABI = safeSingleton.abi;

	const proxyFactory = getProxyFactoryDeployment();
	const proxyFactoryABI = proxyFactory.abi;
	const proxyFactoryAddress = proxyFactory.networkAddresses[chain];

	const compatHandler = getCompatibilityFallbackHandlerDeployment();
	const compatHandlerAddress = compatHandler.networkAddresses[chain];

	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
	const threasold = 1;
	const owners = ['0x0d5a689d6a973e945cbbfab37202a1788e5588e7', '0xe6bac7d1b67690019dc33fc29f9f156aea6894b2'];
	const params = [owners, threasold, ZERO_ADDRESS, '0x', compatHandlerAddress, ZERO_ADDRESS, 0, ZERO_ADDRESS];
	const safeSingletonContract = new Contract(safeSingletonABI);
	const initializer = safeSingletonContract.methods.setup(...params).encodeABI();
	assert.strictEqual(
		initializer,
		'0xb63e800d0000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000f48f2b2d2a534e402487b3ee7c18c33aec0fe5e400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d5a689d6a973e945cbbfab37202a1788e5588e7000000000000000000000000e6bac7d1b67690019dc33fc29f9f156aea6894b20000000000000000000000000000000000000000000000000000000000000000',
		'initializer should be equal',
	);

	const proxyFactoryContract = new Contract(proxyFactoryABI);
	const input = proxyFactoryContract.methods.createProxyWithNonce(safeSingletonAddress, initializer, '1644299206686').encodeABI();

	assert.strictEqual(
		input,
		'0x1688f0b9000000000000000000000000d9db270c1b5e3bd161e8c8503c55ceabee70955200000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000017ed7dec01e0000000000000000000000000000000000000000000000000000000000000184b63e800d0000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000160000000000000000000000000f48f2b2d2a534e402487b3ee7c18c33aec0fe5e400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020000000000000000000000000d5a689d6a973e945cbbfab37202a1788e5588e7000000000000000000000000e6bac7d1b67690019dc33fc29f9f156aea6894b2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
		'input should be equal',
	);

	const gasLimit = '0x8b8d0';
	const common = new Common({ chain: Chain.Rinkeby, hardfork: Hardfork.London });
	const nonce = 0;
	const opts = { common };
	const tx = Transaction.fromTxData(
		{
			maxFeePerGas: '0x9af8da00',
			maxPriorityFeePerGas: '0x9502f900',
			to: proxyFactoryAddress,
			data: input,
			value: '0x00',
			nonce: '0x' + new BigNumber(nonce).toString(16),
			gasLimit: '0x' + new BigNumber(gasLimit).toString(16),
			r: '0x2ecb42337746461c452d7873606299949e8e4fbac146d47e056ddd765cde8a48',
			s: '0x558f32ce19f252f826b0c33c875bcacf370e3561693c44ec0f5bd223a20565fa',
			v: '0x0',
		},
		opts,
	);
	const txid = tx.hash().toString('hex');
	assert.strictEqual(txid, 'af80043ff6294af68e7b7ae5e6068be71011c87dbff5e6abbaae29c4ac874423', 'txid should be equal');
	console.log('txid : ', txid);
}

reproduce();
