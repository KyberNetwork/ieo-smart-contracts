const TestToken = artifacts.require("./mockContracts/TestToken.sol");
const KyberIEO = artifacts.require("./KyberIEO.sol");
const KyberIEOWrapper = artifacts.require("./KyberIEOWrapper.sol");
const MockKyberNetwork = artifacts.require("./MockKyberNetwork.sol");
const IEORate = artifacts.require("./IEORate.sol");

const Helper = require("./helper.js");
const BigNumber = require('bignumber.js');

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
let signer = Helper.getSignerAddress();
let IEOId = '0x1234';

//user1
let user1ID;
let address1User1;
let vU1Add1;
let rU1Add1;
let sU1Add1;

let address2User1;
let vU1Add2;
let rU1Add2;
let sU1Add2;

let address3User1;
let vU1Add3;
let rU1Add3;
let sU1Add3;

//user 2
let user2ID;
let address1User2;
let vU2Add1;
let rU2Add1;
let sU2Add1;

//user3
let user3ID;
let address1User3;
let vU3Add1;
let rU3Add1;
let sU3Add1;

contract('KyberIEOWrapper', function(accounts) {
    it("Init signatures", async function () {
      let sig;
      user1ID = '0x123456789987654321abcd';
      address1User1 = accounts[1];
      sig = Helper.getContributionSignature(address1User1,user1ID,IEOId);
      vU1Add1 = sig.v;
      rU1Add1 = sig.r;
      sU1Add1 = sig.s;

      address2User1 = accounts[7];
      sig = Helper.getContributionSignature(address2User1,user1ID,IEOId);
      vU1Add2 = sig.v;
      rU1Add2 = sig.r;
      sU1Add2 = sig.s;

      address3User1 = accounts[8];
      sig = Helper.getContributionSignature(address3User1,user1ID,IEOId);
      vU1Add3 = sig.v;
      rU1Add3 = sig.r;
      sU1Add3 = sig.s;

      //user 2
      user2ID = '0x744456789987654321abcd';
      address1User2 = accounts[9];
      sig = Helper.getContributionSignature(address1User2,user2ID,IEOId);
      vU2Add1 = sig.v;
      rU2Add1 = sig.r;
      sU2Add1 = sig.s;

      //user3
      user3ID = '0x744456789983217654321abcd';
      address1User3 = accounts[6];
      sig = Helper.getContributionSignature(address1User3,user3ID,IEOId);
      vU3Add1 = sig.v;
      rU3Add1 = sig.r;
      sU3Add1 = sig.s;
    });


    it("Init network and test it.", async function () {
        admin = accounts[0];
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

        IEOToken = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
        //api: admin, _contributionWallet, _token, _contributorCapWei, _IEOId,  _cappedIEOTime, _openIEOTime, _endIEOTime
        kyberIEO = await KyberIEO.new(admin, contributionWallet, IEOToken.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);

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

        await otherToken.transfer(address1User1, manyTokens.valueOf());
        await otherToken.approve(kyberIEOWrapper.address, approveValueInfinite.valueOf(), {from: address1User1});

        //api: token, amountTwei, minConversionRate, network, kyberIEO, vU1Add1, rU1Add1, sU1Add1
        let amountTwei = 1000;
        let maxAmountWei = 500;
        let result = await kyberIEOWrapper.contributeWithToken(user1ID, otherToken.address, amountTwei, 0, maxAmountWei,
                    network.address, kyberIEO.address, vU1Add1, rU1Add1, sU1Add1, {from: address1User1});

        let expectedEtherPayment = (new BigNumber(amountTwei)).multipliedBy(otherTokenRate).div(ratePrecision);
        expectedEtherPayment = expectedEtherPayment.minus(expectedEtherPayment.mod(1));

        assert.equal(result.logs[0].args.tradedWei.valueOf(), expectedEtherPayment);

//        console.log(result.logs[0].args)
        let expectedTokenQty = (new BigNumber(expectedEtherPayment)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await IEOToken.balanceOf(address1User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());
    });

    it("test above cap exchange in capped stage. ", async function () {
        isStarted = await kyberIEO.IEOStarted();
        assert.equal(isStarted, true, "IEO started should be true now");
        assert.equal((await kyberIEO.IEOEnded()), false, "IEO ended should be false now");

        //api: token, amountTwei, minConversionRate, network, kyberIEO, vU1Add1, rU1Add1, sU1Add1
        let amountTwei = 1000000;
        let maxAmountWei = 100000;

        let expectedEtherPayment = (new BigNumber(amountTwei)).multipliedBy(otherTokenRate).div(ratePrecision);
        expectedEtherPayment = expectedEtherPayment.minus(expectedEtherPayment.mod(1));

        //calculate other token Twei balance
        let contributorCapWei = await kyberIEO.getContributorRemainingCap(user1ID);
        let expectedWeiChange = expectedEtherPayment.minus(contributorCapWei.valueOf());
        let actualUsedTwei = (new BigNumber(contributorCapWei)).multipliedBy(ratePrecision).div(otherTokenRate);
        let expectedTweiChange = (new BigNumber(amountTwei)).minus(actualUsedTwei);

        let initialTweiBalance = await otherToken.balanceOf(address1User1);
        let expectedTweiBalanceAfter = (new BigNumber(initialTweiBalance)).minus(actualUsedTwei);
        let contributorInitialTweiIEO = await IEOToken.balanceOf(address1User1);

        let result = await kyberIEOWrapper.contributeWithToken(user1ID, otherToken.address, amountTwei, 0, maxAmountWei, network.address,
                            kyberIEO.address, vU1Add1, rU1Add1, sU1Add1, {from: address1User1});

//        console.log(result.logs[0].args)
        assert.equal(result.logs[0].args.tradedWei.valueOf(), contributorCapWei);
        assert.equal(result.logs[0].args.changeTwei.valueOf(), expectedTweiChange.valueOf());

        let contributorTweiBalanceOther = await otherToken.balanceOf(address1User1);
        assert.equal(contributorTweiBalanceOther.valueOf(), expectedTweiBalanceAfter.valueOf());

          //calculate IEO token amount
        let expectedIEOTokenTradedQty = (new BigNumber(contributorCapWei)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedIEOTokenTradedQty = expectedIEOTokenTradedQty.minus(expectedIEOTokenTradedQty.mod(1));
        let expectedIEOQty = expectedIEOTokenTradedQty.plus(contributorInitialTweiIEO);
        let rxQuantity = await IEOToken.balanceOf(address1User1);
        assert.equal(rxQuantity.valueOf(), expectedIEOQty.valueOf());
    });

    it("test another trade in open IEO stage.", async function () {
        let openIEOStarted = await kyberIEO.openIEOStarted();
        assert.equal(openIEOStarted, false, "open IEO started should be false now");
        assert.equal((await kyberIEO.IEOEnded()), false, "IEO ended should be false now");

        // make sure trade reverted. cap is 0 now.
        let contributorCapWei = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(contributorCapWei.valueOf(), 0);
        let amountTwei = 10000;
        let maxAmountWei = 10000;

        try {
            await kyberIEOWrapper.contributeWithToken(user1ID, otherToken.address, amountTwei, 0, maxAmountWei, network.address,
                kyberIEO.address, vU1Add1, rU1Add1, sU1Add1, {from: address1User1});
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

        //api: token, amountTwei, minConversionRate, network, kyberIEO, vU1Add1, rU1Add1, sU1Add1
        let expectedEtherPayment = (new BigNumber(amountTwei)).multipliedBy(otherTokenRate).div(ratePrecision);
        expectedEtherPayment = expectedEtherPayment.minus(expectedEtherPayment.mod(1));

        let contributorInitialTweiIEO = await IEOToken.balanceOf(address1User1);

        let result = await kyberIEOWrapper.contributeWithToken(user1ID, otherToken.address, amountTwei, 0, maxAmountWei, network.address,
                            kyberIEO.address, vU1Add1, rU1Add1, sU1Add1, {from: address1User1});

//        console.log(result.logs[0].args)
        assert.equal(result.logs[0].args.tradedWei.valueOf(), expectedEtherPayment);
        assert.equal(result.logs[0].args.changeTwei.valueOf(), 0);

        //calculate IEO token amount
        let expectedIEOTokenTradedQty = (new BigNumber(expectedEtherPayment)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedIEOTokenTradedQty = expectedIEOTokenTradedQty.minus(expectedIEOTokenTradedQty.mod(1));
        let expectedIEOQty = expectedIEOTokenTradedQty.plus(contributorInitialTweiIEO);
        let rxQuantity = await IEOToken.balanceOf(address1User1);
        assert.equal(rxQuantity.valueOf(), expectedIEOQty.valueOf());
    });

    it("test trade without enough approved tokens to wrapper is reverted.", async function () {
        openIEOStarted = await kyberIEO.openIEOStarted();
        assert.equal(openIEOStarted, true, "open IEO started should be true now");
        assert.equal((await kyberIEO.IEOEnded()), false, "IEO ended should be false now");


        //api: token, amountTwei, minConversionRate, network, kyberIEO, vU1Add1, rU1Add1, sU1Add1
        let tradeTwei = 1500;
        let maxAmountWei = 100000;
        let expectedEtherPayment = (new BigNumber(tradeTwei)).multipliedBy(otherTokenRate).div(ratePrecision);
        expectedEtherPayment = expectedEtherPayment.minus(expectedEtherPayment.mod(1));

        let contributorInitialTweiIEO = await IEOToken.balanceOf(address2User1);

        //approve
        let approveTweiAmount = 2000;
        await otherToken.transfer(address2User1, 5000);
        await otherToken.approve(kyberIEOWrapper.address, approveTweiAmount, {from: address2User1});

        let result = await kyberIEOWrapper.contributeWithToken(user1ID, otherToken.address, tradeTwei, 0, maxAmountWei,
                        network.address, kyberIEO.address, vU1Add2, rU1Add2, sU1Add2, {from: address2User1});

//        console.log(result.logs[0].args)
        assert.equal(result.logs[0].args.tradedWei.valueOf(), expectedEtherPayment);
        assert.equal(result.logs[0].args.changeTwei.valueOf(), 0);

        //calculate IEO token amount
        let expectedIEOTokenTradedQty = (new BigNumber(expectedEtherPayment)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedIEOTokenTradedQty = expectedIEOTokenTradedQty.minus(expectedIEOTokenTradedQty.mod(1));
        let expectedIEOQty = expectedIEOTokenTradedQty.plus(contributorInitialTweiIEO);
        let rxQuantity = await IEOToken.balanceOf(address2User1);
        assert.equal(rxQuantity.valueOf(), expectedIEOTokenTradedQty.valueOf());


        //now same contribute should revert
        try {
            await kyberIEOWrapper.contributeWithToken(user1ID, otherToken.address, tradeTwei, 0, maxAmountWei,
                            network.address, kyberIEO.address, vU1Add2, rU1Add2, sU1Add2, {from: address2User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //see values didn't change
        rxQuantity = await IEOToken.balanceOf(address2User1);
        assert.equal(rxQuantity.valueOf(), expectedIEOTokenTradedQty.valueOf());
    });

    it("test trade with bad signature is reverted.", async function () {
        openIEOStarted = await kyberIEO.openIEOStarted();
        assert.equal(openIEOStarted, true, "open IEO started should be true now");
        assert.equal((await kyberIEO.IEOEnded()), false, "IEO ended should be false now");


        //api: token, amountTwei, minConversionRate, network, kyberIEO, vU1Add1, rU1Add1, sU1Add1
        let tradeTwei = 1500;
        let maxAmountWei = 100000;
        let expectedEtherPayment = (new BigNumber(tradeTwei)).multipliedBy(otherTokenRate).div(ratePrecision);
        expectedEtherPayment = expectedEtherPayment.minus(expectedEtherPayment.mod(1));

        let contributorInitialTweiIEO = await IEOToken.balanceOf(address2User1);

        //approve
        let approveTweiAmount = 2000;
        await otherToken.transfer(address2User1, 5000);
        await otherToken.approve(kyberIEOWrapper.address, approveTweiAmount, {from: address2User1});

        //now contribute should revert - use wrong user ID
        try {
            await kyberIEOWrapper.contributeWithToken(user2ID, otherToken.address, tradeTwei, 0, maxAmountWei,
                            network.address, kyberIEO.address, vU1Add2, rU1Add2, sU1Add2, {from: address2User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }
//
        let rxQuantity = await IEOToken.balanceOf(address2User1);
        assert.equal(rxQuantity.valueOf(), contributorInitialTweiIEO.valueOf());
    });
});
