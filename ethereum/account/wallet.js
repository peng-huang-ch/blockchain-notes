const ethers = require('ethers');

async function main() {
	// const wallet = ethers.Wallet.createRandom();
	const wallet = new ethers.Wallet('0ca66830d3b2f803e01916e9c3c364493bf3eff4601d52b1cd26dcff06dda18b');
	console.log('address     : ', await wallet.getAddress());
	console.log('public	 key : ', wallet.publicKey);
	console.log('compressed  : ', ethers.utils.computePublicKey(wallet.publicKey, true));
	console.log('private key : ', wallet.privateKey);
}
main().catch(console.error);

