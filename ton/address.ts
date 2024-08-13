import { Address } from '@ton/core';
import { TonClient } from '@ton/ton';
import assert from 'assert';

const client = new TonClient({
  endpoint: 'https://toncenter.com/api/v2/jsonRPC',
});

// https://docs.ton.org/develop/dapps/cookbook
/** 
What flags are there in user-friendly addresses?
Two flags are defined: bounceable/non-bounceable and testnet/any-net. They can be easily detected by looking at the first letter of the address, because it stands for the first 6 bits in address encoding, and flags are located there according to TEP-2:

Address beginning  Binary form  Bounceable  Testnet-only
E...               000100.01    yes         no
U...               010100.01    no          no
k...               100100.01    yes         yes
0...               110100.01    no          yes
*/
async function main() {
  const friendlyAddress = 'UQAUtqavvctPyyVPDn148FiIs9Ii0FZW_mSQVjqv8yY6ibFJ';
  const rawAddress = '0:14b6a6afbdcb4fcb254f0e7d78f05888b3d222d05656fe6490563aaff3263a89';
  // (base64-encoded with certain flags
  const base64Address = 'EQAUtqavvctPyyVPDn148FiIs9Ii0FZW_mSQVjqv8yY6ieyM';

  // raw -> address
  {
    const address = Address.parse(rawAddress);
    const toAddress = address.toString({ bounceable: false, urlSafe: true });
    const isFriendly = Address.isFriendly(rawAddress);
    assert.strictEqual(isFriendly, false, 'Raw address is not friendly');
    assert.strictEqual(toAddress, friendlyAddress, 'Address is not equal');
    assert.strictEqual(address.toString(), base64Address, 'Address safe to base64 is not equal');
  }

  // friendly -> address
  {
    const address = Address.parse(friendlyAddress);
    const isFriendly = Address.isFriendly(friendlyAddress);
    const toAddress = address.toString({ bounceable: false, urlSafe: true });
    assert.strictEqual(isFriendly, true, 'bounceables');
    assert.strictEqual(toAddress, friendlyAddress, 'Address is not equal');
    assert.strictEqual(address.toString(), base64Address, 'Address safe to base64 is not equal');
  }

  // base64 -> address
  {
    const address = Address.parse(base64Address);
    const isFriendly = Address.isFriendly(base64Address);
    const toAddress = address.toString({ bounceable: false, urlSafe: true });
    assert.strictEqual(isFriendly, true, 'the base64Address is not a friendly address');
    assert.strictEqual(toAddress, friendlyAddress, 'Address is not equal');
    assert.strictEqual(address.toString(), base64Address, 'Address safe to base64 is not equal');
  }

  const address = Address.parse(rawAddress);
  console.log(address.toString()); // EQAUtqavvctPyyVPDn148FiIs9Ii0FZW_mSQVjqv8yY6ieyM
  console.log(address.toString({ urlSafe: false })); // EQAUtqavvctPyyVPDn148FiIs9Ii0FZW/mSQVjqv8yY6ieyM
  console.log(address.toString({ bounceable: false })); // UQAUtqavvctPyyVPDn148FiIs9Ii0FZW_mSQVjqv8yY6ibFJ
  console.log(address.toString({ testOnly: true })); // kQAUtqavvctPyyVPDn148FiIs9Ii0FZW_mSQVjqv8yY6iVcG
  console.log(address.toString({ bounceable: false, testOnly: true })); // 0QAUtqavvctPyyVPDn148FiIs9Ii0FZW_mSQVjqv8yY6iQrD

  return;
  const state = await client.getContractState(address);
  console.log('state  : ', state);

  const balance = await client.getBalance(address);
  console.log('balance : ', balance);
  assert.strictEqual(balance, state.balance, 'Balance is not equal');
}

main().catch(console.error);
