#!/usr/bin/env node

const Web3 = require("web3");
const fs = require("fs");
const path = require('path');
const RLP = require('rlp');
const BigNumber = require('bignumber.js');






const userID = '0x123456';
const userAddress = '0xD3a82C31CD398C3A12baA08395De7bf15A5c677a';







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
  "PermissionGroups.sol" : fs.readFileSync(contractPath + 'PermissionGroups.sol', 'utf8'),
  "TestToken.sol" : fs.readFileSync(contractPath + 'mockContracts/TestToken.sol', 'utf8')
};


function dateToBigNumber(dateString) {
    return new BigNumber(new Date(dateString).getUnixTime());
}

let jsonIEOAddress;

function parseInput(jsonInput) {
    jsonIEOAddress = (jsonInput["IEO Address"]).toLowerCase();
//    jsonIEORateAddress = (jsonInput["IEO Rate Address"]).toLowerCase();
//
//    const ctorParams = jsonInput["constructor"];
//    jsonAdmin = (ctorParams["admin"]).toLowerCase();
//    jsonProjectWallet = ctorParams["projectWallet"];
//    jsonToken = ctorParams["token"];
//    jsonContributorCapWei = new BigNumber(ctorParams["contributorCapWei"]);
//    jsonIEOId = new BigNumber(ctorParams["IEOId"]);
//    jsonCappedIEOStart = dateToBigNumber(ctorParams["cappedIEOStart"]);
//    jsonOpenIEOStartTime = dateToBigNumber(ctorParams["publicIEOStartTime"]);
//    jsonPublicIEOEndTime = dateToBigNumber(ctorParams["publicIEOEndTime"]);
//
//    // operators
//    const operatorParams = jsonInput["operators"];
//    jsonRateOperator = operatorParams["rate"].toLowerCase();
//    jsonKycOperator = operatorParams["kyc"].toLowerCase();
//    jsonAlerter = operatorParams["alerter"].toLowerCase();
//
//    //white listed addresses
//    jsonWhiteListedAddresses = jsonInput["whiteListAddresses"];
//
//    // rate
//    const rateParams = jsonInput["rate"];
//    jsonRateNumerator = new BigNumber(rateParams["numerator"]);
//    jsonRateDenominator = new BigNumber(rateParams["denominator"]);
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

    log("rpc URL " + rpcUrl);
    const web3 = new Web3(new Web3.providers.HttpProvider(rpcUrl));

    log("parsing input")

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

    log("done parsing input")


    log('solc.version')
    log(solc.version())

    log("starting compilation");
    const output = await solc.compile({ sources: input }, 1);
    console.log(output.errors);
    //console.log(output);
    log("finished compilation");

    //read kyber IEO
    ////////////////
    let abi = output.contracts["KyberIEO.sol:KyberIEO"].interface;
    let IEOInst = await new web3.eth.Contract(JSON.parse(abi), jsonIEOAddress);

    log('jsonIEOAddress')
    log(jsonIEOAddress)

    //verify binary as expected.
    //read and compare parameters.
    let token = (await IEOInst.methods.token().call());
    log("token address " + token);

    abi = output.contracts["TestToken.sol:TestToken"].interface;
    let tokenInst = await new web3.eth.Contract(JSON.parse(abi), token);
    log("token name " + (await tokenInst.methods.name().call()) )
    log("token symbol " + (await tokenInst.methods.symbol().call()) )
    log("token decimals " + (await tokenInst.methods.decimals().call()) )

    let cappedIEOStart = (await IEOInst.methods.cappedIEOStartTime().call()).toLowerCase();
    log("capped phase start " + timeConverter(cappedIEOStart));

    let openIEOStart = (await IEOInst.methods.openIEOStartTime().call()).toLowerCase();
    log("open phase start " + timeConverter(openIEOStart));

    let endIEOTime = (await IEOInst.methods.endIEOTime().call()).toLowerCase();
    log("End time        " + timeConverter(endIEOTime));

    let hardCap = (await tokenInst.methods.balanceOf(jsonIEOAddress).call()).toLowerCase();
    log("hard cap " + hardCap.valueOf());

    let raisedWei = (await IEOInst.methods.raisedWei().call()).toLowerCase();
    log( "raisedWei: " + raisedWei);

    let rate = (await IEOInst.methods.getRate().call());
    log("rate numerator: " + rate[0] + " denominator: " + rate[1])
    log(" numerator / denominator: " + rate[0] / rate[1]);

    let contributorCapWei = (await IEOInst.methods.contributorCapWei().call());
    let contributorCapTokens = (new BigNumber(contributorCapWei).div((new BigNumber(10)).pow(17))).valueOf() / 10;
    log("contributor cap wei: " + contributorCapWei)
    log("in tokens " + contributorCapTokens);

    contributorRemainingCapWei = (await IEOInst.methods.getContributorRemainingCap(userID).call());
    log("user ID " + userID + " remaining cap " + contributorRemainingCapWei);

    let distributedTokensTwei = (await IEOInst.methods.distributedTokensTwei().call()).toLowerCase();
    log("distributedTokensTwei: " + distributedTokensTwei);

    let userTwei = await tokenInst.methods.balanceOf(userAddress).call()
    let userTokens = (new BigNumber(userTwei).div((new BigNumber(10)).pow(17))).valueOf() / 10;
    log("user: " + userAddress + " Twei: " + userTwei);
    log("user tokens: " + userTokens.toString(10));

}

function log(string) {
    console.log(string);
}

function timeConverter(UNIX_timestamp){
    const a = new Date(UNIX_timestamp * 1000);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const year = a.getFullYear();
    const month = months[a.getMonth()];
    const date = a.getDate();
    const hour = a.getHours();
    const min = a.getMinutes();
    const sec = a.getSeconds();
    const time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
    return time;
}