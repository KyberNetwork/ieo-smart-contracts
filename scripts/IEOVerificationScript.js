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

const {inputPath, network} = require('yargs')
    .usage('Usage: $0 --input-path [path] --network (m-mainnet, r-ropsten, k-kovan)')
    .demandOption(['inputPath', 'network'])
    .argv;

const solc = require('solc')

// Copy & Paste this
Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
if(!Date.now) Date.now = function() { return new Date(); }
Date.time = function() { return Date.now().getUnixTime(); }

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

let jsonWhiteListedAddresses;

let jsonRateNumerator;
let jsonRateDenominator;

let outputLogString;
let outputErrString;

function dateToBigNumber(dateString) {
    return new BigNumber(new Date(dateString).getUnixTime());
}

function parseInput(jsonInput) {
    jsonIEOAddress = (jsonInput["IEO Address"]).toLowerCase();
    jsonIEORateAddress = (jsonInput["IEO Rate Address"]).toLowerCase();

    const ctorParams = jsonInput["constructor"];
    jsonAdmin = (ctorParams["admin"]).toLowerCase();
    jsonProjectWallet = ctorParams["projectWallet"];
    jsonToken = ctorParams["token"];
    jsonContributorCapWei = new BigNumber(ctorParams["contributorCapWei"]);
    jsonIEOId = new BigNumber(ctorParams["IEOId"]);
    jsonCappedIEOStart = dateToBigNumber(ctorParams["cappedIEOStart"]);
    jsonOpenIEOStartTime = dateToBigNumber(ctorParams["publicIEOStartTime"]);
    jsonPublicIEOEndTime = dateToBigNumber(ctorParams["publicIEOEndTime"]);

    // operators
    const operatorParams = jsonInput["operators"];
    jsonRateOperator = operatorParams["rate"].toLowerCase();
    jsonKycOperator = operatorParams["kyc"].toLowerCase();
    jsonAlerter = operatorParams["alerter"].toLowerCase();

    //white listed addresses
    jsonWhiteListedAddresses = jsonInput["whiteListAddresses"];

    // rate
    const rateParams = jsonInput["rate"];
    jsonRateNumerator = new BigNumber(rateParams["numerator"]);
    jsonRateDenominator = new BigNumber(rateParams["denominator"]);
};

