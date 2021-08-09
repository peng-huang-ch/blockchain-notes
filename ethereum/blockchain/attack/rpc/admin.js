const { request } = require('./request');

// https://geth.ethereum.org/docs/rpc/ns-admin#admin_addpeer
async function admin_addPeer(uri, peer) {
  return request(uri, 'admin_addPeer', [peer]);
}

async function admin_removePeer(uri, peer) {
  return request(uri, 'admin_removePeer', [peer]);
}

async function admin_nodeInfo(uri) {
  return request(uri, 'admin_nodeInfo');
}

async function admin_peers(uri) {
  return request(uri, 'admin_peers');
}

exports.admin_addPeer = admin_addPeer;
exports.admin_removePeer = admin_removePeer;
exports.admin_peers = admin_peers;
exports.admin_nodeInfo = admin_nodeInfo;
