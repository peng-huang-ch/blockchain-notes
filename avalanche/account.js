const { Mnemonic } = require('avalanche');
const mnemonic = Mnemonic.getInstance();
const strength = 256;
const wordlist = mnemonic.getWordlists('english');
var m = mnemonic.generateMnemonic(strength);
// juice garden awake mask festival blanket benefit pelican mimic stuff clay edge ten view easy hungry buffalo become exclude salon bamboo inflict fault tiny
// console.log(m);

var m = 'juice garden awake mask festival blanket benefit pelican mimic stuff clay edge ten view easy hungry buffalo become exclude salon bamboo inflict fault tiny';
const { HDNode, Avalanche } = require('avalanche');
const seed = mnemonic.mnemonicToSeedSync(m);
const hdnode = new HDNode(seed);

const ip = 'api.avax-test.network';
const port = 9644350;
const protocol = 'https';
const networkID = 5;
const avalanche = new Avalanche(ip, port, protocol, networkID);

const xchain = avalanche.XChain(); //returns a reference to the X-Chain used by AvalancheJS
const keychain = xchain.keyChain();

for (let i = 0; i <= 0; i++) {
  // Deriving the _i_th external BIP44 X-Chain address
  const child = hdnode.derive(`m/44'/9000'/0'/0/${i}`);
  console.log('child.privateKeyCB58', child.privateKeyCB58);
  console.log('child.privateKey', child.privateKey.toString('hex'));
  console.log('child.publicKey', child.publicKey.toString('hex'));
  keychain.importKey(child.privateKeyCB58);
}

const xAddressStrings = xchain.keyChain().getAddressStrings();
console.log(xAddressStrings);
// [
//   'X-fuji1cfvdpdqyzpp8pq0g6trmjsrn9pt8nutsfm7a40',
//   'X-fuji1y75dj6qygj7frw2xtcfn724qfty4aadnmeth6y',
//   'X-fuji1p6n0vyjqgmp06f7pr405q2flqu9v93j383ncam'
// ]
