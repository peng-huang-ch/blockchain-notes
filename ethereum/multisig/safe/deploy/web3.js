const Web3 = require('web3');
const { ethers } = require("ethers");
const { TransactionFactory: Transaction } = require('@ethereumjs/tx');
const { default: Common, Hardfork, CustomChain } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getCompatibilityFallbackHandlerDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { bufferToHex, toBuffer } = require('ethereumjs-util');
const { sendTx } = require('../gnosis');
const { Chain } = require('@ethereumjs/common');
const { addHexPrefix } = require('ethereumjs-util');

async function deploy({
	chainId,
	node,
	sender,
	privateKey,
	common
}) {
	const web3 = new Web3(node);
	const provider = new ethers.getDefaultProvider(node, {
		chainId,
	});
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
	const threshold = 2;
	const owners = ['0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3', '0x0495EE61A6c19494Aa18326d08A961c446423cA2'];
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

	var saltNonce = Date.now();

	const proxyFactoryContract = new Contract(proxyFactoryABI, proxyFactoryAddress);
	proxyFactoryContract.setProvider(web3.currentProvider);

	const input = proxyFactoryContract.methods.createProxyWithNonce(safeSingletonAddress, initializer, saltNonce).encodeABI();

	// const nonce = await web3.eth.getTransactionCount(sender);
	const nonce = await provider.getTransactionCount(sender, 'pending');
	console.log('sender : ', sender);
	console.log('nonce : ', nonce);
	const opts = { common };
	const { maxFeePerGas, maxPriorityFeePerGas, gasPrice } = await provider.getFeeData();
	// const { gasPrice } = await provider.getFeeData();
	const block = await provider.getBlock('latest');
	// const maxPriorityFeePerGas = ethers.BigNumber.from("30000000000");
	// const maxFeePerGas = block.baseFeePerGas.mul(2).add(maxPriorityFeePerGas);

	console.log('maxFeePerGas : ', maxFeePerGas.toString());
	console.log('maxPriorityFeePerGas : ', maxPriorityFeePerGas.toString());
	const gasLimit = await web3.eth.estimateGas({
		from: sender,
		nonce,
		data: input,
		to: proxyFactoryAddress,
		value: '0x00',
	});

	const typed = Transaction.fromTxData(
		{
			maxFeePerGas: maxFeePerGas.toHexString(),
			maxPriorityFeePerGas: maxPriorityFeePerGas.toHexString(),
			to: proxyFactoryAddress,
			data: input,
			value: '0x00',
			nonce: toHex(toBN(nonce)),
			gasLimit: toHex(toBN(gasLimit)),
			type: 0x2,
		},
		opts
	);

	console.log('privateKey :', privateKey)
	const tx = typed.sign(toBuffer(privateKey));
	const serialized = tx.serialize();
	const txId = tx.hash().toString('hex');
	console.log('txId 		: ', txId);
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);

	console.log('safeSingletonAddress 	: ', safeSingletonAddress);
	console.log('proxyFactoryAddress 	: ', proxyFactoryAddress);

	var creationCode = await proxyFactoryContract.methods.proxyCreationCode().call();
	const deploymentCode = ethers.utils.solidityPack(["bytes", "uint256"], [creationCode, safeSingletonAddress])

	var salt = ethers.utils.solidityKeccak256(
		["bytes32", "uint256"],
		[ethers.utils.solidityKeccak256(["bytes"], [initializer]), saltNonce]
	)
	var address = ethers.utils.getCreate2Address(proxyFactoryAddress, salt, ethers.utils.keccak256(deploymentCode))
	console.log('address 	: ', address);
	// return;
	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}

// const node = 'https://polygon-rpc.com';
const node = 'https://goerli.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
const chainId = Chain.Goerli;
// const common = Common.custom(chainId, { eips: [1559], hardfork: Hardfork.London });
const common = new Common({ chain: Chain.Goerli, hardfork: Hardfork.London, eips: [3860] })
const sender = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
const privateKey = '';

deploy({
	node,
	chainId,
	common,
	sender,
	privateKey: addHexPrefix(privateKey),
}).catch(console.error);
