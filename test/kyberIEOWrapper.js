let TestToken = artifacts.require("./mockContracts/TestToken.sol");
let KyberIEO = artifacts.require("./KyberIEO.sol");
let KyberIEOWrapper = artifacts.require("./KyberIEOWrapper.sol");
let MockKyberNetwork = artifacts.require("./MockKyberNetwork.sol");
let IEORate = artifacts.require("./IEORate.sol");


let Helper = require("./helper.js");
let BigNumber = require('bignumber.js');

let IEOToken;
let otherToken;
let otherTokenDecimals = 18;
let otherTokenRate = (new BigNumber(10)).pow(otherTokenDecimals - 2);
let network;
let admin;
let operator;
let someUser;
let rateNumerator = 43;
let rateDenominator = 17;
let contributionWallet;
let IEOId = '0x1234';
let dayInSecs = 24 * 60 * 60;
let kyberIEO;
let kyberIEOWrapper;
let IEORateInst;
let IEORateAddress;
let cappedStartTime;
let openStartTime;
let endTime;
let capWei = (new BigNumber(10)).pow(3); //10000 wei
let tokenDecimals = 18;
let kyberIEONumTokenTwei = (new BigNumber(10)).pow((tokenDecimals * 1 + 9 * 1));
let etherAddress = '0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
let ratePrecision = (new BigNumber(10)).pow(18);
let approveValueInfinite = (new BigNumber(2)).pow(255);

//signed contributor value
let v = '0x1b';
let r = '0x737c9fb533be22ea2f400a2b9388ff28a1489fb76f5e852e7c20fec63da7b039';
let s = '0x07e08845abf71a4d6538e6c91d27b6b1d4b5af8d7be1a8e0c683b03fd0448e8d';
let contributor = '0x3ee48c714fb8adc5376716c69121009bc13f3045';


