#!/usr/bin/env node

const Web3 = require("web3");
const fs = require("fs");
const path = require('path');
const RLP = require('rlp');
const BigNumber = require('bignumber.js');

process.on('unhandledRejection', console.error.bind(console));

const {configPath, rpcUrl, chainId: chainIdInput } = require('yargs')
    .usage('Usage: $0 --json-path [path] --rpc-url [url] --chain-id')
    .demandOption(['jsonPath', 'rpcUrl'])
    .argv;

const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));
const solc = require('solc')



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

//contract sources
const contractPath = "../contracts/";

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


//deployment params
let jsonIEOAddress;
let IEOInst;
let jsonIEORateAddress;
let IEORateInst;
let jsonAdmin;
let jsonProjectWallet;
let jsonToken;
let jsonContributorCapWei;
let jsonIEOId;
let jsonCappedIEOStart;
let jsonPublicIEOStartTime;
let jsonPublicIEOEndTime;

let jsonRateOperator;
let jsonKycOperator;
let jsonAlerter;

let jsonRateNumerator;
let jsonRateDenominator;

function dateToBigNumber(dateString) {
    return new BigNumber(new Date(dateString).getUnixTime());
}

function parseInput( jsonInput ) {
    jsonIEOAddress =  jsonInput["IEO Address"].toLowerCase();
    jsonIEORateAddress = jsonInput["IEO Rate Address"].toLowerCase();

    const ctorParams = jsonInput["constructor"];
    jsonAdmin = ctorParams["admin"].toLowerCase();
    jsonProjectWallet = ctorParams["projectWallet"];
    sonToken = ctorParams["token"];
    jsonContributorCapWei = new BigNumber(ctorParams["contributorCapWei"]);
    jsonIEOId = new BigNumber(ctorParams["IEOId"]);
    jsonCappedIEOStart = dateToBigNumber(ctorParams["cappedIEOStart"]);
    jsonOpenIEOStartTime = dateToBigNumber(ctorParams["publicIEOStartTime"]);
    jsonPublicIEOEndTime = dateToBigNumber(ctorParams["publicIEOEndTime"]);

    // operators
    const operatorParams = jsonInput["operators"];
    jsonRateOperator = operatorParams["rate"].toLowerCase();
    jsonKycOperator = operatorParams["kyc"].toLowerCase();
    jsonAalerter = operatorParams["alerter"].toLowerCase();

    // rate
    const rateParams = jsonInput["rate"];
    jsonRateNumerator = new BigNumber(rateParams["numerator"]);
    jsonRateDenominator = new BigNumber(rateParams["denominator"]);
};


async function findImports (path) {
	if (path === 'zeppelin/SafeMath.sol') {
        const safeMath = fs.readFileSync("../contracts/zeppelin/SafeMath.sol","utf8");
        return { contents: safeMath }
    }
	else {
		return { error: 'File not found' }
    }
}

