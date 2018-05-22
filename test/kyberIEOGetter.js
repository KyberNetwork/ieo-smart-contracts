const TestToken = artifacts.require("./mockContracts/TestToken.sol");
const KyberIEO = artifacts.require("./KyberIEO.sol");
const KyberIEOGetter = artifacts.require("./KyberIEOGetter.sol");
const IEORate = artifacts.require("./IEORate.sol");

const Helper = require("./helper.js");
const BigNumber = require('bignumber.js');

let admin;
let operator;
let someUser;
let contributionWallet = '0x123456789';
let dayInSecs = 24 * 60 * 60;
let hourInSecs = 60 * 60;
let kyberIEOGetter;

//multiple IEO instances
let numIEOs = 5;
let rateNumerator = [];
let rateDenominator = [];
let kyberIEOs = [];
let kyberIEOsAddr = [];
let IEORateInst = [];
let IEORateAddress = [];
let cappedStartTime = [];
let openStartTime = [];
let endTime = [];
let capsWei = [];
let IEOIds = [];
let IEOTokens = [];
let tokenDecimals = [];
let kyberIEOTokenBalanceTwei = [];
let raisedWei = [];
let distributedTokens = [];

let approveValueInfinite = (new BigNumber(2)).pow(255);

//signed contributor value
let signer = Helper.getSignerAddress();

//users
let usersID = []
let vUser = [];
let rUser = [];
let sUser = [];
let userAddress = [];


