const TestToken = artifacts.require("./mockContracts/TestToken.sol");
const KyberIEO = artifacts.require("./KyberIEO.sol");
const IEORate = artifacts.require("./IEORate.sol");

const Helper = require("./helper.js");
const BigNumber = require('bignumber.js');

let token;
let admin;
let operator;
let alerter;
let someUser;
let rateNumerator = 17;
let rateDenominator = 39;
let contributionWallet;
let dayInSecs = 24 * 60 * 60;
let kyberIEO;
let IEORateInst;
let IEORateAddress;
let cappedStartTime;
let openStartTime;
let endTime;
let capWei = (new BigNumber(10)).pow(18).div(2); //0.5 ether
let maxCapWei = ((new BigNumber(2)).pow(256)).minus(1);
let tokenDecimals = 7;
let kyberIEONumTokenTwei = (new BigNumber(10)).pow((tokenDecimals * 1 + 12 * 1));
let raisedWei = 0;
let distributedTokensTwei = 0;
let contributorPayedWeiSoFar = 0;
let contributorTokenTweiBalance = 0;
let contributionWalletStartBalance;

//signed contributor value
const v = '0x1b';
const r = '0x737c9fb533be22ea2f400a2b9388ff28a1489fb76f5e852e7c20fec63da7b039';
const s = '0x07e08845abf71a4d6538e6c91d27b6b1d4b5af8d7be1a8e0c683b03fd0448e8d';
const contributor = '0x3ee48c714fb8adc5376716c69121009bc13f3045';
const signer = '0xcefff360d0576e3e63fd5e75fdedcf14875b184a';
let IEOId = '0x1234';

