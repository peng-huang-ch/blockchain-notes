const Web3 = require('web3');
const { ethers } = require('ethers');
const Web3Method = require('web3-core-method');
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getCompatibilityFallbackHandlerDeployment, getMultiSendCallOnlyDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { addHexPrefix, bufferToHex, toBuffer } = require('ethereumjs-util');

const { buildSignatureBytes, buildSafeTransaction, signTypedData, sendTx, safeApproveHash, encodeMultiSend } = require('../gnosis');

async function deploySafeTx({
	chainId,
	endpoint,
	owners,
	threshold,
}) {
	const version = '1.3.0';
	const safeSingleton = getSafeSingletonDeployment({ version });
	const safeSingletonAddress = safeSingleton.networkAddresses[chainId];
	const safeSingletonABI = safeSingleton.abi;

	const proxyFactory = getProxyFactoryDeployment();
	const proxyFactoryABI = proxyFactory.abi;
	const proxyFactoryAddress = proxyFactory.networkAddresses[chainId];

	const compatHandler = getCompatibilityFallbackHandlerDeployment();
	const compatHandlerAddress = compatHandler.networkAddresses[chainId];

	const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
	const params = [
		owners,
		threshold,
		ZERO_ADDRESS,
		'0x',
		compatHandlerAddress, // fallback handler
		ZERO_ADDRESS,
		0,
		ZERO_ADDRESS,
	];

	const safeSingletonContract = new Contract(safeSingletonABI);
	const initializer = safeSingletonContract.methods.setup(...params).encodeABI();
	const saltNonce = 1672534000004 || Date.now();

	const proxyFactoryContract = new Contract(proxyFactoryABI, proxyFactoryAddress);
	proxyFactoryContract.setProvider(endpoint);

	const creationCode = await proxyFactoryContract.methods.proxyCreationCode().call();
	const deploymentCode = ethers.utils.solidityPack(["bytes", "uint256"], [creationCode, safeSingletonAddress])

	const input = proxyFactoryContract.methods.createProxyWithNonce(safeSingletonAddress, initializer, saltNonce).encodeABI();

	var salt = ethers.utils.solidityKeccak256(
		["bytes32", "uint256"],
		[ethers.utils.solidityKeccak256(["bytes"], [initializer]), saltNonce]
	)
	var safeAddress = ethers.utils.getCreate2Address(proxyFactoryAddress, salt, ethers.utils.keccak256(deploymentCode))

	const safeTx = buildSafeTransaction({
		data: input,
		to: proxyFactoryAddress,
		value: '0x00',
	});
	return { safeAddress, safeTx }
}


// 2-2. native coin
async function exec_safe({
	web3,
	common,
	members,
	safeAddress,
	safeAddressNonce = 0,
	to,
	value = '0x00',
	data = '0x',

	baseGas = 0,
	safeTxGas = 0,
	gasPrice = 0,
	refundReceiver = '0x0000000000000000000000000000000000000000',
	operation = 0,
}) {
	const chainId = common.chainIdBN().toNumber();
	const safeSingleton = getSafeSingletonDeployment({ chain: chainId });

	const safeSingletonABI = safeSingleton.abi;
	var participants = [];

	const safeContract = new Contract(safeSingletonABI, safeAddress);
	safeContract.setProvider(web3.currentProvider);
	// var safeContractNonce = await safeContract.methods.nonce().call();

	const safeTx = buildSafeTransaction({
		to,
		value,
		data,
		nonce: safeAddressNonce,

		operation,
		safeTxGas,
		baseGas,
		gasPrice,
		refundReceiver,
	});

	const domain = { verifyingContract: safeAddress, chainId };
	for (const item of members) {
		var approverData = await signTypedData(item.privateKey, domain, safeTx);
		participants.push({
			signer: item.address,
			data: approverData,
		});
	}

	var signatures = buildSignatureBytes(participants);

	console.log('signatures : ', signatures);

	const params = [
		safeTx.to,
		safeTx.value, // value
		safeTx.data, // data
		safeTx.operation, // operation
		safeTx.safeTxGas, // safeTxGas
		safeTx.baseGas, // dataGas
		safeTx.gasPrice, // gasPrice
		safeTx.gasToken, // gasToken
		safeTx.refundReceiver, // refundReceiver
		signatures,
	];

	const safeSingletonContract = new Contract(safeSingletonABI);
	var input = safeSingletonContract.methods.execTransaction(...params).encodeABI();

	return buildSafeTransaction({
		data: input,
		to: safeAddress,
		value: '0x00',
	});
}