contract('KyberIEOGetter', function(accounts) {

    it("Init signatures", async function () {
        admin = accounts[0];
        operator = accounts[1];
        someUser = accounts[2];

        for (let i = 0; i < numIEOs; i++) {

            IEOIds[i] = 100 * 1 + i * 1;

            let sig;
            usersID[i] = '0x123456789' + i;
            userAddress[i] = accounts[3 * 1 + i * 1];
            sig = Helper.getContributionSignature(userAddress[i], usersID[i], IEOIds[i]);
            vUser[i] = sig.v;
            rUser[i] = sig.r;
            sUser[i] = sig.s;
        }
    });

    it("Init all IEO tokens and IEO instances, IEO Rate instances. test getters", async function () {
        for(let i = 0; i < numIEOs; i++) {
            //tokens
            tokenDecimals[i] = (10 * 1 + i * 1)
            IEOTokens[i] = await TestToken.new("IEO Token " + i, "IEO" + i, tokenDecimals[i]);

            let now = await web3.eth.getBlock('latest').timestamp;
            //        console.log("now " + now);

            capsWei[i] = new BigNumber(10).pow(tokenDecimals[i] - 1);

            cappedStartTime[i] = now * 1 + dayInSecs * 1 + hourInSecs * i;
            openStartTime[i] = now * 1 + dayInSecs * 2 + hourInSecs * i;
            endTime[i] = now * 1 + dayInSecs * 3 + hourInSecs * i;
            //api: admin, _contributionWallet, _token, _contributorCapWei, _IEOId,  _cappedIEOTime, _openIEOTime, _endIEOTime
            kyberIEOs[i] = await KyberIEO.new(admin, contributionWallet, IEOTokens[i].address, capsWei[i].valueOf(), IEOIds[i],
                            cappedStartTime[i], openStartTime[i], endTime[i]);

            kyberIEOsAddr[i] = kyberIEOs[i].address;
            await kyberIEOs[i].addOperator(signer);

            kyberIEOTokenBalanceTwei[i] = new BigNumber(10).pow(tokenDecimals[i] + 3 * 1);

            //send tokens to KyberIEO
            await IEOTokens[i].transfer(kyberIEOsAddr[i], kyberIEOTokenBalanceTwei[i].valueOf()) ;

            //rate
            rateNumerator[i] = 15 * 1 + i * 1;
            rateDenominator[i] = 16 * 1 + i * 2;
            IEORateAddress[i] = await kyberIEOs[i].IEORateContract();
            IEORateInst[i] = await IEORate.at(IEORateAddress[i]);

            await IEORateInst[i].addOperator(operator);
            await IEORateInst[i].setRateEthToToken(rateNumerator[i], rateDenominator[i], {from: operator});

            let rate = await kyberIEOs[i].getRate();
            assert.equal(rate[0].valueOf(), rateNumerator[i], "wrong numerator value");
            assert.equal(rate[1].valueOf(), rateDenominator[i], "wrong denominator value");
        }
    });

    it("contribute per IEO.", async function () {
        for(let i = 0; i < numIEOs; i++) {
            raisedWei[i] = 430 * 1 + 530 * i;

            let isStarted = await kyberIEOs[i].IEOStarted();

            while (isStarted == false) {
                await Helper.sendPromise('evm_increaseTime', [(hourInSecs)]);
                await Helper.sendPromise('evm_mine', []);
                isStarted = await kyberIEOs[i].IEOStarted();
            }

            await kyberIEOs[i].contribute(userAddress[i], usersID[i], vUser[i], rUser[i], sUser[i], {value: raisedWei[i], from: userAddress[i]});

            let expectedTokenQty = (new BigNumber(raisedWei[i])).multipliedBy(rateNumerator[i]).div(rateDenominator[i]);
            distributedTokens[i] = expectedTokenQty.minus(expectedTokenQty.mod(1));
            let rxQuantity = await IEOTokens[i].balanceOf(userAddress[i]);
//            log("rx quantity " + rxQuantity.valueOf());
            assert.equal(rxQuantity.valueOf(), distributedTokens[i].valueOf());
        }
    });

    it("test single IEO getter.", async function () {
        kyberIEOGetter = await KyberIEOGetter.new();

        for (let i = 0; i < 3; i++) {
            let IEOData = await kyberIEOGetter.getIEOInfo(kyberIEOsAddr[i]);
//            log ("IEOData")
//            log(IEOData)

            //times
            assert.equal(IEOData[0][0].valueOf(), cappedStartTime[i]);
            assert.equal(IEOData[0][1].valueOf(), openStartTime[i]);
            assert.equal(IEOData[0][2].valueOf(), endTime[i]);

            let isStart = await kyberIEOs[i].IEOStarted();
            let isOpenStart = await kyberIEOs[i].openIEOStarted();
            let isEnd = await kyberIEOs[i].IEOEnded();
            let isHalted = await kyberIEOs[i].haltedIEO();

            //flags
            assert.equal(IEOData[1][0].valueOf(), isStart);
            assert.equal(IEOData[1][1].valueOf(), isOpenStart);
            assert.equal(IEOData[1][2].valueOf(), isEnd);
            assert.equal(IEOData[1][3].valueOf(), isHalted);

            //rates
            assert.equal(IEOData[2][0].valueOf(), rateNumerator[i]);
            assert.equal(IEOData[2][1].valueOf(), rateDenominator[i]);

            //amounts
            assert.equal(IEOData[3][0].valueOf(), distributedTokens[i]);
            assert.equal(IEOData[3][1].valueOf(), raisedWei[i]);
            assert.equal(IEOData[3][2].valueOf(), capsWei[i]);
            assert.equal(IEOData[3][3].valueOf(), (kyberIEOTokenBalanceTwei[i] - distributedTokens[i]));
            
            //token data
            assert.equal(IEOData[4].valueOf(), tokenDecimals[i]);
            assert.equal(IEOData[5].valueOf(), IEOTokens[i].address);
            assert.equal(IEOData[6].valueOf(), (await IEOTokens[i].symbol()));
        }
    });

    it("test multiple IEO getter.", async function () {
        let IEOsData = await kyberIEOGetter.getIEOsInfo(kyberIEOsAddr);
//        log ("IEOsData")
//        log(IEOsData)

        for (let i = 0; i < numIEOs; i++) {
            //amounts
            assert.equal(IEOsData[0][i].valueOf(), distributedTokens[i]);
            assert.equal(IEOsData[1][i].valueOf(), (kyberIEOTokenBalanceTwei[i] - distributedTokens[i]));
            assert.equal(IEOsData[2][i].valueOf(), IEOTokens[i].address);
            let bufStr = hexStrToBytes(IEOsData[3][i].valueOf());
            let res = '';
git gig            for (let i = 0 ; i < bufStr.length; i++) {
                res += String.fromCharCode(bufStr[i]);
            }
            assert.equal(res, (await IEOTokens[i].symbol()))
            assert.equal(IEOsData[4][i].valueOf(), tokenDecimals[i]);
         }
    });
});


function log (string) {
    console.log(string);
};

function hexStrToBytes (hexStr) {
    let strCut = hexStr.slice(2);

    // Convert a string to a byte array
    for (var bytes = [], c = 0; c < strCut.length; c += 2) {
        let next = parseInt(strCut.substr(c, 2), 16);
        if (next == 0) break;
        bytes.push(next);
    }

    return bytes;
}