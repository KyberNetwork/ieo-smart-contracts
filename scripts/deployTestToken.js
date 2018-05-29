#!/usr/bin/env node

const Web3 = require("web3");
const fs = require("fs");
const path = require('path');
const RLP = require('rlp');
const BigNumber = require('bignumber.js')

process.on('unhandledRejection', console.error.bind(console))

const { gasPriceGwei, rpcUrl} = require('yargs')
    .usage('Usage: $0 --gas-price-gwei [gwei] --rpc-url [url]')
    .demandOption(['gasPriceGwei', 'rpcUrl'])
    .boolean('printPrivateKey')
    .boolean('dontSendTx')
    .argv;

const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
const solc = require('solc')

const rand = web3.utils.randomHex(7);
let privateKey = web3.utils.sha3("js sucks" + rand);
privateKey = '0xd6777a64d172d25114f24004c227e6c9be3be44132a5ae5d4b0131035bf99fa3'
let owner = '0x73E5c11b416De31F554b7f4Db65a7fC5a85E6Db4'

const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const sender = account.address;
const gasPrice = (new BigNumber(gasPriceGwei)).mul(10 ** 9);
const signedTxs = [];
let nonce;
let chainId;

console.log("from",sender);

async function sendTx(txObject) {
    const txTo = txObject._parent.options.address;

    let gasLimit;
    try {
        gasLimit = await txObject.estimateGas();
        gasLimit += 1000 * 150;
    }
    catch (e) {
        gasLimit = 500 * 1000;
    }

    if(txTo !== null) {
        gasLimit = 500 * 1000;
    }

    //console.log(gasLimit);
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
    signedTxs.push(signedTx.rawTransaction)
    web3.eth.sendSignedTransaction(signedTx.rawTransaction, {from:sender});
}

async function deployContract(solcOutput, contractName, ctorArgs) {

    const actualName = contractName;
    const bytecode = solcOutput.contracts[actualName].bytecode;

    const abi = solcOutput.contracts[actualName].interface;
    const myContract = new web3.eth.Contract(JSON.parse(abi));
    const deploy = myContract.deploy({data:"0x" + bytecode, arguments: ctorArgs});
    let address = "0x" + web3.utils.sha3(RLP.encode([sender,nonce])).slice(12).substring(14);
    address = web3.utils.toChecksumAddress(address);

    await sendTx(deploy);

    myContract.options.address = address;


    return [address,myContract];
}

const contractPath = path.join(__dirname, "../contracts/");

const input = {
    "TrustToken.sol" : fs.readFileSync(contractPath + 'mockContracts/TrustToken.sol', 'utf8')
};


async function main() {
    nonce = await web3.eth.getTransactionCount(sender);
    console.log("nonce",nonce);

    console.log('solc.version')
    console.log(solc.version())

    chainId = chainId || await web3.eth.net.getId()
    console.log('chainId', chainId);

    console.log("starting compilation");
    const output = await solc.compile({ sources: input }, 1);
    console.log(output.errors);
    console.log("finished compilation");

    await waitForEth();

    let contractInst;
    let address;
    console.log("deploying trust token");

    let totalTwei = (new BigNumber(10)).pow(26);
console.log ('totalTwei')
console.log (totalTwei)
//    [address, contractInst] = await deployContract(output, "TrustToken.sol:TrustToken", [totalTwei]);
//    await sendTx(contractInst.methods.transferOwnership(owner));
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


main()