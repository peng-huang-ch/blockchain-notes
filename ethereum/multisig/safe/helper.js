const { utils, Contract, providers } = require('ethers');

const abi = [
	'function multiSend(bytes transactions) payable',
	'function name() view returns (string)',
	'function approve(address _spender, uint256 _value) returns (bool)',
	'function totalSupply() view returns (uint256)',
	'function transferFrom(address _from, address _to, uint256 _value) returns (bool)',
	'function decimals() view returns (uint8)',
	'function transferAndCall(address _to, uint256 _value, bytes _data) returns (bool success)',
	'function decreaseApproval(address _spender, uint256 _subtractedValue) returns (bool success)',
	'function balanceOf(address _owner) view returns (uint256 balance)',
	'function symbol() view returns (string)',
	'function transfer(address _to, uint256 _value) returns (bool success)',
	'function increaseApproval(address _spender, uint256 _addedValue) returns (bool success)',
	'function allowance(address _owner, address _spender) view returns (uint256 remaining)',
	// safe
	'function addOwnerWithThreshold(address owner, uint256 _threshold)',
	'function approveHash(bytes32 hashToApprove)',
	'function approvedHashes(address, bytes32) view returns (uint256)',
	'function changeThreshold(uint256 _threshold)',
	'function checkNSignatures(bytes32 dataHash, bytes data, bytes signatures, uint256 requiredSignatures) view',
	'function checkSignatures(bytes32 dataHash, bytes data, bytes signatures) view',
	'function disableModule(address prevModule, address module)',
	'function domainSeparator() view returns (bytes32)',
	'function enableModule(address module)',
	'function encodeTransactionData(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes)',
	'function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, bytes signatures) payable returns (bool success)',
	'function execTransactionFromModule(address to, uint256 value, bytes data, uint8 operation) returns (bool success)',
	'function execTransactionFromModuleReturnData(address to, uint256 value, bytes data, uint8 operation) returns (bool success, bytes returnData)',
	'function getChainId() view returns (uint256)',
	'function getModulesPaginated(address start, uint256 pageSize) view returns (address[] array, address next)',
	'function getOwners() view returns (address[])',
	'function getStorageAt(uint256 offset, uint256 length) view returns (bytes)',
	'function getThreshold() view returns (uint256)',
	'function getTransactionHash(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
	'function isModuleEnabled(address module) view returns (bool)',
	'function isOwner(address owner) view returns (bool)',
	'function nonce() view returns (uint256)',
	'function removeOwner(address prevOwner, address owner, uint256 _threshold)',
	'function requiredTxGas(address to, uint256 value, bytes data, uint8 operation) returns (uint256)',
	'function setFallbackHandler(address handler)',
	'function setGuard(address guard)',
	'function setup(address[] _owners, uint256 _threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)',
	'function signedMessages(bytes32) view returns (uint256)',
	'function simulateAndRevert(address targetContract, bytes calldataPayload)',
	'function swapOwner(address prevOwner, address oldOwner, address newOwner)'
]

const iface = new utils.Interface(abi);
const format = iface.format(utils.FormatTypes.full)
// console.log('format : ', format)
// var data = iface.decodeFunctionData("multiSend", "0x8d80ff0a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001320001be23585060835e02b77ef475b0cc51aa1e070900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb30000000000000000000000000000000000000000000000008ac7230489e800000001be23585060835e02b77ef475b0cc51aa1e070900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000000495ee61a6c19494aa18326d08a961c446423ca2000000000000000000000000000000000000000000000000000000174876e8000000000000000000000000000000")
// console.log('data 	: ', data);
// return;
// 0x8d80ff0a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001320001be23585060835e02b77ef475b0cc51aa1e070900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb30000000000000000000000000000000000000000000000008ac7230489e800000001be23585060835e02b77ef475b0cc51aa1e070900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000000495ee61a6c19494aa18326d08a961c446423ca2000000000000000000000000000000000000000000000000000000174876e8000000000000000000000000000000
// 0x8d80ff0a000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000001320001be23585060835e02b77ef475b0cc51aa1e070900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb30000000000000000000000000000000000000000000000008ac7230489e800000001be23585060835e02b77ef475b0cc51aa1e070900000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000044a9059cbb0000000000000000000000000495ee61a6c19494aa18326d08a961c446423ca2000000000000000000000000000000000000000000000000000000174876e8000000000000000000000000000000
// a9059cbb000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb30000000000000000000000000000000000000000000000008ac7230489e80000
// a9059cbb0000000000000000000000000495ee61a6c19494aa18326d08a961c446423ca2000000000000000000000000000000000000000000000000000000174876e800
// var data = iface.encodeFunctionData("transfer", ["0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3", BigNumber.from('10000000000000000000')])
// console.log('data 	: ', data);
// var data = iface.encodeFunctionData("transfer", ["0x0495EE61A6c19494Aa18326d08A961c446423cA2", BigNumber.from('100000000000')])
// console.log('data 	: ', data);

var data = iface.decodeFunctionData("swapOwner", '0xe318b52b000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb30000000000000000000000000495ee61a6c19494aa18326d08a961c446423ca2000000000000000000000000e6bac7d1b67690019dc33fc29f9f156aea6894b2')
console.log('data 	: ', data);
return;
iface.encodeFunctionData("getOwners");
const address = '0xdbc2aeea2eea239dce1d0762490fe8718396f8dd'
const node = 'https://rinkeby.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
const provider = new providers.JsonRpcProvider(node)
const contract = new Contract(address, abi, provider);

async function main() {
	const owner = await contract.getOwners();
	console.log('owner : ', owner);
}

main().catch(console.error);