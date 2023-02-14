const { utils, ethers } = require('ethers');

const abi = [
	'function batchTransfer(tuple(address to, uint256 amount)[] eths, tuple(address tokenAddr, address to, uint256 amount)[] erc20s, tuple(address tokenAddr, address to, uint256 tokenId)[] erc721s, tuple(address tokenAddr, address to, uint256[] ids, uint256[] amounts)[] erc1155s) payable',
	'function approve(address _spender, uint256 _value) returns (bool)',
];

const iface = new utils.Interface(abi);

function buildApproveRequest({ tokenAddress, aggregatorAddress, erc20s }) {
	const amount = erc20s.map((erc20) => erc20.amount).reduce((a, b) => a.add(b), ethers.BigNumber.from(0));
	const data = iface.encodeFunctionData('approve', [aggregatorAddress, amount]);
	return {
		to: tokenAddress,
		data,
	}
}

function buildBatchTransferRequest({ aggregatorAddress, eths, erc20s }) {
	const data = iface.encodeFunctionData('batchTransfer', [eths.map((eth) => [eth.to, eth.amount]), erc20s.map((erc20) => [erc20.tokenAddress, erc20.to, erc20.amount]), [], []]);
	const value = eths.map((eth) => eth.amount).reduce((a, b) => a.add(b), ethers.BigNumber.from(0));
	return {
		to: aggregatorAddress,
		data,
		value
	}
}

async function main() {
	const chainId = 5;
	const endpoint = 'https://goerli.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
	const provider = new ethers.providers.JsonRpcProvider(endpoint);
	const aggregatorAddress = '0xDC09ac5867BFFc70c01ff50362Ab1d7F27D40B97';

	const sender = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
	const senderPrivetKey = '';

	const tokenAddress = '0x1eC2CE6108240118Ff2c66eC8AFAC28618D7e066';

	const eths = [
		{
			amount: ethers.utils.parseEther('0.1').toString(),
			to: '0xFe7b59Eb9cFB13fb024efD08759Ce4f588CA7363',
		},
		{
			amount: ethers.utils.parseEther('0.2').toString(),
			to: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
		}
	];

	const erc20s = [
		{
			tokenAddress,
			amount: ethers.utils.parseEther('0.1').toString(),
			to: '0xFe7b59Eb9cFB13fb024efD08759Ce4f588CA7363',
		},
		{
			tokenAddress,
			amount: ethers.utils.parseEther('0.2').toString(),
			to: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
		}];


	// const request = buildApproveRequest({ tokenAddress, aggregatorAddress, erc20s, eths });
	const request = buildBatchTransferRequest({ aggregatorAddress, erc20s, eths });

	const { maxPriorityFeePerGas, gasPrice } = await provider.getFeeData();
	const senderNonce = await provider.getTransactionCount(sender);

	const block = await provider.getBlock('pending');
	const baseFeePerGas = block['baseFeePerGas'];
	const maxFeePerGas = baseFeePerGas.add(maxPriorityFeePerGas).toHexString();
	const transaction = {
		chainId,

		...request,

		from: sender,
		nonce: senderNonce,
	}
	const gas = await provider.estimateGas(transaction);

	const unsignedTransaction = {

		...transaction,

		type: 2,
		gasLimit: gas,
		maxFeePerGas,
		maxPriorityFeePerGas,
	};

	const serializedUnsignedTransaction = utils.serializeTransaction(unsignedTransaction);
	const serializedUnsignedHash = utils.keccak256(serializedUnsignedTransaction);
	const serializedUnsignedHashBytes = utils.arrayify(serializedUnsignedHash);
	const signingKey = new utils.SigningKey(senderPrivetKey);
	const signature = signingKey.signDigest(serializedUnsignedHashBytes);

	const serializedTransaction = utils.serializeTransaction(unsignedTransaction, signature);
	const TransactionHash = utils.keccak256(serializedTransaction);
	console.log('TransactionHash : ', TransactionHash);
	// return;
	const { hash } = await provider.sendTransaction(serializedTransaction);
	console.log('hash : ', hash);
	return;
}

main().catch(console.error);