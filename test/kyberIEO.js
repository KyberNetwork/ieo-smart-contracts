let Permissions = artifacts.require("./PermissionGroups.sol");
let Withdrawable = artifacts.require("./Withdrawable.sol");
let TestToken = artifacts.require("./mockContracts/TestToken.sol");
let KyberIEO = artifacts.require("./KyberIEO.sol");
let IEORate = artifacts.require("./IEORate.sol");

let Helper = require("./helper.js");
let BigNumber = require('bignumber.js');

let token;
let admin;
let operator;
let someUser;
let rateNumerator = 17;
let rateDenominator = 49;
let contributionWallet;
let IEOId = '0x1234';
let dayInSecs = 24 * 60 * 60;
let kyberIEO;
let IEORateInst;
let IEORateAddress;
let cappedStartTime;
let openStartTime;
let endTime;
let capWei = (new BigNumber(10)).pow(18).div(2); //0.5 ether
let maxCapWei = ((new BigNumber(2)).pow(256)).minus(1);
let contributor;
let tokenDecimals = 7;
let kyberIEONumTokenTwei = (new BigNumber(10)).pow((tokenDecimals * 1 + 2 * 1)); //100 tokens

contract('KyberIEO', function(accounts) {
    it("Init all values. test getters", async function () {
        admin = accounts[0];
        someUser = accounts[1];
        contributionWallet = accounts[2];
        operator = accounts[3];

        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
        //api: admin, _contributionWallet, _token, _contributorCapWei, _IEOId,  _cappedIEOTime, _openIEOTime, _endIEOTime
        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);

        //send tokens to KyberIEO
        await token.transfer(kyberIEO.address, kyberIEONumTokenTwei.valueOf()) ;

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        let rate = await kyberIEO.getRate();
        assert.equal(rate[0].valueOf(), rateNumerator, "wrong numerator value");
        assert.equal(rate[1].valueOf(), rateDenominator, "wrong denominator value");
    });

    it("test basic exchange.", async function () {

        let isStarted = await kyberIEO.contributeStarted();
        assert.equal(isStarted, false, "contribute should be true now");

        console.log(someUser);

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        isStarted = await kyberIEO.contributeStarted();
        assert.equal(isStarted, true, "contribute should be true now");

//        kyberIEO.contribute(someUser, )

    });

//    it("test eligible contributor remaining cap in contribute stages.", async function () {
//        let now = await web3.eth.getBlock('latest').timestamp;
////        console.log("now " + now);
//
//        cappedStartTime = now * 1 + dayInSecs * 1;
//        openStartTime = now * 1 + dayInSecs * 2;
//        endTime = now * 1 + dayInSecs * 3;
//
//        KyberIEO = await KyberIEO.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);
//
//        let cap = await KyberIEO.getContributorRemainingCap(someUser);
//        assert.equal(cap, 0, "cap should be 0");
//
//        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
//        await Helper.sendPromise('evm_mine', []);
//        cap = await KyberIEO.getContributorRemainingCap(someUser);;
//        assert.equal(cap.valueOf(), capWei.valueOf(), "cap shold be as user cap now");
//
//        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
//        await Helper.sendPromise('evm_mine', []);
//        cap = await KyberIEO.getContributorRemainingCap(someUser);;
//        assert.equal(cap.valueOf(), maxCapWei.valueOf(), "cap shold be max Cap");
//
//        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
//        await Helper.sendPromise('evm_mine', []);
//        cap = await KyberIEO.getContributorRemainingCap(someUser);;
//        assert.equal(cap, 0, "cap shold be 0");
//    });
//
//
//    it("test eligible behavior in contribute stages.", async function () {
//        let now = await web3.eth.getBlock('latest').timestamp;
////        console.log("now " + now);
//
//        cappedStartTime = now * 1 + dayInSecs * 1;
//        openStartTime = now * 1 + dayInSecs * 2;
//        endTime = now * 1 + dayInSecs * 3;
//
//        KyberIEO = await KyberIEO.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);
//
//        let eligible = await KyberIEO.eligible(someUser);
//        assert.equal(eligible, 0, "cap should be 0");
//
//        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
//        await Helper.sendPromise('evm_mine', []);
//        eligible = await KyberIEO.getContributorRemainingCap(someUser);;
//        assert.equal(eligible.valueOf(), capWei.valueOf(), "cap shold be as user cap now");
//
//        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
//        await Helper.sendPromise('evm_mine', []);
//        eligible = await KyberIEO.getContributorRemainingCap(someUser);;
//        assert.equal(cap.valueOf(), maxCapWei.valueOf(), "cap shold be max Cap");
//
//        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
//        await Helper.sendPromise('evm_mine', []);
//        eligible = await KyberIEO.getContributorRemainingCap(someUser);;
//        assert.equal(cap, 0, "cap shold be 0");
//    });

});