function calcSafeCallGases(gas_limits) {
	const initial_gas = 21000;
	// const call_gas = gas_limit - initial_gas // single one
	const calls_gas = gas_limits.reduce((acc, gas_limit) => acc + (gas_limit - initial_gas), 0)
	const multi_send_base_gas = 310000;
	const transaction_initial_gas = 32000;
	const handle_payment = 7336;
	const safeTxGas = transaction_initial_gas + multi_send_base_gas + calls_gas + handle_payment;

	// We require some gas to emit the events (at least 2500) after the execution and some to perform code until the execution (500)
	const required_gas = 2500 + 500;
	const calls_execute_gas = calls_gas + required_gas;
	const baseGas = safeTxGas - calls_execute_gas;
	return { baseGas, safeTxGas };
}

async function combineAllTransactions() {
	const endpoint = 'https://goerli.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
	const chainId = Chain.Goerli;
	const common = new Common({ chain: chainId, hardfork: Hardfork.London });

	const web3 = new Web3(endpoint);
	const sender = '0xE6bac7d1B67690019Dc33fC29F9f156AEa6894B2';
	const senderPrivetKey = '';

	const members = [
		{
			address: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
			privateKey: '',
		},
		{
			address: '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3',
			privateKey: '',
		}
	];

	const gasPrice = await web3.eth.getGasPrice();

	// https://goerli.etherscan.io/tx/0x77fc4833222de5d23f03e4f1491e23cfa4fdc51725f620f50a3d73a0e1ee4086
	// 1. send eth to a new contract // 

	// https://goerli.etherscan.io/tx/0x13d9bfbf5666fa3e591c93f481aea2874e700b04b1958a0494eb117169a69d1e
	// 2.1. deploy the safe contract 
	// 2.2. send the tx fee to the relayer
	const { safeTx: deployedSafeTx, safeAddress } = await deploySafeTx({
		chainId,
		endpoint,
		owners: [...members.map((item) => item.address)],
		threshold: 2,
	});
	console.log('safeAddress  : ', safeAddress);
	// return;
	const uni_iface = new ethers.utils.Interface([
		'function approve(address spender, uint256 amount)',
		'function transfer(address recipient, uint256 amount)',
		'constructor(address _factoryV2, address factoryV3, address _positionManager, address _WETH9)',
		'function WETH9() view returns (address)',
		'function approveMax(address token) payable',
		'function approveMaxMinusOne(address token) payable',
		'function approveZeroThenMax(address token) payable',
		'function approveZeroThenMaxMinusOne(address token) payable',
		'function callPositionManager(bytes data) payable returns (bytes result)',
		'function checkOracleSlippage(bytes[] paths, uint128[] amounts, uint24 maximumTickDivergence, uint32 secondsAgo) view',
		'function checkOracleSlippage(bytes path, uint24 maximumTickDivergence, uint32 secondsAgo) view',
		'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum) params) payable returns (uint256 amountOut)',
		'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
		'function exactOutput(tuple(bytes path, address recipient, uint256 amountOut, uint256 amountInMaximum) params) payable returns (uint256 amountIn)',
		'function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountIn)',
		'function factory() view returns (address)',
		'function factoryV2() view returns (address)',
		'function getApprovalType(address token, uint256 amount) returns (uint8)',
		'function increaseLiquidity(tuple(address token0, address token1, uint256 tokenId, uint256 amount0Min, uint256 amount1Min) params) payable returns (bytes result)',
		'function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Min, uint256 amount1Min, address recipient) params) payable returns (bytes result)',
		'function multicall(bytes32 previousBlockhash, bytes[] data) payable returns (bytes[])',
		'function multicall(uint256 deadline, bytes[] data) payable returns (bytes[])',
		'function multicall(bytes[] data) payable returns (bytes[] results)',
		'function positionManager() view returns (address)',
		'function pull(address token, uint256 value) payable',
		'function refundETH() payable',
		'function selfPermit(address token, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) payable',
		'function selfPermitAllowed(address token, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) payable',
		'function selfPermitAllowedIfNecessary(address token, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) payable',
		'function selfPermitIfNecessary(address token, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) payable',
		'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to) payable returns (uint256 amountOut)',
		'function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] path, address to) payable returns (uint256 amountIn)',
		'function sweepToken(address token, uint256 amountMinimum, address recipient) payable',
		'function sweepToken(address token, uint256 amountMinimum) payable',
		'function sweepTokenWithFee(address token, uint256 amountMinimum, uint256 feeBips, address feeRecipient) payable',
		'function sweepTokenWithFee(address token, uint256 amountMinimum, address recipient, uint256 feeBips, address feeRecipient) payable',
		'function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes _data)',
		'function unwrapWETH9(uint256 amountMinimum, address recipient) payable',
		'function unwrapWETH9(uint256 amountMinimum) payable',
		'function unwrapWETH9WithFee(uint256 amountMinimum, address recipient, uint256 feeBips, address feeRecipient) payable',
		'function unwrapWETH9WithFee(uint256 amountMinimum, uint256 feeBips, address feeRecipient) payable',
		'function wrapETH(uint256 value) payable'
	]);

	const token_address = '0x1eC2CE6108240118Ff2c66eC8AFAC28618D7e066';
	const uniswap_token = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
	const maxAmount = ethers.BigNumber.from('115792089237316195423570985008687907853269984665640564039457584007913129639935').toHexString();
	const approve_data = uni_iface.encodeFunctionData('approve', [uniswap_token, maxAmount]);
	const approve_gas_limit = await web3.eth.estimateGas({
		from: safeAddress,
		to: token_address,
		data: approve_data,
		value: '0x00',
	});

	const approve_safe_gas = calcSafeCallGases([approve_gas_limit]);

	const approveSafeTx = await exec_safe({
		web3,
		common,
		members,
		safeAddress,
		safeAddressNonce: 0,
		to: token_address,
		data: approve_data,
		value: '0x00',

		safeTxGas: approve_safe_gas.safeTxGas,
		baseGas: approve_safe_gas.baseGas,
		gasPrice,
		refundReceiver: sender,
	});

	const uniswap_data = '0x5ae401dc00000000000000000000000000000000000000000000000000000000639aecd100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000001ec2ce6108240118ff2c66ec8afac28618d7e0660000000000000000000000000000000000000000000000000000000000002710000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb3000000000000000000000000000000000000000000000000000009184e72a00000000000000000000000000000000000000000000000000088adf115af3bc43d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
	const uniswap_value = ethers.utils.parseEther('0.00001');
	const uniswap_gas_limit = await web3.eth.estimateGas({
		from: safeAddress,
		to: uniswap_token,
		data: uniswap_data,
		value: uniswap_value,
	});

	const uniswap_safe_gas = calcSafeCallGases([uniswap_gas_limit]);

	const swapSafeTx = await exec_safe({
		web3,
		common,
		members,
		safeAddress,
		safeAddressNonce: 1,
		to: uniswap_token,
		data: uniswap_data,
		value: uniswap_value,

		safeTxGas: uniswap_safe_gas.safeTxGas,
		baseGas: uniswap_safe_gas.baseGas,
		gasPrice,
		refundReceiver: sender,
	});

	const txs = [
		buildSafeTransaction(deployedSafeTx),
		buildSafeTransaction(approveSafeTx),
		buildSafeTransaction(swapSafeTx),
	];

	// case 1. send all txs in one batch
	// https://goerli.etherscan.io/tx/0x30b4a7b90fc50bd82d441f90d2dfc5c1e7dd4d5245e99a06e5375ad3ee8c43d4
	const multiSend = getMultiSendCallOnlyDeployment({ chain: chainId });
	const multiSendHandlerAddress = multiSend.networkAddresses[chainId];
	console.log('txs : ', txs);

	const multiSendABI = multiSend.abi;
	const transactions = encodeMultiSend(txs);
	const iface = new ethers.utils.Interface(multiSendABI);
	const data = iface.encodeFunctionData('multiSend', [transactions])

	const senderNonce = await web3.eth.getTransactionCount(sender);

	const txData = {
		from: sender,
		nonce: senderNonce,
		to: multiSendHandlerAddress,
		data,
	};
	const gasLimit = await web3.eth.estimateGas(txData);

	web3.eth.extend({
		methods: [
			new Web3Method({
				name: 'maxPriorityFeePerGas',
				call: 'eth_maxPriorityFeePerGas',
			}),
		],
	});

	const maxPriorityFeePerGas = await web3.eth.maxPriorityFeePerGas();

	const block = await web3.eth.getBlock('pending');
	const baseFeePerGas = block['baseFeePerGas'];
	const maxFeePerGas = toBN(baseFeePerGas).add(toBN(maxPriorityFeePerGas));

	const tx = Transaction.fromTxData(
		{
			maxFeePerGas,
			maxPriorityFeePerGas: toBN(maxPriorityFeePerGas),
			gasLimit: toHex(toBN(gasLimit).mul(toBN(2))),
			value: '0x00',
			...txData,
		},
		{ common }
	);
	const signedTx = tx.sign(toBuffer(addHexPrefix(senderPrivetKey)));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();

	console.log('txId 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);
	return;
	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);

}

