# Setup

```sh
mkdir -p data/{first,second}
```

## RPC Auth

> curl -sSL https://raw.githubusercontent.com/bitcoin/bitcoin/master/share/rpcauth/rpcauth.py | python3 - btc 123456

## Regtest

```sh
docker run --rm -it \
  -p 18443:18443 \
  -p 18444:18444 \
  ruimarinho/bitcoin-core \
  -printtoconsole \
  -regtest=1 \
  -rpcallowip=0.0.0.0/24 \
  -rpcbind=0.0.0.0 \
  -rpcauth='btc:e58285ec1c303a2f7db1a58c4330ecca$a882c7b7d0959e855ba6bc4ebb8f4a844934ac746fdca59037efc31234808fa9'
```

## Method

### Get balance

> bitcoin-cli -regtest -rpcuser=btc -stdinrpcpass getbalance

```sh

bitcoin-cli -regtest -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getbalance
```

> 0.00000000

### New Wallet

> bitcoin-cli -regtest -rpcuser=btc -stdinrpcpass getnewaddress

```sh
bitcoin-cli -regtest -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getnewaddress
```

> bcrt1q0s2pt3uumpm6ekdhlql0je9lfqvpj4098475q2

### Get wallet info

> bitcoin-cli getwalletinfo

```sh
bitcoin-cli -regtest -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getwalletinfo
```

```sh
{
  "walletname": "",
  "walletversion": 169900,
  "balance": 0.00000000,
  "unconfirmed_balance": 0.00000000,
  "immature_balance": 0.00000000,
  "txcount": 0,
  "keypoololdest": 1627295069,
  "keypoolsize": 999,
  "hdseedid": "d97a318db2d7f73b204058e082b903cb529a4ddd",
  "keypoolsize_hd_internal": 1000,
  "paytxfee": 0.00000000,
  "private_keys_enabled": true,
  "avoid_reuse": false,
  "scanning": false
}
```

### Export Private Key

> bitcoin-cli -rpcuser=btc -stdinrpcpass -rpcport=18443 dumpprivkey

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 dumpprivkey bcrt1q0s2pt3uumpm6ekdhlql0je9lfqvpj4098475q2
```

> cVQkBcMKmssj4VA6Egby3Eic9XtosVLkdLCkuSyzGopWhWYhxtJg

### Mining

> bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 generatetoaddress 101

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 generatetoaddress 101 bcrt1q0s2pt3uumpm6ekdhlql0je9lfqvpj4098475q2
```

output:

```sh
[
  "682192b687d81ea6c26939d2366e32142a28f8f03950e6f6eea6f0c64c6fb5db",
  "74df1069a4f1dd33cb20e17a52d44d7f04722f1211bd7312ea13a06e1bcae1dc",
  "02e16a7bdfeaef944a6893de0905c2478b3783877f51f76e70091d70daa14e3e",
  "3f876e1f75e7f729de08ff2b447da0a4a6ea40d6fe67ce474ee2aea83427f1d5",
  "03acc0a170cfefb65fbb26d94aad2c149501cc57ca697f56ec8c7edda335543c",
  "1e3f090a9870fdaeebebde9fe0ec07063553f0b89f55b92667f53599cea2aa66",
  "7b93d77ff36d06d8224e64568ec1250ce5f9fef3c750f4d983b8e5765a8b47ae",
  "53f795d5a0ca7c3c92469d4263c67cf7f7929ba2c252e00211406f591490d720",
  ...
  ]
```

### List address groupings

> bitcoin-cli listaddressgroupings

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 listaddressgroupings
```

output:

```sh
[
  [
    [
      "bcrt1qa9mxdjf6cjac0v0yy9gluhz5u49rkd0k0z0ujp",
      50.00000000,
      ""
    ]
  ]
]
```

### Get Balance

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getbalance "*" 6
```

output:

```sh
50.00000000
```

### Set tx fee

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 settxfee 0.00001
```

```sh
true
```

### Send to address

#### create new address

```sh
bitcoin-cli -regtest -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getnewaddress
```

> bcrt1q3y5897fylnrz27eh0gwg56nyn7w4g6mh42dnl3

#### send to new address

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 sendtoaddress "bcrt1qm8f9svl8sqckz5r5d6rtlv2v0v7ytslmy94uq5" 10
```

> 1943011273d72b06e5ad259fe215afa1bd2b283b60c3faea2a6a07f33554ddfa

#### minting the tx

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 generatetoaddress 99 bcrt1q0s2pt3uumpm6ekdhlql0je9lfqvpj4098475q2
```

> 1943011273d72b06e5ad259fe215afa1bd2b283b60c3faea2a6a07f33554ddfa

### Connect to other nodes

#### Add node

> bitcoin-cli addnode <node> add

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 addnode "second-node:18444" add
```

#### Get added node info