async function main() {

    chainId = chainId || await web3.eth.net.getId()
    console.log('chainId', chainId);

    console.log("starting compilation");
    const output = await solc.compile({ sources: input }, 1);
    console.log(output.errors);
    //console.log(output);
    console.log("finished compilation");

    //read kyber IEO
    ////////////////
    let abi = solcOutput.contracts["KyberIEO.sol:KyberIEO"].interface;
    IEOInst = await new web3.eth.Contract(JSON.parse(abi), IEOAddress);

    //verify binary as expected.
    let blockCode = await web3.eth.getCode(kyberNetworkAdd);
    let solcCode = '0x' + (solcOutput.contracts["KyberIEO.sol:KyberIEO"].runtimeBytecode);

    myLog(0, 0, (""));
    myLog(0, 0, ("KyberIEO: " + IEOAddress));
    myLog(0, 0, ("------------------------------------------------------------"));

    if (blockCode != solcCode){
//        myLog(1, 0, "blockchain Code:");
//        myLog(0, 0, blockCode);
        myLog(0, 0, '');
        myLog(1, 0, "Byte code from block chain doesn't match locally compiled code.")
        myLog(0, 0, '')
    } else {
        myLog(0, 0, "Code on blockchain matches locally compiled code");
        myLog(0, 0, '');
    }

    //read and compare parameters.
    let IEORateAddress = (await IEOInst.methods.IEORateContract().call()).toLowerCase();
    compareAndLog("IEO Rate address: " ,jsonIEORateAddress, IEORateAddress);

    let ProjectWallet = (await IEOInst.methods.contributionWallet().call()).toLowerCase();
    compareAndLog("ProjectWallet: " ,jsonProjectWallet, ProjectWallet);

    let contributorCapWei = (await IEOInst.methods.contributorCapWei().call()).toLowerCase();
    compareAndLog("contributorCapWei: " ,jsonContributorCapWei, contributorCapWei);

    let IEOId = (await IEOInst.methods.IEOId().call()).toLowerCase();
    compareAndLog("IEOId: " ,jsonIEOId, IEOId);

    let cappedIEOStart = (await IEOInst.methods.cappedIEOStartTime().call()).toLowerCase();
    compareAndLog("cappedIEOStart time: ", jsonCappedIEOStart, cappedIEOStart);

    let openIEOStart = (await IEOInst.methods.openIEOStartTime().call()).toLowerCase();
    compareAndLog("openIEOStartTime: ", jsonPublicIEOStartTime, openIEOStart);

    let endIEOTime = (await IEOInst.methods.endIEOTime().call()).toLowerCase();
    compareAndLog("endIEOTime: ", jsonPublicIEOEndTime, endIEOTime);

    let admin = (await IEOInst.methods.admin().call()).toLowerCase();
    compareAndLog("admin: ", jsonAdmin, admin);





function compareAndLog(string, jsonValue, rxValue) {
    myLog((jsonValue != rxValue), 0, string + " as expected: " + (jsonValue != rxValue));
}

function myLog(error, highlight, string) {
    if (error) {
//        console.error(string);
        console.log('\x1b[31m%s\x1b[0m', string);
        ouputErrString += "\nerror: " + string;
        ouputLogString += "\nerror: " + string;
    } else if (highlight) {
        console.log('\x1b[33m%s\x1b[0m', string);
        ouputErrString += "\nwarning: " + string;
        ouputLogString += "\nwarning: " + string;
    } else {
        console.log('\x1b[32m%s\x1b[0m', string);
        ouputLogString += "\n     " + string;
    }
};














  let IEOAddress;
  let IEOContract;
  [IEOAddress,IEOContract] = await deployContract(output, "KyberIEO.sol:KyberIEO", [sender,
                                                                                    projectWallet,
                                                                                    token,
                                                                                    contributorCapWei,
                                                                                    IEOId,
                                                                                    cappedIEOStart,
                                                                                    openIEOStartTime,
                                                                                    publicIEOEndTime]);

  console.log("IEO address", IEOAddress);
  let rateContractAddress = "0x" + web3.utils.sha3(RLP.encode([IEOAddress,1])).slice(12).substring(14);
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
}





























let solcOutput;

const ethAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

// variables
///////////

//contract addresses
let whiteListAdd;
let feeBurnerAdd;
let expectedRateAdd;
let numReserves;
let reservesAdd = [];
let ratesAdd = [];      // one per reserve
let sanityRateAdd = []; // one per reserve
let ERC20Inst = [];
let ERC20Adds = [];
let kncInst;

//contract instances
let Network;
let WhiteList;
let FeeBurner;
let ExpectedRate;
let Reserves = [];
let ConversionRates = [];         // one per reserve
let SanityRates = [];   // one per reserve

