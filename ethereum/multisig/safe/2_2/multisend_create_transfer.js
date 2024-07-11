const { getNetwork } = require('@ethersproject/networks');
const { ethers } = require('ethers');
const {
  getSafeSingletonDeployment,
  getProxyFactoryDeployment,
  getCompatibilityFallbackHandlerDeployment,
  getMultiSendCallOnlyDeployment,
} = require('@gnosis.pm/safe-deployments');
const { stripHexPrefix } = require('ethjs-util');
const { buildSignatureBytes, buildSafeTransaction, signTypedData, safeApproveHash, encodeMultiSend } = require('../gnosis');

async function deploySafeTx({ chainId, endpoint, owners, threshold }) {
  const network = getNetwork(chainId);
  const provider = new ethers.providers.StaticJsonRpcProvider(endpoint, network);
  const version = '1.3.0';
  const safeSingleton = getSafeSingletonDeployment({ version });
  const safeSingletonAddress = safeSingleton.networkAddresses[chainId];
  const safeSingletonABI = safeSingleton.abi;

  const proxyFactory = getProxyFactoryDeployment();
  const proxyFactoryABI = proxyFactory.abi;
  const proxyFactoryAddress = proxyFactory.networkAddresses[chainId];

  const compatHandler = getCompatibilityFallbackHandlerDeployment();
  const compatHandlerAddress = compatHandler.networkAddresses[chainId];

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const params = [
    owners,
    threshold,
    ZERO_ADDRESS,
    '0x',
    compatHandlerAddress, // fallback handler
    ZERO_ADDRESS,
    0,
    ZERO_ADDRESS,
  ];

  const safeSingletonIface = new ethers.utils.Interface(safeSingletonABI);
  const initializer = safeSingletonIface.encodeFunctionData('setup', params);
  const saltNonce = 1672532 || Date.now();

  const proxyFactoryContract = new ethers.Contract(proxyFactoryAddress, proxyFactoryABI, provider);
  const creationCode = await proxyFactoryContract.proxyCreationCode();
  const deploymentCode = ethers.utils.solidityPack(['bytes', 'uint256'], [creationCode, safeSingletonAddress]);
  // createProxyWithNonce
  const input = proxyFactoryContract.interface.encodeFunctionData('createProxyWithNonce', [safeSingletonAddress, initializer, saltNonce]);

  var salt = ethers.utils.solidityKeccak256(['bytes32', 'uint256'], [ethers.utils.solidityKeccak256(['bytes'], [initializer]), saltNonce]);
  var safeAddress = ethers.utils.getCreate2Address(proxyFactoryAddress, salt, ethers.utils.keccak256(deploymentCode));

  const safeTx = buildSafeTransaction({
    data: input,
    to: proxyFactoryAddress,
    value: '0x00',
  });
  return { safeAddress, safeTx };
}

// 2-2. sign
async function signSafeTransaction({ chainId, provider, members, safeAddress, operation, to, data, value, nonce }) {
  const safeSingleton = getSafeSingletonDeployment({ chain: chainId });

  const safeSingletonABI = safeSingleton.abi;
  var participants = [];

  const safeContract = new ethers.Contract(safeAddress, safeSingletonABI, provider);
  // var safeContractNonce = await safeContract.methods.nonce().call();

  const safeTx = buildSafeTransaction({
    operation,
    to,
    data,
    value,
    nonce,
  });

  const domain = { verifyingContract: safeAddress, chainId };
  for (const item of members) {
    var approverData = await signTypedData(item.privateKey, domain, safeTx);
    participants.push({
      signer: item.address,
      data: approverData,
    });
  }

  var signatures = buildSignatureBytes(participants);

  const params = [
    safeTx.to,
    safeTx.value, // value
    safeTx.data, // data
    safeTx.operation, // operation
    safeTx.safeTxGas, // safeTxGas
    safeTx.baseGas, // dataGas
    safeTx.gasPrice, // gasPrice
    safeTx.gasToken, // gasToken
    safeTx.refundReceiver, // refundReceiver
    signatures,
  ];

  const safeSingletonIface = new ethers.utils.Interface(safeSingletonABI);
  var input = safeSingletonIface.encodeFunctionData('execTransaction', params);

  return buildSafeTransaction({
    data: input,
    to: safeAddress,
    value: '0x00',
  });
}