> bitcoin-cli getaddednodeinfo

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getaddednodeinfo
```

output:

```sh
[
  {
    "addednode": "second-node:18444",
    "connected": true,
    "addresses": [
      {
        "address": "172.26.0.3:18444",
        "connected": "outbound"
      }
    ]
  }
]
```

### Double spend

we only have two nodes in the network, it's easy to make a 51% attack. We're going to double spend some bitcoin.

#### Build a raw transaction

##### Get unspent outputs

> bitcoin-cli listunspent

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 listunspent 0 10 "[\"bcrt1q0s2pt3uumpm6ekdhlql0je9lfqvpj4098475q2\"]"
```

##### Create a raw transaction

> bitcoin-cli createrawtransaction

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 createrawtransaction '[{"txid":"583c696489587fbf1c13d65297dd2dc46fee10b3c4bad750773ec1b18b629c0a","vout":0}]' '{"bcrt1qt9a3kyzt95clzjtqvxdwgps6gd5whk05c7zhhz":24.9998}'
```

> 02000000010a9c628bb1c13e7750d7bac4b310ee6fc42ddd9752d6131cbf7f588964693c580000000000ffffffff01e0aa029500000000160014597b1b104b2d31f14960619ae4061a4368ebd9f400000000

##### Sign a raw transaction

> bitcoin-cli signrawtransactionwithwallet

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 signrawtransactionwithwallet 02000000010a9c628bb1c13e7750d7bac4b310ee6fc42ddd9752d6131cbf7f588964693c580000000000ffffffff01e0aa029500000000160014597b1b104b2d31f14960619ae4061a4368ebd9f400000000
```

output:

```sh
{
  "hex": "020000000001010a9c628bb1c13e7750d7bac4b310ee6fc42ddd9752d6131cbf7f588964693c580000000000ffffffff01e0aa029500000000160014597b1b104b2d31f14960619ae4061a4368ebd9f4024630430220510043faabfb33e03fa69fa6500adceafd51b19ad3510e5696e84c805631b2b9021f586d1f25f4fa8d2fd7f736c6b79846cae785092594e057ab0b6bb3131b01d70121021f72bb5339ca3405596d38cfb585cbcc0a180d9ddc87137ecdb0668a06dc5e8c00000000",
  "complete": true
}
```

#### Disconnect node

##### 1. Disconnect node

> bitcoin-cli disconnectnode

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 disconnectnode "first-node:18444"
```

##### 2. Get added node info

> bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getaddednodeinfo

```sh
[
  {
    "addednode": "first-node:18444",
    "connected": false,
    "addresses": [
    ]
  }
]
```

#### send raw transaction in second node

> bitcoin-cli sendrawtransaction

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 sendrawtransaction "020000000001010a9c628bb1c13e7750d7bac4b310ee6fc42ddd9752d6131cbf7f588964693c580000000000ffffffff01e0aa029500000000160014597b1b104b2d31f14960619ae4061a4368ebd9f4024630430220510043faabfb33e03fa69fa6500adceafd51b19ad3510e5696e84c805631b2b9021f586d1f25f4fa8d2fd7f736c6b79846cae785092594e057ab0b6bb3131b01d70121021f72bb5339ca3405596d38cfb585cbcc0a180d9ddc87137ecdb0668a06dc5e8c00000000" 
```

> fd0f0bfc79a30f7a9073de12ecb099d207dac81ba0b4c55fe604fd6957d91744

#### Mining 10 blocks

##### generatetoaddress 10

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 generatetoaddress 10 bcrt1qm8f9svl8sqckz5r5d6rtlv2v0v7ytslmy94uq5
```

```sh
[
  "1dd7f3e88ebcb62202353c9b9d2029156e7a2a891ec460faa2bcf0f1d34a242f",
  "3ed7e45a0f22216604e3e2963658e6d9400652a2604cf22b771351bd65e2ec2d",
  "250ee5caad2d90030cbef3845a2e8d0ad43887e6f8451c6c5eb4d76af88c933b",
  "5e19d680492eb2379b16b81865d013f4577a948183ff6049463b9aef5dbb871c",
  "0309daab193e7bbeda82f7f78010f5edf17b2984d8dd91a9e449e7fbc096025c",
  "5d4a77b87338fccb5d59597f7ac5bacf3e0444c00cbfe84ebe7930df606b7e1a",
  "3b4a3de263dafffe7cbad9915a3ecbadeb7dcf480ac5e82c3d848af0cb5e0af6",
  "7305fd6d602ed39575bc90c530debc475737e26197d54ddc6d78c89c3748d8c9",
  "057929baae70182abd637cb77b4dcca5d5472632815a1b579c0f1bbdd9b7eac5",
  "61460e3889742bcf3becf1d8f9946ac8d88e956ceb5e99820edc4fb08ed51ca4"
]
```

##### In second node

###### getmininginfo second node

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getmininginfo
```

```sh
{
  "blocks": 310,
  "currentblockweight": 4000,
  "currentblocktx": 0,
  "difficulty": 4.656542373906925e-10,
  "networkhashps": 0.07902535396773132,
  "pooledtx": 0,
  "chain": "regtest",
  "warnings": ""
}
```