// https://goerli.etherscan.io/tx/0xee088fab9a4cd5e7c277c7d6306130755fcf4c235408b67e09e1fc2a44cf5c7b
async function combineDeployAndSafeTransactions() {
	const endpoint = 'https://goerli.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
	const chainId = Chain.Goerli;
	const common = new Common({ chain: chainId, hardfork: Hardfork.London });

	const web3 = new Web3(endpoint);
	const sender = '0xE6bac7d1B67690019Dc33fC29F9f156AEa6894B2';
	const senderPrivetKey = '';

	const members = [
		{
			address: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
			privateKey: '',
		},
		{
			address: '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3',
			privateKey: '',
		}
	];

	const gasPrice = await web3.eth.getGasPrice();

	// https://goerli.etherscan.io/tx/0x77fc4833222de5d23f03e4f1491e23cfa4fdc51725f620f50a3d73a0e1ee4086
	// 1. send eth to a new contract // 

	// https://goerli.etherscan.io/tx/0x13d9bfbf5666fa3e591c93f481aea2874e700b04b1958a0494eb117169a69d1e
	// 2.1. deploy the safe contract 
	// 2.2. send the tx fee to the relayer
	const { safeTx: deployedSafeTx, safeAddress } = await deploySafeTx({
		chainId,
		endpoint,
		owners: [...members.map((item) => item.address)],
		threshold: 2,
	});
	console.log('safeAddress  : ', safeAddress);
	// return;
	const uni_iface = new ethers.utils.Interface([
		'function approve(address spender, uint256 amount)',
		'function transfer(address recipient, uint256 amount)',
		'constructor(address _factoryV2, address factoryV3, address _positionManager, address _WETH9)',
		'function WETH9() view returns (address)',
		'function approveMax(address token) payable',
		'function approveMaxMinusOne(address token) payable',
		'function approveZeroThenMax(address token) payable',
		'function approveZeroThenMaxMinusOne(address token) payable',
		'function callPositionManager(bytes data) payable returns (bytes result)',
		'function checkOracleSlippage(bytes[] paths, uint128[] amounts, uint24 maximumTickDivergence, uint32 secondsAgo) view',
		'function checkOracleSlippage(bytes path, uint24 maximumTickDivergence, uint32 secondsAgo) view',
		'function exactInput(tuple(bytes path, address recipient, uint256 amountIn, uint256 amountOutMinimum) params) payable returns (uint256 amountOut)',
		'function exactInputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
		'function exactOutput(tuple(bytes path, address recipient, uint256 amountOut, uint256 amountInMaximum) params) payable returns (uint256 amountIn)',
		'function exactOutputSingle(tuple(address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountIn)',
		'function factory() view returns (address)',
		'function factoryV2() view returns (address)',
		'function getApprovalType(address token, uint256 amount) returns (uint8)',
		'function increaseLiquidity(tuple(address token0, address token1, uint256 tokenId, uint256 amount0Min, uint256 amount1Min) params) payable returns (bytes result)',
		'function mint(tuple(address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Min, uint256 amount1Min, address recipient) params) payable returns (bytes result)',
		'function multicall(bytes32 previousBlockhash, bytes[] data) payable returns (bytes[])',
		'function multicall(uint256 deadline, bytes[] data) payable returns (bytes[])',
		'function multicall(bytes[] data) payable returns (bytes[] results)',
		'function positionManager() view returns (address)',
		'function pull(address token, uint256 value) payable',
		'function refundETH() payable',
		'function selfPermit(address token, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) payable',
		'function selfPermitAllowed(address token, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) payable',
		'function selfPermitAllowedIfNecessary(address token, uint256 nonce, uint256 expiry, uint8 v, bytes32 r, bytes32 s) payable',
		'function selfPermitIfNecessary(address token, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) payable',
		'function swapExactTokensForTokens(uint256 amountIn, uint256 amountOutMin, address[] path, address to) payable returns (uint256 amountOut)',
		'function swapTokensForExactTokens(uint256 amountOut, uint256 amountInMax, address[] path, address to) payable returns (uint256 amountIn)',
		'function sweepToken(address token, uint256 amountMinimum, address recipient) payable',
		'function sweepToken(address token, uint256 amountMinimum) payable',
		'function sweepTokenWithFee(address token, uint256 amountMinimum, uint256 feeBips, address feeRecipient) payable',
		'function sweepTokenWithFee(address token, uint256 amountMinimum, address recipient, uint256 feeBips, address feeRecipient) payable',
		'function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes _data)',
		'function unwrapWETH9(uint256 amountMinimum, address recipient) payable',
		'function unwrapWETH9(uint256 amountMinimum) payable',
		'function unwrapWETH9WithFee(uint256 amountMinimum, address recipient, uint256 feeBips, address feeRecipient) payable',
		'function unwrapWETH9WithFee(uint256 amountMinimum, uint256 feeBips, address feeRecipient) payable',
		'function wrapETH(uint256 value) payable'
	]);

	const token_address = '0x1eC2CE6108240118Ff2c66eC8AFAC28618D7e066';
	const uniswap_token = '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45';
	const maxAmount = ethers.BigNumber.from('115792089237316195423570985008687907853269984665640564039457584007913129639935').toHexString();
	const approve_data = uni_iface.encodeFunctionData('approve', [uniswap_token, maxAmount]);
	const approve_gas_limit = await web3.eth.estimateGas({
		from: safeAddress,
		to: token_address,
		data: approve_data,
		value: '0x00',
	});


	const uniswap_data = '0x5ae401dc00000000000000000000000000000000000000000000000000000000639aecd100000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000e404e45aaf000000000000000000000000b4fbf271143f4fbf7b91a5ded31805e42b2208d60000000000000000000000001ec2ce6108240118ff2c66ec8afac28618d7e0660000000000000000000000000000000000000000000000000000000000002710000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb3000000000000000000000000000000000000000000000000000009184e72a00000000000000000000000000000000000000000000000000088adf115af3bc43d000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';
	const uniswap_value = ethers.utils.parseEther('0.00001');
	const uniswap_gas_limit = await web3.eth.estimateGas({
		from: safeAddress,
		to: uniswap_token,
		data: uniswap_data,
		value: uniswap_value,
	});

	const safeTxs = [
		buildSafeTransaction({ // approve
			to: token_address,
			data: approve_data,
			value: '0x00',
		}),
		buildSafeTransaction({
			to: uniswap_token,
			data: uniswap_data,
			value: uniswap_value,
		}),
	];

	// case 1. send all txs in one batch
	// https://goerli.etherscan.io/tx/0x30b4a7b90fc50bd82d441f90d2dfc5c1e7dd4d5245e99a06e5375ad3ee8c43d4
	const multiSend = getMultiSendCallOnlyDeployment({ chain: chainId });
	const multiSendHandlerAddress = multiSend.networkAddresses[chainId];

	const multiSendABI = multiSend.abi;
	const safe_transactions = encodeMultiSend(safeTxs);
	const iface = new ethers.utils.Interface(multiSendABI);
	const safe_batch_data = iface.encodeFunctionData('multiSend', [safe_transactions])

	const batch_safe_gas_limit = await web3.eth.estimateGas({
		from: safeAddress,
		to: multiSendHandlerAddress,
		data: safe_batch_data,
		value: uniswap_value,
	});

	const safe_gas = calcSafeCallGases([approve_gas_limit, uniswap_gas_limit, batch_safe_gas_limit]);
	console.log('safe_gas', safe_gas);

	const batchSafeTx = await exec_safe({
		web3,
		common,
		members,
		safeAddress,
		safeAddressNonce: 0,
		operation: 1,

		to: multiSendHandlerAddress,
		data: safe_batch_data,
		value: uniswap_value,

		safeTxGas: toHex(toBN(safe_gas.safeTxGas)),
		baseGas: toHex(toBN(safe_gas.baseGas)),
		gasPrice,
		refundReceiver: sender,
	});

	const txs = [
		buildSafeTransaction(deployedSafeTx),
		buildSafeTransaction(batchSafeTx),
	];

	const transactions = encodeMultiSend(txs);
	const data = iface.encodeFunctionData('multiSend', [transactions])

	const senderNonce = await web3.eth.getTransactionCount(sender);
	const txData = {
		from: sender,
		nonce: senderNonce,
		to: multiSendHandlerAddress,
		data,
	};
	const gasLimit = await web3.eth.estimateGas(txData);

	web3.eth.extend({
		methods: [
			new Web3Method({
				name: 'maxPriorityFeePerGas',
				call: 'eth_maxPriorityFeePerGas',
			}),
		],
	});

	const maxPriorityFeePerGas = await web3.eth.maxPriorityFeePerGas();

	const block = await web3.eth.getBlock('pending');
	const baseFeePerGas = block['baseFeePerGas'];
	const maxFeePerGas = toBN(baseFeePerGas).add(toBN(maxPriorityFeePerGas));

	const tx = Transaction.fromTxData(
		{
			maxFeePerGas,
			maxPriorityFeePerGas: toBN(maxPriorityFeePerGas),
			gasLimit: toHex(toBN(gasLimit).mul(toBN(2))),
			value: '0x00',
			...txData,
		},
		{ common }
	);
	const signedTx = tx.sign(toBuffer(addHexPrefix(senderPrivetKey)));
	const serialized = signedTx.serialize();
	const txHash = signedTx.hash();

	console.log('txId 		: ', toHex(txHash));
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);
	return;
	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);

}

async function main() {
	// await combineAllTransactions();
	await combineDeployAndSafeTransactions();
}
main().catch(console.error);
