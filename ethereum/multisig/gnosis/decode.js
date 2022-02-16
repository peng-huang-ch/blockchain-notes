const { getSafeSingletonDeployment, getProxyFactoryDeployment } = require('@gnosis.pm/safe-deployments');
const abiDecoder = require('abi-decoder');
const { abi } = getSafeSingletonDeployment();
console.log('abi : ', abi);
abiDecoder.addABI(abi);
console.log('abiDecoder', abiDecoder.getMethodIDs());
