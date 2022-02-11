const Web3 = require('web3');
const { ethers } = require("ethers");
const { FeeMarketEIP1559Transaction: Transaction } = require('@ethereumjs/tx');
const { default: Common, Chain, Hardfork } = require('@ethereumjs/common');
const { getSafeSingletonDeployment, getProxyFactoryDeployment, getCompatibilityFallbackHandlerDeployment } = require('@gnosis.pm/safe-deployments');
const Contract = require('web3-eth-contract');
const { toBN, toHex } = require('web3-utils');
const { bufferToHex, toBuffer } = require('ethereumjs-util');
const { sendTx } = require('./gnosis');

async function deploy({
	web3,
	sender,
	privateKey
}) {
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
	const threshold = 1;
	const owners = ['0x0d5a689d6a973e945cbbfab37202a1788e5588e7', '0xe6bac7d1b67690019dc33fc29f9f156aea6894b2'];
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
	const inititalizer = safeSingletonContract.methods.setup(...params).encodeABI();

	var saltNonce = Date.now();

	const proxyFactoryContract = new Contract(proxyFactoryABI, proxyFactoryAddress);
	proxyFactoryContract.setProvider(web3.currentProvider);

	const input = proxyFactoryContract.methods.createProxyWithNonce(safeSingletonAddress, inititalizer, saltNonce).encodeABI();

	const gasLimit = '0x8b8d0';
	const common = new Common({ chain: Chain.Rinkeby, hardfork: Hardfork.London });
	const nonce = await web3.eth.getTransactionCount(sender);
	const opts = { common };
	const tx = Transaction.fromTxData(
		{
			maxFeePerGas: '0x9af8da00',
			maxPriorityFeePerGas: '0x9502f900',
			to: proxyFactoryAddress,
			data: input,
			value: '0x00',
			nonce: toHex(toBN(nonce)),
			gasLimit: toHex(toBN(gasLimit)),
		},
		opts
	);
	const signedTx = tx.sign(toBuffer(privateKey));
	const serialized = signedTx.serialize();
	const txid = signedTx.hash().toString('hex');
	console.log('txid 		: ', txid);
	console.log('serialized : ', bufferToHex(serialized));
	console.log('sender 	: ', sender);

	console.log('safeSingletonAddress 	: ', safeSingletonAddress);
	console.log('proxyFactoryAddress 	: ', proxyFactoryAddress);

	var creationCode = await proxyFactoryContract.methods.proxyCreationCode().call();
	const deploymentCode = ethers.utils.solidityPack(["bytes", "uint256"], [creationCode, safeSingletonAddress])

	var salt = ethers.utils.solidityKeccak256(
		["bytes32", "uint256"],
		[ethers.utils.solidityKeccak256(["bytes"], [inititalizer]), saltNonce]
	)
	var address = ethers.utils.getCreate2Address(proxyFactoryAddress, salt, ethers.utils.keccak256(deploymentCode))
	console.log('address 				: ', address);

	const hash = await sendTx(web3, bufferToHex(serialized));
	console.log('hash', hash);
}


deploy({
	web3,
	sender,
	privateKey
}).catch(console.error);
