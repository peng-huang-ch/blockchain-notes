const { utils } = require('ethers');
var data = '0xedbdf5e2000000000000000000000000edf0c420bc3b92b961c6ec411cc810ca81f5f21a000000000000000000000000d383acf980b70855ab0c2c4af0adaa520e39bcb3000000000000000000000000000000000000000000000000a688906bd8b000000000000000000000000000000000000000000000000000000000000000000089';
var iface = new utils.Interface([
	'function anySwapOutUnderlying(address token, address to, uint256 amount, uint256 toChainID)',
	'function transfer(address recipient, uint256 amount)'
]);

var input = iface.decodeFunctionData('anySwapOutUnderlying', data);
console.log('input : ', input);

var iface = new utils.Interface([
	'function anySwapOutUnderlying(anyToken,toAddress,amount,toChainID)',
]);
var anyToken = '0xEDF0c420bc3b92B961C6eC411cc810CA81F5F21a';
var toAddress = '0xD383ACF980b70855AB0C2c4AF0Adaa520E39Bcb3';
var amount = '0xa688906bd8b00000';
var toChainID = '0x89';
var data = [anyToken, toAddress, amount, toChainID];
var input = iface.encodeFunctionData('anySwapOutUnderlying', data);
console.log('input : ', input);