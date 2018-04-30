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
let rateDenominator = 39;
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
let tokenDecimals = 7;
let kyberIEONumTokenTwei = (new BigNumber(10)).pow((tokenDecimals * 1 + 12 * 1));
let raisedWei = 0;
let distributedTokensTwei = 0;
let contributorPayedWeiSoFar = 0;
let contributorTokenTweiBalance = 0;
let contributionWalletStartBalance;
//signed contributor value
let v = '0x1b';
let r = '0x737c9fb533be22ea2f400a2b9388ff28a1489fb76f5e852e7c20fec63da7b039';
let s = '0x07e08845abf71a4d6538e6c91d27b6b1d4b5af8d7be1a8e0c683b03fd0448e8d';
let contributor = '0x3ee48c714fb8adc5376716c69121009bc13f3045';


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
        someUser = accounts[4];

        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
        //api: admin, _contributionWallet, _token, _contributorCapWei, _IEOId,  _cappedIEOTime, _openIEOTime, _endIEOTime
        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(operator);

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
            await await kyberIEO.contribute(contributor, v, r, s, {value: weiValue.valueOf(), from: contributor});
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

    it("test get contributor remaining cap in IEO stages + contributions.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;

        cappedStartTime = now;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;

        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(operator);

        kyberIEONumTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEONumTokenTwei.valueOf());

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        cap = await kyberIEO.getContributorRemainingCap(contributor);;
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap shold be as user cap now");

        //contribute and see eligible decrease.
        let weiValue = 10000;
        let result = await kyberIEO.contribute(contributor, v, r, s, {value: weiValue, from: contributor});

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(contributor);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(contributor);;
        assert.equal(cap.valueOf(), capWei.minus(weiValue).valueOf(), "cap shold be as user cap now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await kyberIEO.getContributorRemainingCap(someUser);;
        assert.equal(cap.valueOf(), maxCapWei.valueOf(), "cap shold be max Cap");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await kyberIEO.getContributorRemainingCap(someUser);;
        assert.equal(cap, 0, "cap shold be 0");
    });
});