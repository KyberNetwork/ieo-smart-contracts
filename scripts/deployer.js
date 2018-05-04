#!/usr/bin/env node

const Web3 = require("web3");
const fs = require("fs");
const path = require('path');
const RLP = require('rlp');
const BigNumber = require('bignumber.js')

process.on('unhandledRejection', console.error.bind(console))

const { configPath, gasPriceGwei, printPrivateKey, rpcUrl, signedTxOutput, dontSendTx, chainId: chainIdInput } = require('yargs')
    .usage('Usage: $0 --config-path [path] --gas-price-gwei [gwei] --print-private-key [bool] --rpc-url [url] --signed-tx-output [path] --dont-send-tx [bool] --chain-id')
    .demandOption(['configPath', 'gasPriceGwei', 'rpcUrl'])
    .boolean('printPrivateKey')
    .boolean('dontSendTx')
    .argv;
const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
const solc = require('solc')

const rand = web3.utils.randomHex(7);
//let privateKey = web3.utils.sha3("truffle sucks" + rand);
let privateKey = '0x8d96eee5c9ba21b1610a8394e009732b95cedd28d8bb8a57a6ca4f1c5eab0af4';

if (printPrivateKey) {
  console.log("privateKey", privateKey);
  let path = "privatekey_"  + web3.utils.randomHex(7) + ".txt";
  fs.writeFileSync(path, privateKey, function(err) {
      if(err) {
          return console.log(err);
      }
  });
}

// Copy & Paste this
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
if(!Date.now) Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }

const account = web3.eth.accounts.privateKeyToAccount(privateKey);
const sender = account.address;
const gasPrice = BigNumber(gasPriceGwei).multipliedBy(10 ** 9);
const signedTxs = [];
let nonce;
let chainId = chainIdInput;

let IEOAddress;
let rateContractAddress;

console.log("from",sender);

async function sendTx(txObject) {
  const txTo = txObject._parent.options.address;

  let gasLimit;
  try {
    gasLimit = await txObject.estimateGas();
    if(gasLimit < 30000) {
      gasLimit = 400 * 1000;
    }
  }
  catch (e) {
    gasLimit = 400 * 1000;
  }

  if(txTo !== null) {
    gasLimit = 400 * 1000;
  }

  console.log(gasLimit);
  console.log(gasLimit);
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
  if (!dontSendTx) {
    web3.eth.sendSignedTransaction(signedTx.rawTransaction, {from:sender});
  }
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


  return [address,myContract];
}

const contractPath = path.join(__dirname, "../contracts/");

const input = {
  "zeppelin/SafeMath.sol" : fs.readFileSync(contractPath + 'zeppelin/SafeMath.sol', 'utf8'),
  "CapManager.sol" : fs.readFileSync(contractPath + 'CapManager.sol', 'utf8'),
  "ERC20Interface.sol" : fs.readFileSync(contractPath + 'ERC20Interface.sol', 'utf8'),
  "IEORate.sol" : fs.readFileSync(contractPath + 'IEORate.sol', 'utf8'),
  "KyberIEO.sol" : fs.readFileSync(contractPath + 'KyberIEO.sol', 'utf8'),
  "KyberIEOInterface.sol" : fs.readFileSync(contractPath + 'KyberIEOInterface.sol', 'utf8'),
  "KyberIEOWrapper.sol" : fs.readFileSync(contractPath + 'KyberIEOWrapper.sol', 'utf8'),
  "Withdrawable.sol" : fs.readFileSync(contractPath + 'Withdrawable.sol', 'utf8'),
  "PermissionGroups.sol" : fs.readFileSync(contractPath + 'PermissionGroups.sol', 'utf8')
};


let admin;
let projectWallet;
let token;
let contributorCapWei;
let IEOId;
let cappedSaleStart;
let publicSaleStartTime;
let publicSaleEndTime;

let rateOperator;
let kycOperator;
let alerter;

let initialRateN = BigNumber(7);
let initialRateD = BigNumber(8);

function dateToBigNumber(dateString) {
  return new BigNumber(new Date(dateString).getUnixTime());
}