###### listaddressgroupings

```sh
[
  [
    [
      "bcrt1qt9a3kyzt95clzjtqvxdwgps6gd5whk05c7zhhz",
      24.99980000,
      "aaron"
    ]
  ],
  [
    [
      "bcrt1qm8f9svl8sqckz5r5d6rtlv2v0v7ytslmy94uq5",
      10.00000000,
      ""
    ]
  ]
]
```

##### In first node

###### getmininginfo first node

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getmininginfo
```

```sh
{
  "blocks": 309,
  "currentblockweight": 4000,
  "currentblocktx": 0,
  "difficulty": 4.656542373906925e-10,
  "networkhashps": 0.07242003621001811,
  "pooledtx": 0,
  "chain": "regtest",
  "warnings": ""
}
```

###### getnewaddress in first node

> bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getnewaddress

```sh
bcrt1q2caczrklcudt2q8vxtdkd6hcc8047w0u4unwwj
```

###### reuse the unspent txId

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 createrawtransaction '[{"txid":"583c696489587fbf1c13d65297dd2dc46fee10b3c4bad750773ec1b18b629c0a","vout":0}]' '{"bcrt1q2caczrklcudt2q8vxtdkd6hcc8047w0u4unwwj":24.995}'
```

> 02000000010a9c628bb1c13e7750d7bac4b310ee6fc42ddd9752d6131cbf7f588964693c580000000000ffffffff01e057fb9400000000160014563b810edfc71ab500ec32db66eaf8c1df5f39fc00000000

###### resign the raw transaction

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 signrawtransactionwithwallet 02000000010a9c628bb1c13e7750d7bac4b310ee6fc42ddd9752d6131cbf7f588964693c580000000000ffffffff01e057fb9400000000160014563b810edfc71ab500ec32db66eaf8c1df5f39fc00000000
```

```sh
{
  "hex": "020000000001010a9c628bb1c13e7750d7bac4b310ee6fc42ddd9752d6131cbf7f588964693c580000000000ffffffff01e057fb9400000000160014563b810edfc71ab500ec32db66eaf8c1df5f39fc0247304402203654fe87f7a09e29d0a869df7503fc127bf896a17cd5dbaac9abd4c24638088702200c790f83bb0eb6c38a5b9b4d93981743961b93e80c68bb7e258ec70947c29cb50121021f72bb5339ca3405596d38cfb585cbcc0a180d9ddc87137ecdb0668a06dc5e8c00000000",
  "complete": true
}
```

###### send raw transaction in first node

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 sendrawtransaction "020000000001010a9c628bb1c13e7750d7bac4b310ee6fc42ddd9752d6131cbf7f588964693c580000000000ffffffff01e057fb9400000000160014563b810edfc71ab500ec32db66eaf8c1df5f39fc0247304402203654fe87f7a09e29d0a869df7503fc127bf896a17cd5dbaac9abd4c24638088702200c790f83bb0eb6c38a5b9b4d93981743961b93e80c68bb7e258ec70947c29cb50121021f72bb5339ca3405596d38cfb585cbcc0a180d9ddc87137ecdb0668a06dc5e8c00000000"
```

> 61a9a6805a666e58688e5f404b470ed18a70d17d9afcdccc6c4e3fb5af179c1d

###### minting more blocks

```sh
bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 generatetoaddress 200 bcrt1qm8f9svl8sqckz5r5d6rtlv2v0v7ytslmy94uq5
```

###### getmininginfo first node, should be longer than second one

> bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getmininginfo

```sh
{
  "blocks": 1548,
  "currentblockweight": 4000,
  "currentblocktx": 0,
  "difficulty": 4.656542373906925e-10,
  "networkhashps": 12,
  "pooledtx": 0,
  "chain": "regtest",
  "warnings": ""
}
```

##### Restart second node and reconnect first node

###### getmininginfo the second getmininginfo

> bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getmininginfo

```sh
{
  "blocks": 310,
  "difficulty": 4.656542373906925e-10,
  "networkhashps": 0.07902535396773132,
  "pooledtx": 0,
  "chain": "regtest",
  "warnings": ""
}
```

###### reconnect the first node

> bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 addnode "first-node:18444" add
> bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 getaddednodeinfo

```sh
{
  "blocks": 310,
  "difficulty": 4.656542373906925e-10,
  "networkhashps": 0.07902535396773132,
  "pooledtx": 0,
  "chain": "regtest",
  "warnings": ""
}
```

###### wait sync and listaddressgroupings 

> bitcoin-cli -rpcuser=btc -rpcpassword=123456 -rpcport=18443 listaddressgroupings

```sh
[
  [
    [
      "bcrt1qt9a3kyzt95clzjtqvxdwgps6gd5whk05c7zhhz",
      0.00000000,
      "aaron"
    ]
  ],
  [
    [
      "bcrt1qm8f9svl8sqckz5r5d6rtlv2v0v7ytslmy94uq5",
      1072.50500000,
      ""
    ]
  ]
]
```

