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
const contributor = '0x3ee48c714fb8adc5376716c69121009bc13f3045';
const signer = '0xcefff360d0576e3e63fd5e75fdedcf14875b184a';
let IEOId = '0x1234';

let user1ID = '0x123456789987654321abcd';
let address1User1 = '0x3ee48c714fb8adc5376716c69121009bc13f3045';
let vU1Add1 = '0x1c';
let rU1Add1 = '0x2988ba3469625f4f5d7f87dae97a684fe358e3ea5aa3952393567b9a40e4d753';
let sU1Add1 = '0x45ec523c7f284644813f5ae5c60062fad80ad56333c4302d2977930f2ef1515c';

let address2User1 = '0xcb5595ce20f39c8a8afd103211c68284f931a1fb';
let vU1Add2 = '0x1c';
let rU1Add2 = '0xfbec16d1066734d49cf996e135f3fd4696b089c2ceb623eb3df0a815d3f2159e';
let sU1Add2 = '0x6123364c7fa99ad47953646f415b3f15c85cc97b3802372464ec497cb34b5d56';

let address3User1 = '0x24007facc58575d23f0341dc91b41b849cd8259d';
let vU1Add3 = '0x1b';
let rU1Add3 = ' 0x23788068b1c43ff028419a11b2590c5d20ae1702e8ffdd67394baed57ce99acc';
let sU1Add3 = ' 0x409b6cfac56c379eb7818b720f61b57a3562887c4d8f5ee6d3e82386830f21fe';

//user 2
let user2ID = '0x744456789987654321abcd';
let address1User2 = '0x005feb7254ddccfa8b4a4a4a365d13a2a5866075';
let vU2Add1 = '0x1c';
let rU2Add1 = '0x6f87e26ca09e0da6e054156a58d95ad3d92b425ecc2afe28595d087e7bdc44d7';
let sU2Add1 = '0x4991747c9f68fa92456b37b3642158cd20f3cf1d1939689a5337657193ab6b08';

contract('KyberIEOWrapper', function(accounts) {
    it("Init network and test it.", async function () {
        admin = accounts[0];

        if (address1User1 != accounts[1]) {
            console.log("for testing this script testrpc must be run with known menomincs so keys are known in advance")
            console.log("If keys are not known can't use existing signatures that verify user.");
            console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
            assert(false);
        }

        contributionWallet = '0x1c67a930777215c9d4c617511c229e55fa53d0f8';

        operator = accounts[3];
        if (signer != operator) {
            console.log("for testing this script testrpc must be started with known menomincs so keys are well known.")
            console.log("If keys are not known can't use existing signatures that verify user.");
            console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
            assert(false);
        }

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

        if (address1User1 != accounts[1]) {
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

});

