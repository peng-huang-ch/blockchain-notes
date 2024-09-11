// https://gist.github.com/jimpick/0b00bcd0a618238f3fe3ff89f9ac800c

// TODO
const { LotusRPC } = require('@filecoin-shipyard/lotus-client-rpc');
const { NodejsProvider } = require('@filecoin-shipyard/lotus-client-provider-nodejs');
const { mainnet } = require('@filecoin-shipyard/lotus-client-schema');

const url = 'wss://lotus.testground.ipfs.team/api/0/node/rpc/v0';
const provider = new NodejsProvider(url);
const client = new LotusRPC(provider, { schema: mainnet.fullNode });

async function main() {
  try {
    const version = await client.version();
    console.log('Version', version);
  } catch (e) {
    console.error('client.version error', e);
  }
  await client.destroy();
}

main().then().catch(console.error);
