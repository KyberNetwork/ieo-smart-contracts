#!/usr/bin/env node

const Web3 = require("web3");
const fs = require("fs");
const path = require('path');
const RLP = require('rlp');
const BigNumber = require('bignumber.js');

const mainnetUrls = ['https://mainnet.infura.io',
                     'https://semi-node.kyber.network',
                     'https://api.mycryptoapi.com/eth',
                     'https://api.myetherapi.com/eth',
                     'https://mew.giveth.io/'];

const mainnetUrl = 'https://mainnet.infura.io';
const kovanPublicNode = 'https://kovan.infura.io';
const ropstenPublicNode = 'https://ropsten.infura.io';

const localURL = 'http://localhost';

let rpcUrl;

process.on('unhandledRejection', console.error.bind(console));

const {network, gasPriceGwei, printPrivateKey} = require('yargs')
    .usage('Usage: $0 --network [m (mainnet) / r (ropsten) / k (kovan)] --gas-price-gwei [gwei] --print-private-key [bool]')
    .demandOption(['network', 'gasPriceGwei'])
    .boolean('printPrivateKey')
    .argv;

let web3 = new Web3(new Web3.providers.HttpProvider(localURL));
const solc = require('solc');
console.log('solc version ' + solc.version());

// Copy & Paste this
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
if(!Date.now) Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }

const rand = web3.utils.randomHex(7);
let privateKey = web3.utils.sha3("truffle sucks" + rand);
privateKey = '0x5427c9df8a951a6b3030b24728f46960f12fae6c494b9442bc6942e50845664a';

//if (printPrivateKey) {
  console.log("privateKey", privateKey);
//  let path = "privatekey_"  + web3.utils.randomHex(7) + ".txt";
//  fs.writeFileSync(path, privateKey, function(err) {
//      if(err) {
//          return console.log(err);
//      }
//  });
//}


const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const sender = account.address;
const gasPrice = BigNumber(gasPriceGwei).multipliedBy(10 ** 9);
let nonce;
let chainId;

let IEOGetterAddress;

console.log("from",sender);

async function sendTx(txObject) {
    const txTo = txObject._parent.options.address;

    let gasLimit;
    try {
        gasLimit = await txObject.estimateGas();
        if(gasLimit < 30000) {
            gasLimit = 500 * 1000;
        }
    } catch (e) {
        gasLimit = 500 * 1000;
    }

    if(txTo !== null) {
        gasLimit = 500 * 1000;
    }

    //  console.log(gasLimit)
    const txData = txObject.encodeABI();
    const txFrom = account.address;
    const txKey = account.privateKey;

    const tx = {
        from : txFrom,
        to : txTo,
        nonce : nonce,
        data : txData,
        gas : gasLimit,
        chainId,
        gasPrice
    };

    const signedTx = await web3.eth.accounts.signTransaction(tx, txKey);
    nonce++;

    // don't wait for confirmation
    web3.eth.sendSignedTransaction(signedTx.rawTransaction, {from:sender});
}

async function deployContract(solcOutput, contractName, ctorArgs) {

    const actualName = contractName;
    const bytecode = solcOutput.contracts[actualName].bytecode;
    console.log("XXX");
    console.log(bytecode.length);

    const abi = solcOutput.contracts[actualName].interface;
    const myContract = new web3.eth.Contract(JSON.parse(abi));
    const deploy = myContract.deploy({data:"0x" + bytecode, arguments: ctorArgs});
    let address = "0x" + web3.utils.sha3(RLP.encode([sender,nonce])).slice(12).substring(14);
    address = web3.utils.toChecksumAddress(address);

    await sendTx(deploy);

    myContract.options.address = address;

    return [address, myContract];
}

const contractPath = path.join(__dirname, "../contracts/");

const input = {
    "zeppelin/SafeMath.sol" : fs.readFileSync(contractPath + 'zeppelin/SafeMath.sol', 'utf8'),
    "CapManager.sol" : fs.readFileSync(contractPath + 'CapManager.sol', 'utf8'),
    "ERC20Interface.sol" : fs.readFileSync(contractPath + 'ERC20Interface.sol', 'utf8'),
    "IEORate.sol" : fs.readFileSync(contractPath + 'IEORate.sol', 'utf8'),
    "KyberIEO.sol" : fs.readFileSync(contractPath + 'KyberIEO.sol', 'utf8'),
    "KyberIEOGetter.sol" : fs.readFileSync(contractPath + 'KyberIEOGetter.sol', 'utf8'),
    "KyberIEOInterface.sol" : fs.readFileSync(contractPath + 'KyberIEOInterface.sol', 'utf8'),
    "Withdrawable.sol" : fs.readFileSync(contractPath + 'Withdrawable.sol', 'utf8'),
    "PermissionGroups.sol" : fs.readFileSync(contractPath + 'PermissionGroups.sol', 'utf8')
};


function dateToBigNumber(dateString) {
  return new BigNumber(new Date(dateString).getUnixTime());
}


async function main() {
    switch (network){
        case 'm':
            rpcUrl = mainnetUrl;
            break;
        case 'k':
            rpcUrl = kovanPublicNode;
            break;
        case 'r':
            rpcUrl = ropstenPublicNode;
            break;
        default: {
            myLog(1, 0, "error: invalid network parameter, choose: m / r / k");
        }
    }

    web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

    nonce = await web3.eth.getTransactionCount(sender);
    console.log("nonce",nonce);
    chainId = chainId || await web3.eth.net.getId()
    console.log('chainId', chainId);

    console.log("starting compilation");
    const output = await solc.compile({ sources: input }, 1);
    console.log(output.errors);
    //console.log(output);
    console.log("finished compilation");

    await waitForEth();

    console.log("deploying IEO getter");
    let IEOGetterContract;
    [IEOGetterAddress,IEOGetterContract] = await deployContract(output, "KyberIEOGetter.sol:KyberIEOGetter", []);

    console.log("IEO getter adderss", IEOGetterAddress);
    console.log("last nonce is", nonce);
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

async function waitForEth() {
  while(true) {
    const balance = await web3.eth.getBalance(sender);
    console.log("waiting for balance to account " + sender);
    if(balance.toString() !== "0") {
      console.log("received " + balance.toString() + " wei");
      return;
    }
    else await sleep(10000)
  }
}

main();

//console.log(deployContract(output, "cont",5));