//parameters
let tokensPerReserve = [];//[reserve index][token address]
let deploymentJson;
let addressesToNames = {};
let tokenSymbolToAddress = {};
let jsonTokenList = [];
let jsonKyberTokenList = [];
let jsonWithdrawAddresses = [];
let minRecordResolutionPerToken = {};
let maxPerBlockImbalancePerToken = {};
let maxTotalImbalancePerToken = {};
let decimalsPerToken = {};
let whiteListedAddresses = [];
let jsonTestersCat;
let jsonKYCCat;
let jsonKYCCap;
let jsonUsersCat;
let jsonUsersCap;
let jsonEmailCat;
let jsonEmailCap;
let jsonTestersCap;
let jsonDefaultCap;
let jsonKGTCap;
let jsonWeiPerSGD;
let jsonKGTAddress;
let kgtHolderCategory;
let jsonValidDurationBlock;
let jsonMaxGasPrice;
let jsonNegDiffBps;
let jsonMinExpectedRateSlippage;
let jsonKNCWallet;
let jsonKNC2EthRate;
let jsonTaxFeeBps;
let jsonTaxWalletAddress;
let jsonFeeBurnerAdd;
let jsonRatesAdd;
let jsonWrapConversionRate;
let jsonReserveAdd;

let kyberNetworkAdd = '0x0';
let jsonKNCAddress;
let ouputLogString = "";
let ouputErrString = "";
let nodeId = 0;


// show / not show
// set to 0 to avoid showing in report
//////////////////
const runExpectedRate = 1;
const runWhiteList = 1;
const runFeeBurner = 1;
const printAdminETC = 1;
const showStepFunctions = 1;
const readTokenDataInConvRate = true;
const verifyWhitelistedAddresses = false;
const saveSpyrosDict = false;
const verifyTokenDataOnblockChain = false;
const spyrosDictPath = './spyrosOutputfile.json';

// code
////////
////////
const mainnetUrls = ['https://mainnet.infura.io',
                     'https://semi-node.kyber.network',
                     'https://api.mycryptoapi.com/eth',
                     'https://api.myetherapi.com/eth',
                     'https://mew.giveth.io/'];

const kovanPublicNode = 'https://kovan.infura.io';
const ropstenPublicNode = 'https://ropsten.infura.io';

let infuraUrl = '';
const localURL = 'http://localhost';
const solcOutputPath = "./solcOuput.json";
const SpyrosDict = {};


let deployInputJsonPath = '';

//run the code
main();

async function main (){
    if (processScriptInputParameters() == false) {
        printHelp();
        return;
    }

    await getCompiledContracts();

    await init(infuraUrl);

    if (await readDeploymentJSON(deployInputJsonPath) == false) {
        printHelp();
        return;
    };

    await readKyberNetwork(kyberNetworkAdd);

    //write output logs
    let fileName = deployInputJsonPath + ".log";
    fs.writeFileSync(fileName, ouputLogString, function(err) {
        if(err) {
            return console.log(err);
        }

        myLog(0, 1, "saved log to: " + fileName);
    });

    fileName = deployInputJsonPath + ".err";
    fs.writeFileSync(fileName, ouputErrString, function(err) {
        if(err) {
            return console.log(err);
        }

        myLog(0, 1, "saved error file to: " + fileName);
    });

    if (saveSpyrosDict == true) {
        const spyrosJsonOut = JSON.stringify(SpyrosDict, null, 2);
        fs.writeFileSync(spyrosDictPath, spyrosJsonOut);
    }
}


//functions
///////////
function processScriptInputParameters() {
    if (process.argv.length < 4) {
        myLog(0, 0, '');
        myLog(1, 0, "error: not enough argument. Required 2. Received  " + (process.argv.length - 2) + " arguments.");
        return false;
    }

    switch (process.argv[2]){
        case '1':
        case 'm':
            if (process.argv.length > 4) {
                nodeId = process.argv[4];
            } else {
                nodeId = 0;
            };
            infuraUrl = mainnetUrls[nodeId];
            break;
        case '2':
        case 'k':
            infuraUrl = kovanPublicNode;
            break;
        case '3':
        case 'r':
            infuraUrl = ropstenPublicNode;
            break;
        default: {
            myLog(0, 0, '');
            myLog(1, 0, "error: invalid 1st parameter: " + process.argv[2])
            return false;
        }
    }

    deployInputJsonPath = process.argv[3];

    if (process.argv.length > 4) {
        nodeId = process.argv[4];
    } else {
        nodeId = 0;
    }

}