// 2-2. native coin
async function exec_eth({ chainId, provider, members, safeAddress, receiptor, data }) {
  const safeSingleton = getSafeSingletonDeployment({ chain: chainId });

  const safeSingletonABI = safeSingleton.abi;
  var participants = [];

  const safeContract = new ethers.Contract(safeAddress, safeSingletonABI, provider);
  var safeContractNonce = await safeContract.methods.nonce().call();

  const safeTx = buildSafeTransaction({
    to: receiptor,
    data: data,
    // value: amount,
    nonce: safeContractNonce,
  });

  const domain = { verifyingContract: safeAddress, chainId };
  for (const item of members) {
    var approverData = await signTypedData(item.privateKey, domain, safeTx);
    participants.push({
      signer: item.address,
      data: approverData,
    });
  }

  var signatures = buildSignatureBytes(participants);

  console.log('signatures : ', signatures);
  console.log('receiptor : ', receiptor);

  const params = [
    safeTx.to,
    safeTx.value, // value
    safeTx.data, // data
    safeTx.operation, // operation
    safeTx.safeTxGas, // safeTxGas
    safeTx.baseGas, // dataGas
    safeTx.gasPrice, // gasPrice
    safeTx.gasToken, // gasToken
    safeTx.refundReceiver, // refundReceiver
    signatures,
  ];

  const safeSingletonIface = new ethers.utils.Interface(safeSingletonABI);
  var input = safeSingletonIface.encodeFunctionData('execTransaction', params);

  return buildSafeTransaction({
    data: input,
    to: safeAddress,
    value: '0x00',
  });
}

// 2-2. erc20
async function exec_erc20({ chainId, members, safeAddress, receiptor, tokenAddress }) {
  const safeSingleton = getSafeSingletonDeployment({ chain: chainId });
  const safeSingletonABI = safeSingleton.abi;

  var safeContractNonce = 1;
  var participants = [];

  const quantity = '10000000000000000';

  const raw = '0000000000000000000000000000000000000000000000000000000000000000';
  const amount = stripHexPrefix(ethers.BigNumber.from(quantity).toHexString());

  const data =
    '0xa9059cbb000000000000000000000000' + // token transfer method
    stripHexPrefix(receiptor) + // to address
    raw.substring(0, raw.length - amount.length) + // placeholder
    amount; // amount

  const safeTx = buildSafeTransaction({
    to: tokenAddress,
    data,
    // value: amount,
    nonce: safeContractNonce,
  });

  const domain = { verifyingContract: safeAddress, chainId };
  for (const item of members) {
    var approverData = await signTypedData(item.privateKey, domain, safeTx);
    participants.push({
      signer: item.address,
      data: approverData,
    });
  }

  var signatures = buildSignatureBytes(participants);

  const params = [
    safeTx.to,
    safeTx.value, // value
    safeTx.data, // data
    safeTx.operation, // operation
    safeTx.safeTxGas, // safeTxGas
    safeTx.baseGas, // dataGas
    safeTx.gasPrice, // gasPrice
    safeTx.gasToken, // gasToken
    safeTx.refundReceiver, // refundReceiver
    signatures,
  ];

  const safeSingletonIface = new ethers.utils.Interface(safeSingletonABI);
  var input = safeSingletonIface.encodeFunctionData('execTransaction', params);

  return buildSafeTransaction({
    data: input,
    to: safeAddress,
    value: '0x00',
  });
}

