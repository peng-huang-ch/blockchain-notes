var ethers = require('ethers');

const AbiCoder = ethers.utils.AbiCoder;
const ADDRESS_PREFIX_REGEX = /^(41)/;
const ADDRESS_PREFIX = '41';

//types:Parameter type list, if the function has multiple return values, the order of the types in the list should conform to the defined order
//output: Data before decoding
//ignoreMethodHash：Decode the function return value, fill falseMethodHash with false, if decode the data field in the gettransactionbyid result, fill ignoreMethodHash with true

async function decodeParams(types, output, ignoreMethodHash) {
  if (!output || typeof output === 'boolean') {
    ignoreMethodHash = output;
    output = types;
  }

  if (ignoreMethodHash && output.replace(/^0x/, '').length % 64 === 8) output = '0x' + output.replace(/^0x/, '').substring(8);

  const abiCoder = new AbiCoder();

  //   if (output.replace(/^0x/, '').length % 64) throw new Error('The encoded string is not valid. Its length must be a multiple of 64.');
  return abiCoder.decode(types, output).reduce((obj, arg, index) => {
    if (types[index] == 'address') arg = ADDRESS_PREFIX + arg.substr(2).toLowerCase();
    obj.push(arg);
    return obj;
  }, []);
}

async function main() {
  let data = '0a02d7402208ade449bde770234e4098f998f1b22f5204706863635a65080112610a2d747970652e676f6f676c65617069732e636f6d2f70726f746f636f6c2e5472616e73666572436f6e747261637412300a15410e84b2c819e29881f8cee83c8b809a3b64669d24121541d8826d3b6e82bafd3085dc71a72b30253a99722f180a70f8ab95f1b22f';

  result = await decodeParams(['address', 'uint256'], data, true);
  console.log(result);
}

main().catch(console.error);