contract('KyberIEO', function(accounts) {
    it("Init all values. test getters", async function () {
        admin = accounts[0];

        if (contributor != accounts[1]) {
            console.log("for testing this script testrpc must be run with known menomincs so keys are known in advance")
            console.log("If keys are not known can't use existing signatures that verify user.");
            console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
            assert(false);
        }

        contributionWallet = '0x1c67a930777215c9d4c617511c229e55fa53d0f8';
        contributionWalletStartBalance = await Helper.getBalancePromise(contributionWallet);

        operator = accounts[3];
        if (signer != operator) {
            console.log("for testing this script testrpc must be started with known menomincs so keys are well known.")
            console.log("If keys are not known can't use existing signatures that verify user.");
            console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
            assert(false);
        }
        someUser = accounts[4];
        alerter = accounts[5];

        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
        //api: admin, _contributionWallet, _token, _contributorCapWei, _IEOId,  _cappedIEOTime, _openIEOTime, _endIEOTime
        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(operator);
        await kyberIEO.addAlerter(alerter);

        //send tokens to KyberIEO
        await token.transfer(kyberIEO.address, kyberIEONumTokenTwei.valueOf()) ;
//        let kyberIEOTokensTwei = await token.balanceOf(kyberIEO.address);
//        console.log('kyberIEOTokensTwei')
//        console.log(kyberIEOTokensTwei)

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        let rate = await kyberIEO.getRate();
        assert.equal(rate[0].valueOf(), rateNumerator, "wrong numerator value");
        assert.equal(rate[1].valueOf(), rateDenominator, "wrong denominator value");
    });

    it("test basic exchange.", async function () {
        let weiValue = 10000;
        let isStarted = await kyberIEO.IEOStarted();
        assert.equal(isStarted, false, "IEO should be true now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        isStarted = await kyberIEO.IEOStarted();
        assert.equal(isStarted, true, "IEO should be true now");

        let result = await kyberIEO.contribute(contributor, v, r, s, {value: weiValue, from: contributor});

        contributorPayedWeiSoFar += weiValue * 1;

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(contributor);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        contributorTokenTweiBalance += expectedTokenQty * 1;

        raisedWei += weiValue * 1;
        let rxRaisedWei = await kyberIEO.raisedWei();
        assert.equal(raisedWei.valueOf(), rxRaisedWei.valueOf());

        distributedTokensTwei += 1 * expectedTokenQty;
        let rxDistributedTokensTwei = await kyberIEO.distributedTokensTwei();
        assert.equal(rxDistributedTokensTwei.valueOf(), distributedTokensTwei.valueOf());

        let contributionWalletBalance = await Helper.getBalancePromise(contributionWallet);
        assert.equal(contributionWalletBalance.minus(contributionWalletStartBalance).valueOf(), rxRaisedWei.valueOf())
    });

    it("test over cap exchange in capped stage.", async function () {
        let weiValue = capWei.plus(1000);
        let expectedWeiPayment = capWei.minus(contributorPayedWeiSoFar);
        let expectedTokenQty = (new BigNumber(expectedWeiPayment)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));

        let contributorStartWeiBalance = await Helper.getBalancePromise(contributor);

        let result = await kyberIEO.contribute(contributor, v, r, s, {value: weiValue.valueOf(), from: contributor});
        assert.equal(result.logs[0].args.distributedTokensTwei.valueOf(), expectedTokenQty.valueOf())
        assert.equal(result.logs[0].args.payedWei.valueOf(), expectedWeiPayment.valueOf())
        assert.equal(result.logs[0].args.contributor, contributor);
//        console.log(result.logs[0].args)

        let expectedTokenQtyThisTrade = (new BigNumber(expectedWeiPayment)).multipliedBy(rateNumerator).div(rateDenominator).toFixed(0);
        contributorTokenTweiBalance += expectedTokenQtyThisTrade * 1;

        let rxQuantity = await token.balanceOf(contributor);
        assert.equal(rxQuantity.valueOf(), contributorTokenTweiBalance.valueOf());

        raisedWei += expectedWeiPayment * 1;
        let rxRaisedWei = await kyberIEO.raisedWei();
        assert.equal(raisedWei.valueOf(), rxRaisedWei.valueOf());

        distributedTokensTwei += 1 * expectedTokenQtyThisTrade;
        let rxDistributedTokensTwei = await kyberIEO.distributedTokensTwei();
        assert.equal(rxDistributedTokensTwei.valueOf(), distributedTokensTwei.valueOf());
    });

    it("test contribution reverted when cap reached and later success in open IEO stage.", async function () {
        let weiValue = 100000;

        let openIEOStarted = await kyberIEO.openIEOStarted();
        assert.equal(openIEOStarted, false, "open IEO started should be false now");
        assert.equal((await kyberIEO.IEOEnded()), false, "IEO ended should be false now");

        //see trade reverted if not open stage
        try {
            await kyberIEO.contribute(contributor, v, r, s, {value: weiValue.valueOf(), from: contributor});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //advance and see open IEO started
        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        openIEOStarted = await kyberIEO.openIEOStarted();
        assert.equal(openIEOStarted, true, "open IEO started should be true now");
        assert.equal((await kyberIEO.IEOEnded()), false, "IEO ended should be false now");

        let result = await kyberIEO.contribute(contributor, v, r, s, {value: weiValue.valueOf(), from: contributor});

        let expectedTokenQtyThisTrade = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQtyThisTrade = expectedTokenQtyThisTrade.minus(expectedTokenQtyThisTrade.mod(1));
        contributorTokenTweiBalance += expectedTokenQtyThisTrade.valueOf() * 1;

        assert.equal(result.logs[0].args.distributedTokensTwei.valueOf(), expectedTokenQtyThisTrade.valueOf())

        let rxQuantity = await token.balanceOf(contributor);
        assert.equal(rxQuantity.valueOf(), contributorTokenTweiBalance.valueOf());

        raisedWei += weiValue * 1;
        let rxRaisedWei = await kyberIEO.raisedWei();
        assert.equal(raisedWei.valueOf(), rxRaisedWei.valueOf());

        distributedTokensTwei += 1 * expectedTokenQtyThisTrade;
        let rxDistributedTokensTwei = await kyberIEO.distributedTokensTwei();
        assert.equal(rxDistributedTokensTwei.valueOf(), distributedTokensTwei.valueOf());
    });

    it("test contribution resulting in 0 tokens is reverted.", async function () {
        let weiValue = 1;
        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        assert.equal(expectedTokenQty.valueOf(), 0);

        try {
            await kyberIEO.contribute(contributor, v, r, s, {value: weiValue.valueOf(), from: contributor});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        // see success with same parameters and higher wei value
        weiValue = 20;
        expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        assert(expectedTokenQty.valueOf() > 0);
        await kyberIEO.contribute(contributor, v, r, s, {value: weiValue.valueOf(), from: contributor});
    });

    it("test halt IEO, resume IEO can be done only by alerter / admin.", async function () {
        let rxIEOHalted = await kyberIEO.haltedIEO();
        assert.equal(rxIEOHalted.valueOf(), false);

        try {
            await kyberIEO.haltIEO({from: admin});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        rxIEOHalted = await kyberIEO.haltedIEO();
        assert.equal(rxIEOHalted.valueOf(), false);

        await kyberIEO.haltIEO({from: alerter});

        rxIEOHalted = await kyberIEO.haltedIEO();
        assert.equal(rxIEOHalted.valueOf(), true);

        try {
            await kyberIEO.resumeIEO({from: alerter});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        rxIEOHalted = await kyberIEO.haltedIEO();
        assert.equal(rxIEOHalted.valueOf(), true);

        await kyberIEO.resumeIEO({from: admin});

        rxIEOHalted = await kyberIEO.haltedIEO();
        assert.equal(rxIEOHalted.valueOf(), false);
    });

    it("test get contributor remaining cap in IEO stages + contribute per stage.", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;
        cappedStartTime = now + 1;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(operator);
        await kyberIEO.addAlerter(alerter);

        await Helper.sendPromise('evm_increaseTime', [2]);
        await Helper.sendPromise('evm_mine', []);

        kyberIEONumTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEONumTokenTwei.valueOf());

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        cap = await kyberIEO.getContributorRemainingCap(contributor);;
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute and see eligible decrease.
        let weiValue = 10000;
        let result = await kyberIEO.contribute(contributor, v, r, s, {value: weiValue, from: contributor});

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(contributor);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(contributor);
        assert.equal(cap.valueOf(), capWei.minus(weiValue).valueOf(), "cap should be as user cap now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await kyberIEO.getContributorRemainingCap(someUser);;
        assert.equal(cap.valueOf(), maxCapWei.valueOf(), "cap should be max Cap");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await kyberIEO.getContributorRemainingCap(someUser);;
        assert.equal(cap, 0, "cap should be 0");

        // see trade reverted after IEO end
        try {
            await kyberIEO.contribute(contributor, v, r, s, {value: weiValue, from: contributor});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }
    });

    it("test contribution while calling halt IEO and resume IEO API.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;

        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        cappedStartTime = now + 1;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(operator);
        await kyberIEO.addAlerter(alerter);

        await Helper.sendPromise('evm_increaseTime', [2]);
        await Helper.sendPromise('evm_mine', []);

        kyberIEONumTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEONumTokenTwei.valueOf());

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        cap = await kyberIEO.getContributorRemainingCap(contributor);;
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute
        let weiValue = 10000;
        let result = await kyberIEO.contribute(contributor, v, r, s, {value: weiValue, from: contributor});

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(contributor);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        // halt IEO and see can't contribute
        result = await kyberIEO.haltIEO({from: alerter});
        assert.equal(result.logs[0].args.sender, alerter);

        // see trade reverted when IEO halted
        try {
            await kyberIEO.contribute(contributor, v, r, s, {value: weiValue, from: contributor});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        // resume IEO and see can contribute
        result = await kyberIEO.resumeIEO({from: admin});
        assert.equal(result.logs[0].args.sender, admin);

        result = await kyberIEO.contribute(contributor, v, r, s, {value: weiValue, from: contributor});

        let additionalTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        additionalTokenQty = additionalTokenQty.minus(additionalTokenQty.mod(1));
        expectedTokenQty = expectedTokenQty.plus(additionalTokenQty);
        rxQuantity = await token.balanceOf(contributor);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());
    });

    it("test contribution wallet and debug buy.", async function () {
        let weiValue = 10000;

        let walletAddress = await kyberIEO.contributionWallet();
        assert.equal(walletAddress, contributionWallet);

        let walletStartBalanceWei = new BigNumber(await Helper.getBalancePromise(contributionWallet));

        let debugBuyWei = 123;
        await kyberIEO.debugBuy({value: debugBuyWei});

        let walletBalanceWei = await Helper.getBalancePromise(contributionWallet);

        assert.equal(walletBalanceWei.valueOf(), walletStartBalanceWei.plus(debugBuyWei).valueOf());
    });

    it("verify deploy contract revert for bad values.", async function () {

        let now = await web3.eth.getBlock('latest').timestamp;
    //        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
        //api: admin, _contributionWallet, _token, _contributorCapWei, _IEOId,  _cappedIEOTime, _openIEOTime, _endIEOTime
        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);

        // see reverted when token address 0
        try {
            kyberIEO = await KyberIEO.new(admin, contributionWallet, 0, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        // see reverted when wallet addresss 0
        try {
            kyberIEO = await KyberIEO.new(admin, 0, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }
    });

    it("verify contribute reverted when rate is 0.", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let weiValue = 30;
        let now = await web3.eth.getBlock('latest').timestamp;

        cappedStartTime = now + 1;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(operator);

        await Helper.sendPromise('evm_increaseTime', [2]);
        await Helper.sendPromise('evm_mine', []);

        kyberIEONumTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEONumTokenTwei.valueOf());

        //contribute before setting rate
        try {
            result = await kyberIEO.contribute(contributor, v, r, s, {value: weiValue, from: contributor});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

//        set rate and see success
        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        result = await kyberIEO.contribute(contributor, v, r, s, {value: weiValue, from: contributor});
        assert.equal(result.logs[0].args.payedWei.valueOf(), weiValue)
    });

    it("verify contribute reverted when wei payment is 0.", async function () {
        let weiValue = 0;

        try {
            result = await kyberIEO.contribute(contributor, v, r, s, {value: weiValue, from: contributor});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }
    });
});