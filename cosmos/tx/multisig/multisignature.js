const { strict: assert } = require('assert');

const {
  Secp256k1HdWallet,
  coins,
  assertIsBroadcastTxSuccess,
} = require("@cosmjs/launchpad");

const { createMultisigThresholdPubkey, encodeSecp256k1Pubkey, pubkeyToAddress, makeCosmoshubPath } = require('@cosmjs/amino');
const { SigningStargateClient, StargateClient, makeMultisignedTx } = require('@cosmjs/stargate');
const { TxRaw } = require("cosmjs-types/cosmos/tx/v1beta1/tx");

// https://github.com/cosmos/cosmjs/blob/c192fc9b95ef97e4afbf7f5b94f8e8194ae428a6/packages/stargate/src/multisignature.spec.ts#L175
async function main() {
  const threshold = 2;
  const prefix = 'cosmos';
  const mnemonic = 'traffic wine leader wheat mom device kiwi great horn room remind office';
  const rpcEndpoint = 'https://rpc.testnet.cosmos.network:443';
  const client = await StargateClient.connect(rpcEndpoint);

  const multisigAccountAddress = "cosmos14txtjx9yx8zjxhu6s2jpa8xsx6auz3rhq7zhus";

  // On the composer's machine signing instructions are created.
  // The composer does not need to be one of the signers.
  const accountOnChain = await client.getAccount(multisigAccountAddress);
  assert(accountOnChain, "Account does not exist on chain");

  const msgSend = {
    fromAddress: multisigAccountAddress,
    toAddress: "cosmos19rvl6ja9h0erq9dc2xxfdzypc739ej8k5esnhg",
    amount: coins(1234, "uphoton"),
  };
  const msg = {
    typeUrl: "/cosmos.bank.v1beta1.MsgSend",
    value: msgSend,
  };
  const gasLimit = 200000;
  const fee = {
    amount: coins(2000, "uphoton"),
    gas: gasLimit.toString(),
  };

  const signingInstruction = {
    accountNumber: accountOnChain.accountNumber,
    sequence: accountOnChain.sequence,
    chainId: await client.getChainId(),
    msgs: [msg],
    fee: fee,
    memo: "Happy new year",
  };

  const [
    [pubkey0, signature0, bodyBytes],
    [pubkey1, signature1],
    [pubkey2, signature2],
    [pubkey3, signature3],
    [pubkey4, signature4],
  ] = await Promise.all(
    [0, 1, 2, 3, 4].map(async (i) => {
      // Signing environment
      const wallet = await Secp256k1HdWallet.fromMnemonic(mnemonic, {
        hdPaths: [makeCosmoshubPath(i)],
      });
      const pubkey = encodeSecp256k1Pubkey((await wallet.getAccounts())[0].pubkey);
      const address = (await wallet.getAccounts())[0].address;
      const signingClient = await SigningStargateClient.offline(wallet);
      const signerData = {
        accountNumber: signingInstruction.accountNumber,
        sequence: signingInstruction.sequence,
        chainId: signingInstruction.chainId,
      };
      const { bodyBytes: bb, signatures } = await signingClient.sign(
        address,
        signingInstruction.msgs,
        signingInstruction.fee,
        signingInstruction.memo,
        signerData,
      );
      return [pubkey, signatures[0], bb];
    }),
  );

  // From here on, no private keys are required anymore. Any anonymous entity
  // can collect, assemble and broadcast.
  console.log('pubkey0 : ', pubkey0);
  console.log('pubkey1 : ', pubkey1);
  console.log('pubkey2 : ', pubkey2);
  const multisigPubkey = createMultisigThresholdPubkey(
    [pubkey0, pubkey1, pubkey2, pubkey3, pubkey4],
    threshold,
  );
  assert.equal(multisigAccountAddress, pubkeyToAddress(multisigPubkey, prefix), 'should be equal');

  const address0 = pubkeyToAddress(pubkey0, prefix);
  const address1 = pubkeyToAddress(pubkey1, prefix);
  const address2 = pubkeyToAddress(pubkey2, prefix);
  const address3 = pubkeyToAddress(pubkey3, prefix);
  const address4 = pubkeyToAddress(pubkey4, prefix);

  const signedTx = makeMultisignedTx(
    multisigPubkey,
    signingInstruction.sequence,
    signingInstruction.fee,
    bodyBytes,
    new Map([
      [address0, signature0],
      [address1, signature1],
      // [address2, signature2],
      // [address3, signature3],
      // [address4, signature4],
    ]),
  )

  // ensure signature is valid
  const broadcaster = await StargateClient.connect(rpcEndpoint);
  const result = await broadcaster.broadcastTx(Uint8Array.from(TxRaw.encode(signedTx).finish()));
  console.log('result', result)
  assertIsBroadcastTxSuccess(result);

}

main().catch(console.error);
