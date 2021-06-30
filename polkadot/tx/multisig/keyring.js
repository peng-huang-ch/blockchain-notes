const cloverTypes = require('@clover-network/node-types');
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { formatBalance, u8aToHex, hexToU8a } = require('@polkadot/util');

async function main(signatureHash, extrinsicHex) {
  // await cryptoWaitReady();

  // await cryptoWaitReady();
  const wsProvider = new WsProvider('wss://api.clover.finance');
  //   const wsProvider = new WsProvider('wss://api-ivy-elastic.clover.finance');

  const api = await ApiPromise.create({ provider: wsProvider, types: cloverTypes });

  const PHRASE = 'pledge suit pyramid apple satisfy same sponsor search involve hello crystal grief';

  const AARON = 'traffic wine leader wheat mom device kiwi great horn room remind office';

  const PHCC = 'fall fatal faculty talent bubble enhance burst frame circle school sheriff come';

  // 3. Initialize accounts
  const keyring = new Keyring({ ss58Format: 42, type: 'ecdsa' });
  const alice = keyring.addFromUri(PHRASE + '//polkadot');
  const aaron = keyring.addFromUri(AARON + '//polkadot');
  const phcc = keyring.addFromUri(PHCC + '//polkadot');

  signer = alice;
  console.log('signer address : ', signer.address);
  if (signatureHash) {
    if (!signatureHash.startsWith('0x')) {
      signatureHash = '0x' + signatureHash;
    }
    console.log('signatureHash: ', signatureHash);
    const signature = u8aToHex(signer.sign(hexToU8a(signatureHash), { withType: true }));
    console.log('signature    : ', signature);
  }

  if (extrinsicHex) {
    const txHash = await api.rpc.author.submitExtrinsic(extrinsicHex);
    console.log(`txHash : ${txHash}`);
  }
}
const signatureHash = '1d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a025260000000000ac001100000001000000dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927dd97e5ad3f0015f2dc45c9467b0fd36a2b7f4b9a7bc65e8111d49d6cf19c8927';
const extrinsicHex = '0x55038400f94926205a255a902430e9310edae0455ed368437210c8a481bd93a43fca461202f67142e624cdba0b45420921d871e2aa43edbdb8097026c2839877af1a35ee6c369105498c8433592f63fba9b56fc7a792701be4f28ca430603f4a7acdc4fbca0100ac001d0202000826146dc16221b108d05e7d792e27e3851d15ce1887cf62a9ccea554e43426a53821540197c5fac46ab60c747b3d54f90ed99b216cfc886c789b988ea68ee0aaa00bf13d36031407d5ede1415e0e93e16606fffa0f46b70481aded73627b93465c400a0252600000000';
main(signatureHash, extrinsicHex).then().catch(console.error).finally(process.exit);