function printHelp () {
    console.log("usage: \'node readVerifyDeployment.js network inputFile nodeID\'.");
    console.log("network options: m / k / r.  (m = mainnet, k = kovan, r = ropsten)");
    console.log("nodeID: 0 - 3 for different public nodes for mainnet")
    console.log("input file = deployment summary json file. Insert path from current directory.");
    console.log("Ex: \'node readVerifyDeployment.js m mainnet.json\'");
    console.log("Another example: \'node readVerifyDeployment.js k kovanOut.json\'");
}


async function readKyberNetwork(kyberNetworkAdd){
    let abi = solcOutput.contracts["KyberNetwork.sol:KyberNetwork"].interface;
    Network = await new web3.eth.Contract(JSON.parse(abi), kyberNetworkAdd);

    //verify binary as expected.
    let blockCode = await web3.eth.getCode(kyberNetworkAdd);
    let solcCode = '0x' + (solcOutput.contracts["KyberNetwork.sol:KyberNetwork"].runtimeBytecode);

    myLog(0, 0, (""));
    myLog(0, 0, ("kyberNetworkAdd: " + kyberNetworkAdd));
    myLog(0, 0, ("------------------------------------------------------------"));

    if (blockCode != solcCode){
//        myLog(1, 0, "blockchain Code:");
//        myLog(0, 0, blockCode);
        myLog(0, 0, '');
        myLog(1, 0, "Byte code from block chain doesn't match locally compiled code.")
        myLog(0, 0, '')
    } else {
        myLog(0, 0, "Code on blockchain matches locally compiled code");
        myLog(0, 0, '');
    }

    //read addresses and create contract instances.
    feeBurnerAdd = (await Network.methods.feeBurnerContract().call()).toLowerCase();
    whiteListAdd = (await Network.methods.whiteListContract().call()).toLowerCase();
    expectedRateAdd = (await Network.methods.expectedRateContract().call()).toLowerCase();

    myLog(0, 1, ("enable: " + await Network.methods.enabled().call() + "!!!"));
    await printAdminAlertersOperators(Network, "KyberNetwork");
    myLog((feeBurnerAdd!=jsonFeeBurnerAdd), 0, ("feeBurnerAdd: " + feeBurnerAdd));
    myLog((whiteListAdd == 0), 0, ("whiteListAdd: " + whiteListAdd));
    myLog((expectedRateAdd == 0), 0, ("expectedRateAdd: " + expectedRateAdd));

    let maxGas = await Network.methods.maxGasPrice().call();
    myLog((maxGas != jsonMaxGasPrice), maxGas < 10000, ("maxGas: " + maxGas + " = " + (maxGas  / 1000 / 1000 / 1000) + " gwei"));

    let negligibleRateDiff = await Network.methods.negligibleRateDiff().call();
    myLog((negligibleRateDiff != jsonNegDiffBps), 0, ("negligibleRateDiff: " + negligibleRateDiff + " = " + bpsToPercent(negligibleRateDiff) + "%"));


    numReserves = await Network.methods.getNumReserves().call();
    let reservesAddresses = await Network.methods.getReserves().call();
    for (let i = 0; i < numReserves; i++) {
        reservesAdd[i] =  (reservesAddresses[i]).toLowerCase();
        myLog((i == 0 && jsonReserveAdd != reservesAdd[0]), 0, ("reserveAdd " + i + ": " + reservesAdd[i]));
    }

    await readWhiteListData(whiteListAdd);
    await readExpectedRateData(expectedRateAdd);

    // now reserves
    for (let i = 0; i < numReserves; i++) {
        await readReserve(reservesAdd[i], i, (reservesAdd[i] == jsonReserveAdd));
    }
};

