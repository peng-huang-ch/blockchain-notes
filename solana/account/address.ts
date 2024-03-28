import web3 from '@solana/web3.js';
import bs58 from 'bs58';

const keypair = web3.Keypair.generate();
const { publicKey, secretKey } = keypair;

// publicKey base58
console.log(publicKey.toBase58()); // to base58

// secretKey hex
console.log(bs58.encode(secretKey)); // to base58
