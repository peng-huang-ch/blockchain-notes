const axios = require('axios');
const { Seed, WalletServer } = require('cardano-wallet-js');

async function main() {
  // let walletServer = WalletServer.init('https://mainnet-prod.invault.space/ada');
  // let information = await walletServer.getNetworkInformation();
  // console.log(information);

  // let recoveryPhrase = Seed.generateRecoveryPhrase();
  // console.log('recoveryPhrase: ', recoveryPhrase);
  // let mnemonic_sentence = Seed.toMnemonicList(recoveryPhrase);
  // let passphrase = 'tangocrypto';
  // let name = 'namet';

  const buffer = Buffer.from(
    '83a40081825820c8de66af0bf0c252d4275d22220fce8494575d2af66da1a1923724fa7061c77100018182582b82d818582183581c178f29d9719a2c47221a8d3ba70019b20e210d95ca8b4ef646036469a0001a04bbf5fd1a0016e360021a000505be031a02736791a10281845820a0ac3029969fea162b505da02d4f806e4edc3a5d5d9d4df187b94675b879bc825840bd93f1fa0bcb920c592fd4ad993a0b80b54d5ef350440e9c6a365899ec185520d15e1d24a5b3fde25094913a3a392b0a28f8ec261e60d8acb343ebf5ea30ca075820000000000000000000000000000000000000000000000000000000000000000041a0f6',
    'hex'
  );
  const response = await axios({
    headers: {
      'Content-Type': 'application/cbor',
    },
    method: 'post',
    url: 'https://submit-api.testnet.dandelion.link/api/submit/tx',
    data: buffer,
  });
  console.log(response);
  return;
}

main().catch(console.error);