contract('KyberIEOWrapper', function(accounts) {
    it("Init network and test it.", async function () {
        admin = accounts[0];

        if (contributor != accounts[1]) {
            console.log("for testing this script testrpc must be run with known menomincs so keys are known in advance")
            console.log("If keys are not known can't use existing signatures that verify user.");
            console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
            assert(false);
        }

        contributionWallet = '0x1c67a930777215c9d4c617511c229e55fa53d0f8';

        operator = accounts[3];
        someUser = accounts[4];

        otherToken = await TestToken.new('other token', 'other', otherTokenDecimals);
        network = await MockKyberNetwork.new();

        //send ether to network
        let initialEther = (new BigNumber(10)).pow(18).multipliedBy(2); //1 ether
        await Helper.sendEtherWithPromise(accounts[7], network.address, initialEther.valueOf());

        await network.setPairRate(otherToken.address, etherAddress, otherTokenRate.valueOf());

        let userTokenQtyWei = (new BigNumber(10)).pow(otherTokenDecimals + 3 * 1);
        await otherToken.transfer(operator, userTokenQtyWei.valueOf());

        // trade
        let srcAmounTwei = 1000;
        let someUserInitialBalanceEther = await Helper.getBalancePromise(someUser);

        await otherToken.approve(network.address, approveValueInfinite.valueOf(), {from: operator});
        await network.trade(otherToken.address, srcAmounTwei, etherAddress, someUser, 100000000, 0, 0, {from: operator});

        let expectedEtherPayment = (new BigNumber(srcAmounTwei)).multipliedBy(otherTokenRate).div(ratePrecision);
        expectedEtherPayment = expectedEtherPayment.minus(expectedEtherPayment.mod(1));

        let expectedUserBalance = expectedEtherPayment.plus(someUserInitialBalanceEther);
        let userEtherBalance = await Helper.getBalancePromise(someUser);

        assert.equal(userEtherBalance.valueOf(), expectedUserBalance.valueOf());
    });

    it("Init all contracts. test getters", async function () {

        if (contributor != accounts[1]) {
            console.log("for testing this script testrpc must be run with known menomincs so keys are known in advance")
            console.log("If keys are not known can't use existing signatures that verify user.");
            console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
            assert(false);
        }

        contributionWallet = '0x1c67a930777215c9d4c617511c229e55fa53d0f8';

        operator = accounts[3];
        someUser = accounts[4];

        IEOToken = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
        //api: admin, _contributionWallet, _token, _contributorCapWei, _IEOId,  _cappedIEOTime, _openIEOTime, _endIEOTime
        kyberIEO = await KyberIEO.new(admin, contributionWallet, IEOToken.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(operator);

        kyberIEOWrapper = await KyberIEOWrapper.new(admin);

        //send tokens to KyberIEO
        await IEOToken.transfer(kyberIEO.address, kyberIEONumTokenTwei.valueOf()) ;

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        let rate = await kyberIEO.getRate();
        assert.equal(rate[0].valueOf(), rateNumerator, "wrong numerator value");
        assert.equal(rate[1].valueOf(), rateDenominator, "wrong denominator value");
    });

    it("test basic exchange using wrapper.", async function () {
        let isStarted = await kyberIEO.IEOStarted();
        assert.equal(isStarted, false, "IEO started should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        isStarted = await kyberIEO.IEOStarted();
        assert.equal(isStarted, true, "IEO started should be true now");

        //contributor will have other token and will use it to trade with network
        let manyTokens = (new BigNumber(10)).pow(otherTokenDecimals + 2 * 1);

        await otherToken.transfer(contributor, manyTokens.valueOf());
        await otherToken.approve(kyberIEOWrapper.address, approveValueInfinite.valueOf(), {from: contributor});

        //api: token, amountTwei, minConversionRate, network, kyberIEO, v, r, s
        let amountTwei = 1000;
        let result = await kyberIEOWrapper.contributeWithToken(otherToken.address, amountTwei, 0, network.address,
                            kyberIEO.address, v, r, s, {from: contributor});

        let expectedEtherPayment = (new BigNumber(amountTwei)).multipliedBy(otherTokenRate).div(ratePrecision);
        expectedEtherPayment = expectedEtherPayment.minus(expectedEtherPayment.mod(1));

        assert.equal(result.logs[0].args.tradedWei.valueOf(), expectedEtherPayment);

//        console.log(result.logs[0].args)
        let expectedTokenQty = (new BigNumber(expectedEtherPayment)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await IEOToken.balanceOf(contributor);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());
    });

    it("test above cap exchange in capped stage. ", async function () {
        isStarted = await kyberIEO.IEOStarted();
        assert.equal(isStarted, true, "IEO started should be true now");
        assert.equal((await kyberIEO.IEOEnded()), false, "IEO ended should be false now");

        //api: token, amountTwei, minConversionRate, network, kyberIEO, v, r, s
        let amountTwei = 1000000;

        let expectedEtherPayment = (new BigNumber(amountTwei)).multipliedBy(otherTokenRate).div(ratePrecision);
        expectedEtherPayment = expectedEtherPayment.minus(expectedEtherPayment.mod(1));

        //calculate other token Twei balance
        let contributorCapWei = await kyberIEO.getContributorRemainingCap(contributor);
        let expectedWeiChange = expectedEtherPayment.minus(contributorCapWei.valueOf());
        let actualUsedTwei = (new BigNumber(contributorCapWei)).multipliedBy(ratePrecision).div(otherTokenRate);
        let expectedTweiChange = (new BigNumber(amountTwei)).minus(actualUsedTwei);

        let initialTweiBalance = await otherToken.balanceOf(contributor);
        let expectedTweiBalanceAfter = (new BigNumber(initialTweiBalance)).minus(actualUsedTwei);
        let contributorInitialTweiIEO = await IEOToken.balanceOf(contributor);

        let result = await kyberIEOWrapper.contributeWithToken(otherToken.address, amountTwei, 0, network.address,
                            kyberIEO.address, v, r, s, {from: contributor});

//        console.log(result.logs[0].args)
        assert.equal(result.logs[0].args.tradedWei.valueOf(), contributorCapWei);
        assert.equal(result.logs[0].args.changeTwei.valueOf(), expectedTweiChange.valueOf());

        let contributorTweiBalanceOther = await otherToken.balanceOf(contributor);
        assert.equal(contributorTweiBalanceOther.valueOf(), expectedTweiBalanceAfter.valueOf());

          //calculate IEO token amount
        let expectedIEOTokenTradedQty = (new BigNumber(contributorCapWei)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedIEOTokenTradedQty = expectedIEOTokenTradedQty.minus(expectedIEOTokenTradedQty.mod(1));
        let expectedIEOQty = expectedIEOTokenTradedQty.plus(contributorInitialTweiIEO);
        let rxQuantity = await IEOToken.balanceOf(contributor);
        assert.equal(rxQuantity.valueOf(), expectedIEOQty.valueOf());
    });

    it("test another trade in open IEO stage.", async function () {
        let openIEOStarted = await kyberIEO.openIEOStarted();
        assert.equal(openIEOStarted, false, "open IEO started should be false now");
        assert.equal((await kyberIEO.IEOEnded()), false, "IEO ended should be false now");

        // make sure trade reverted. cap is 0 now.
        let contributorCapWei = await kyberIEO.getContributorRemainingCap(contributor);
        assert.equal(contributorCapWei.valueOf(), 0);
        let amountTwei = 10000;

        try {
            await kyberIEOWrapper.contributeWithToken(otherToken.address, amountTwei, 0, network.address,
                kyberIEO.address, v, r, s, {from: contributor});
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

        //api: token, amountTwei, minConversionRate, network, kyberIEO, v, r, s
        let expectedEtherPayment = (new BigNumber(amountTwei)).multipliedBy(otherTokenRate).div(ratePrecision);
        expectedEtherPayment = expectedEtherPayment.minus(expectedEtherPayment.mod(1));

        let contributorInitialTweiIEO = await IEOToken.balanceOf(contributor);

        let result = await kyberIEOWrapper.contributeWithToken(otherToken.address, amountTwei, 0, network.address,
                            kyberIEO.address, v, r, s, {from: contributor});

//        console.log(result.logs[0].args)
        assert.equal(result.logs[0].args.tradedWei.valueOf(), expectedEtherPayment);
        assert.equal(result.logs[0].args.changeTwei.valueOf(), 0);

        //calculate IEO token amount
        let expectedIEOTokenTradedQty = (new BigNumber(expectedEtherPayment)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedIEOTokenTradedQty = expectedIEOTokenTradedQty.minus(expectedIEOTokenTradedQty.mod(1));
        let expectedIEOQty = expectedIEOTokenTradedQty.plus(contributorInitialTweiIEO);
        let rxQuantity = await IEOToken.balanceOf(contributor);
        assert.equal(rxQuantity.valueOf(), expectedIEOQty.valueOf());
    });

});

