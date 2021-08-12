const shell = require('shelljs');
const { personal_listAccounts, personal_importRawKey, personal_unlockAccount } = require('./rpc/personal');
const { miner_start, miner_stop } = require('./rpc/miner');
const { admin_nodeInfo, admin_addPeer, admin_removePeer, admin_peers } = require('./rpc/admin');
const { eth_getTransactionCount, eth_signTransaction } = require('./rpc/eth');
const { ACCOUNTS, PASS } = process.env;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function importRawKeys(uri) {
  let accounts = await personal_listAccounts(uri);
  if (Array.isArray(accounts) && accounts.length) return accounts;
  accounts = ACCOUNTS.split(' ');
  for (let account of accounts) {
    await personal_importRawKey(uri, account, PASS);
  }
  return accounts;
}

async function getServerIP(server) {
  return shell.exec(`docker inspect -f '{{range.NetworkSettings.Networks}}{{.IPAddress}}{{end}}' ${server}`, { silent: true }).stdout;
}

async function signTransaction({ uri, from, to, gasPrice, gas, value, nonce }) {
  gasPrice = gasPrice || '0x9184e72a000';
  gas = gas || '0x76c0';
  value = value || '10000000000';
  value = '0x' + parseInt(value).toString(16);
  const tx = { from, to, gasPrice, gas, value, nonce };
  console.log('tx', tx);
  return eth_signTransaction(uri, tx);
}

async function double() {
  // 1. imports raw keys
  const bootstrap_uri = 'http://127.0.0.1:8545/';
  const eth_uri = 'http://127.0.0.1:18545/';

  const nonce = await eth_getTransactionCount(eth_uri, '');
  console.log('nonce', nonce);

  await importRawKeys(bootstrap_uri);
  await importRawKeys(eth_uri);

  console.log(await personal_listAccounts(eth_uri));
  console.log(await personal_listAccounts(bootstrap_uri));

  // 2. add peers
  const { enode } = await admin_nodeInfo(bootstrap_uri);
  const ip = await getServerIP('bootstrap');
  console.log(ip);
  const peer = enode.replace('127.0.0.1', ip.replace('\n', ''));

  // 3. add peer
  await admin_addPeer(eth_uri, peer);
  const peers = await admin_peers(eth_uri);
  const enodes = peers.map((peer) => peer.enode);

  // 4. miner start
  await miner_start(eth_uri);
  await miner_start(bootstrap_uri);

  // await sleep(3 * 1000);

  // 5. remove peers
  for (var i = 0; i < enodes.length; i += 1) {
    await admin_removePeer(eth_uri, enodes[i]);
  }
  // await sleep(1 * 1000);

  // 6 unlock account
  const accounts = await personal_listAccounts(eth_uri);
  const from = accounts[0];
  console.log('from  : ', from);
  await personal_unlockAccount(eth_uri, from, PASS);

  // 7. signTransaction
  const to = accounts[1];
  const value = '10000000000000000';
  const nonce = await eth_getTransactionCount(eth_uri, from);
  console.log('nonce', nonce);
  const raw = await signTransaction({
    uri: eth_uri,
    from,
    to,
    value,
    nonce,
  });
  console.log(raw);

  //
}

double('bootstrap').catch(console.error);