main();

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

    const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

    myLog(0, 0, "parsing input")

    try{
        content = fs.readFileSync(inputPath, 'utf8');
        //console.log(content.substring(2892,2900));
        //console.log(content.substring(3490,3550));
        jsonInput = JSON.parse(content);
        parseInput(jsonInput);
    }
    catch(err) {
        console.log(err);
        process.exit(-1)
    }

    myLog(0, 0, "done parsing input")


    myLog(0, 0, "starting compilation");
    const output = await solc.compile({ sources: input }, 1);
    console.log(output.errors);
    //console.log(output);
    myLog(0, 0, "finished compilation");

    //read kyber IEO
    ////////////////
    let abi = output.contracts["KyberIEO.sol:KyberIEO"].interface;
    IEOInst = await new web3.eth.Contract(JSON.parse(abi), jsonIEOAddress);

    //verify binary as expected.
    let blockCode = await web3.eth.getCode(jsonIEOAddress);
    let solcCode = '0x' + (output.contracts["KyberIEO.sol:KyberIEO"].runtimeBytecode);

    myLog(0, 0, (""));
    myLog(0, 0, ("KyberIEO: " + jsonIEOAddress));
    myLog(0, 0, ("-----------------------------------------------------"));

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

    let token = (await IEOInst.methods.token().call()).toLowerCase();
    compareAndLog("ProjectWallet: " ,jsonToken, token);

    let contributorCapWei = (await IEOInst.methods.contributorCapWei().call()).toLowerCase();
    compareAndLog("contributorCapWei: " ,jsonContributorCapWei, contributorCapWei);

    let IEOId = (await IEOInst.methods.getIEOId().call()).toLowerCase();
    compareAndLog("IEOId: " ,jsonIEOId, IEOId);

    let cappedIEOStart = (await IEOInst.methods.cappedIEOStartTime().call()).toLowerCase();
    compareAndLog("cappedIEOStart time: ", jsonCappedIEOStart, cappedIEOStart);

    let openIEOStart = (await IEOInst.methods.openIEOStartTime().call()).toLowerCase();
    compareAndLog("openIEOStartTime: ", jsonOpenIEOStartTime, openIEOStart);

    let endIEOTime = (await IEOInst.methods.endIEOTime().call()).toLowerCase();
    compareAndLog("endIEOTime: ", jsonPublicIEOEndTime, endIEOTime);

    let admin = (await IEOInst.methods.admin().call()).toLowerCase();
    compareAndLog("admin: ", jsonAdmin, admin);

    let operators = (await IEOInst.methods.getOperators().call());
    for (let i = 0; i < operators.length; i++) {
        compareAndLog("operator " + i + ": ", jsonKycOperator, operators[i].toLowerCase());
    }

    for (let i = 0; i < jsonWhiteListedAddresses.length; i++) {
        let isListed = (await IEOInst.methods.whiteListedAddresses(jsonWhiteListedAddresses[i]).call());
        compareAndLog("whitelisted address " + i + ": " + jsonWhiteListedAddresses[i], isListed, true);
    }

    let alerters = (await IEOInst.methods.getAlerters().call());
    for (let i = 0; i < alerters.length; i++) {
        compareAndLog("alerter " + i + ": ", jsonAlerter, alerters[i].toLowerCase());
    }

    let raisedWei = (await IEOInst.methods.raisedWei().call()).toLowerCase();
    myLog(0, 0, ( "raisedWei: " + raisedWei));

    let distributedTokensTwei = (await IEOInst.methods.distributedTokensTwei().call()).toLowerCase();
    myLog(0, 0, ( "distributedTokensTwei: " + distributedTokensTwei));

    //handle IEO Rate
    /////////////////
    abi = output.contracts["IEORate.sol:IEORate"].interface;
    IEORateInst = await new web3.eth.Contract(JSON.parse(abi), IEORateAddress);

    //verify binary as expected.
    blockCode = await web3.eth.getCode(IEORateAddress);
    solcCode = '0x' + (output.contracts["IEORate.sol:IEORate"].runtimeBytecode);

    myLog(0, 0, (""));
    myLog(0, 0, ("rate contract: " + IEORateAddress));
    myLog(0, 0, ("--------------------------------------------------------"));

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
    let ethToTokenNumerator = (await IEORateInst.methods.ethToTokenNumerator().call()).toLowerCase();
    compareAndLog("IEO Rate numerator: " ,jsonRateNumerator, ethToTokenNumerator);

    //read and compare parameters.
    let ethToTokenDenominator = (await IEORateInst.methods.ethToTokenDenominator().call()).toLowerCase();
    compareAndLog("IEO Rate denominator: " ,jsonRateDenominator, ethToTokenDenominator);

    admin = (await IEORateInst.methods.admin().call()).toLowerCase();
    compareAndLog("admin: ", jsonAdmin, admin);

    operators = (await IEORateInst.methods.getOperators().call());
    for (let i = 0; i < operators.length; i++) {
        compareAndLog("operator " + i + ": ", jsonRateOperator, operators[i].toLowerCase());
    }
}


function compareAndLog(string, jsonValue, rxValue) {
    if (jsonValue != rxValue) {
        myLog(1, 0, string + " json value: " + jsonValue + " not as received value: " + rxValue);
    } else {
        myLog(0, 0, string + rxValue + " as expected.");
    }
}

function myLog(error, highlight, string) {
    if (error) {
//        console.error(string);
        console.log('\x1b[31m%s\x1b[0m', string);
        outputErrString += "\nerror: " + string;
        outputLogString += "\nerror: " + string;
    } else if (highlight) {
        console.log('\x1b[33m%s\x1b[0m', string);
        outputErrString += "\nwarning: " + string;
        ouputLogString += "\nwarning: " + string;
    } else {
        console.log('\x1b[32m%s\x1b[0m', string);
        outputLogString += "\n     " + string;
    }
};