function parseInput( jsonInput ) {
    // ctor
    const ctorParams = jsonInput["constructor"];
    admin = ctorParams["admin"];
    projectWallet = ctorParams["projectWallet"];
    token = ctorParams["token"];
    contributorCapWei = new BigNumber(ctorParams["contributorCapWei"]);
    IEOId = new BigNumber(ctorParams["IEOId"]);
    cappedSaleStart = dateToBigNumber(ctorParams["cappedSaleStart"]);
    publicSaleStartTime = dateToBigNumber(ctorParams["publicSaleStartTime"]);
    publicSaleEndTime = dateToBigNumber(ctorParams["publicSaleEndTime"]);

    // operators
    const operatorParams = jsonInput["operators"]
    rateOperator = operatorParams["rate"];
    kycOperator = operatorParams["kyc"];
    alerter = operatorParams["alerter"];

    // initial rate
    const initialRateParams = jsonInput["initialRate"];
    initialRateN = new BigNumber(initialRateParams["numerator"]);
    initialRateD = new BigNumber(initialRateParams["denominator"]);
};


async function findImports (path) {
	if (path === 'zeppelin/SafeMath.sol') {
    const safeMath = fs.readFileSync("../contracts/zeppelin/SafeMath.sol","utf8");
    return { contents: safeMath }
  }
	else
		return { error: 'File not found' }
}

async function main() {
  nonce = await web3.eth.getTransactionCount(sender);
  console.log("nonce",nonce);

  chainId = chainId || await web3.eth.net.getId()
  console.log('chainId', chainId);

  console.log("starting compilation");
  const output = await solc.compile({ sources: input }, 1);
  console.log(output.errors);
  //console.log(output);
  console.log("finished compilation");

  if (!dontSendTx) {
    await waitForEth();
  }


  console.log("deploying IEO contract - set sender as admin");
  let IEOContract;
  [IEOAddress,IEOContract] = await deployContract(output, "KyberIEO.sol:KyberIEO", [sender,
                                                                                    projectWallet,
                                                                                    token,
                                                                                    contributorCapWei,
                                                                                    IEOId,
                                                                                    cappedSaleStart,
                                                                                    publicSaleStartTime,
                                                                                    publicSaleEndTime]);

  console.log("IEO address", IEOAddress);
  rateContractAddress = "0x" + web3.utils.sha3(RLP.encode([IEOAddress,1])).slice(12).substring(14);
  rateContractAddress = web3.utils.toChecksumAddress(rateContractAddress);
  console.log("Rate address", rateContractAddress);
  let rateAbi = output.contracts["IEORate.sol:IEORate"].interface;
  let rateContract = await new web3.eth.Contract(JSON.parse(rateAbi), rateContractAddress);

  console.log("IEO");
  // add alerter
  console.log("Add alerter");
  await sendTx(IEOContract.methods.addAlerter(alerter));

  // add kyc operator
  console.log("Add kyc operator");
  await sendTx(IEOContract.methods.addOperator(kycOperator));
  // add alerter
  // transfer admin
  console.log("transfer admin");
  await sendTx(IEOContract.methods.transferAdminQuickly(admin));

  // set initial rate
  console.log("set rate");
  // add sender as temp operator
  console.log("set sender as temp admin");
  await sendTx(rateContract.methods.addOperator(sender));
  // set rate
  console.log("set rate setRateEthToToken");
  await sendTx(rateContract.methods.setRateEthToToken(initialRateN,initialRateD));
  // remove sender as temp admin
  console.log("remove sender as temp admin");
  await sendTx(rateContract.methods.removeOperator(sender));
  // add oeprator
  console.log("set operator");
  await sendTx(rateContract.methods.addOperator(rateOperator));
  // transferAdmin
  console.log("transferAdmin");
  await sendTx(rateContract.methods.transferAdminQuickly(admin));

  console.log("last nonce is", nonce);
  const signedTxsJson = JSON.stringify({ from: sender, txs: signedTxs }, null, 2);
  if (signedTxOutput) {
    fs.writeFileSync(signedTxOutput, signedTxsJson);
  }

  printParams(jsonInput);
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


let filename;
let content;
let jsonInput;

try{
  content = fs.readFileSync(configPath, 'utf8');
  //console.log(content.substring(2892,2900));
  //console.log(content.substring(3490,3550));
  jsonInput = JSON.parse(content
  parseInput(jsonInput));
}
catch(err) {
  console.log(err);
  process.exit(-1)
}

function printParams(jsonInput) {
    dictOutput = {};
    dictOutput["IEO Address"] = IEOAddress;
    dictOutput["IEO Rate Address"] = rateContractAddress;
    dictOutput["constructor"] = jsonInput["constructor"];
    dictOutput["operators"] = jsonInput["operators"];
    dictOutput["rate"] = jsonInput["initialRate"];
    const json = JSON.stringify(dictOutput, null, 2);
    console.log(json);
    const outputFileName = jsonInput["output filename"];
    console.log(outputFileName, 'write');
    fs.writeFileSync(outputFileName, json);
}

main();

//console.log(deployContract(output, "cont",5));