async function main() {
  const chainId = 5;
  const endpoint = 'https://goerli.infura.io/v3/de9290b603fc4609a6f0a65e23e8c7d3';
  const network = getNetwork(chainId);
  const provider = new ethers.providers.StaticJsonRpcProvider(endpoint, network);
  const sender = '0x5c9C3D9D3A500B1594eD66B89c5f7be2a8008051';
  const senderPrivetKey = '';

  const receiptor = '0x5c9C3D9D3A500B1594eD66B89c5f7be2a8008051';

  const members = [
    {
      address: '0x0495EE61A6c19494Aa18326d08A961c446423cA2',
      privateKey: '',
    },
    {
      address: sender,
      privateKey: senderPrivetKey,
    },
  ];

  // https://goerli.etherscan.io/tx/0x77fc4833222de5d23f03e4f1491e23cfa4fdc51725f620f50a3d73a0e1ee4086
  // 1. send eth to a new contract //

  // https://goerli.etherscan.io/tx/0x13d9bfbf5666fa3e591c93f481aea2874e700b04b1958a0494eb117169a69d1e
  // 2.1. deploy the safe contract
  // 2.2. send the tx fee to the relayer
  // const { safeTx: safeDeployTx, safeAddress } = await deploySafeTx({
  // 	chainId,
  // 	endpoint,
  // 	owners: [...members.map((item) => item.address), '0xFe7b59Eb9cFB13fb024efD08759Ce4f588CA7363'],
  // 	threshold: 2,
  // });
  // console.log('safeAddress : ', safeAddress);
  // return;
  const safeAddress = '0x7943E9034A4f2753a4DB454A5BB379520119Fd6B';
  const tokenAddress = '0x1ec2ce6108240118ff2c66ec8afac28618d7e066';
  const safeTransferTx = await exec_erc20({
    chainId,
    provider,
    members,
    tokenAddress: '0x1ec2ce6108240118ff2c66ec8afac28618d7e066',
    receiptor,
    safeAddress,
  });
  const erc20_data =
    '0xa9059cbb0000000000000000000000005c9C3D9D3A500B1594eD66B89c5f7be2a8008051000000000000000000000000000000000000000000000000002386f26fc10000';
  const txs = [
    // buildSafeTransaction(safeDeployTx),
    // buildSafeTransaction(safeTransferTx),
    buildSafeTransaction({ to: tokenAddress, data: erc20_data }),
    buildSafeTransaction({ to: tokenAddress, data: erc20_data }),
  ];
  // return;
  const multiSend = getMultiSendCallOnlyDeployment({ chain: chainId });
  const multiSendHandlerAddress = multiSend.networkAddresses[chainId];

  const multiSendABI = multiSend.abi;
  const transactions = encodeMultiSend(txs);
  const iface = new ethers.utils.Interface(multiSendABI);
  const data = iface.encodeFunctionData('multiSend', [transactions]);

  const safeTx = buildSafeTransaction({
    to: multiSendHandlerAddress,
    data,
    operation: 1,
    nonce: 1,
  });

  const signed = await signSafeTransaction({
    chainId,
    provider,
    members,
    safeAddress,
    ...safeTx,
  });

  // common
  const senderNonce = await provider.getTransactionCount(sender);
  // console.log('senderNonce : ', senderNonce)
  // return;
  const txData = {
    chainId,
    type: 2,
    from: sender,
    nonce: senderNonce,

    to: signed.to,
    data: signed.data,
  };
  const gasLimit = await provider.estimateGas(txData);

  const maxPriorityFeePerGas = await provider.send('eth_maxPriorityFeePerGas', []);

  const block = await provider.getBlock('pending');
  const baseFeePerGas = block['baseFeePerGas'];
  // const maxFeePerGas = baseFeePerGas.add(maxPriorityFeePerGas);
  const maxFeePerGas = ethers.BigNumber.from(baseFeePerGas).add(ethers.BigNumber.from(baseFeePerGas)).sub(36067486); //.add(ethers.BigNumber.from(maxPriorityFeePerGas));
  // console.log('maxFeePerGas : ', maxFeePerGas.toString());
  const unsignedTransaction = {
    maxFeePerGas,
    maxPriorityFeePerGas: ethers.BigNumber.from(maxPriorityFeePerGas).add(36067486),
    gasLimit,
    value: '0x0',
    ...txData,
  };
  console.log('unsignedTransaction : ', unsignedTransaction);
  // console.log('unsignedTransaction : ', unsignedTransaction);
  const message = ethers.utils.keccak256(ethers.utils.serializeTransaction(unsignedTransaction));
  const wallet = new ethers.Wallet(senderPrivetKey);
  const signature = wallet._signingKey().signDigest(ethers.utils.arrayify(message));
  const signedTransaction = ethers.utils.serializeTransaction(unsignedTransaction, signature);
  const txHash = ethers.utils.keccak256(signedTransaction);

  console.log('txId 		: ', txHash);
  console.log('serialized : ', signedTransaction);
  console.log('sender 	: ', sender);
  // return;
  const hash = await provider.sendTransaction(signedTransaction);
  console.log('hash', hash);
}
main().catch(console.error);
