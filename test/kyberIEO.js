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
let kyberIEOInitialTokenTwei = (new BigNumber(10)).pow((tokenDecimals * 1 + 12 * 1));
let raisedWei = 0;
let distributedTokensTwei = 0;
let contributorPayedWeiSoFar = 0;
let contributorTokenTweiBalance = 0;
let contributionWalletStartBalance;

//signed contributor value
let IEOId = '0x1234';
let signer = Helper.getSignerAddress();

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

contract('KyberIEO', function(accounts) {
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


    it("Init all values. test getters", async function () {
        admin = accounts[0];

       if ((address1User1 != accounts[1]) || (address2User1 != accounts[7]) || (address3User1 != accounts[8]) ||
           (address1User2 != accounts[9]) || (address1User3 != accounts[6]))
       {
                    console.log("for testing this script testrpc must be run with known menomincs so keys are known in advance")
            console.log("If keys are not known can't use existing signatures that verify user.");
            console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
            assert(false);
        }

        contributionWallet = '0x1c67a930777215c9d4c617511c229e55fa53d0f8';
        contributionWalletStartBalance = await Helper.getBalancePromise(contributionWallet);

        operator = accounts[3];
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
        await kyberIEO.addOperator(signer);
        await kyberIEO.addAlerter(alerter);

        //send tokens to KyberIEO
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf()) ;
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

//        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});

        contributorPayedWeiSoFar += weiValue * 1;

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(address1User1);
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

        let contributorStartWeiBalance = await Helper.getBalancePromise(address1User1);

        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue.valueOf(), from: address1User1});
        assert.equal(result.logs[0].args.distributedTokensTwei.valueOf(), expectedTokenQty.valueOf())
        assert.equal(result.logs[0].args.payedWei.valueOf(), expectedWeiPayment.valueOf())
        assert.equal(result.logs[0].args.contributor, address1User1);
//        console.log(result.logs[0].args)

        let expectedTokenQtyThisTrade = (new BigNumber(expectedWeiPayment)).multipliedBy(rateNumerator).div(rateDenominator).toFixed(0);
        contributorTokenTweiBalance += expectedTokenQtyThisTrade * 1;

        let rxQuantity = await token.balanceOf(address1User1);
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
            await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue.valueOf(), from: address1User1});
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

        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue.valueOf(), from: address1User1});

        let expectedTokenQtyThisTrade = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQtyThisTrade = expectedTokenQtyThisTrade.minus(expectedTokenQtyThisTrade.mod(1));
        contributorTokenTweiBalance += expectedTokenQtyThisTrade.valueOf() * 1;

        assert.equal(result.logs[0].args.distributedTokensTwei.valueOf(), expectedTokenQtyThisTrade.valueOf())

        let rxQuantity = await token.balanceOf(address1User1);
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
            await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue.valueOf(), from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        // see success with same parameters and higher wei value
        weiValue = 20;
        expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        assert(expectedTokenQty.valueOf() > 0);
        await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue.valueOf(), from: address1User1});
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

    it("test contribution reverted before start time.", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;
        cappedStartTime = now + 100 * 1;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);
        await kyberIEO.addAlerter(alerter);

        kyberIEOInitialTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf());

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), 0, "cap should be 0 before start");

        //contribute and see reverted - not started yet.
        let weiValue = 1000;
        try {
            let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //move to IEO start time. see success
        await Helper.sendPromise('evm_increaseTime', [101]);
        await Helper.sendPromise('evm_mine', []);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute and see reverted - not started yet.
        await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
    });

    it("test contribution reverted for illegal signature - replacing different signed values", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;
        cappedStartTime = now + 100 * 1;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);
        await kyberIEO.addAlerter(alerter);

        kyberIEOInitialTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf());

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        //move to IEO start time.
        await Helper.sendPromise('evm_increaseTime', [101]);
        await Helper.sendPromise('evm_mine', []);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute and see reverted - wrong user address.
        let weiValue = 1000;
        try {
            let result = await kyberIEO.contribute(admin, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //contribute and see reverted - wrong user ID.
        try {
            let result = await kyberIEO.contribute(address1User1, user2ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //contribute and see reverted - wrong v.
        try {
            let result = await kyberIEO.contribute(address1User1, user1ID, '0x15', rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }


        //contribute and see reverted - wrong r.
        try {
            let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add2, sU1Add1, {value: weiValue, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //contribute and see reverted - wrong ss.
        try {
            let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add3, {value: weiValue, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }


        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute and see success.
        await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
    });

    it("test contribution reverted when out of tokens in KyberIEO", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;
        cappedStartTime = now + 100 * 1;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);
        await kyberIEO.addAlerter(alerter);

        kyberIEOInitialTokenTwei = 5000;
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf());

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        //set 1 : 1 rate
        await IEORateInst.setRateEthToToken(1, 1, {from: operator});

        //move to IEO start time.
        await Helper.sendPromise('evm_increaseTime', [101]);
        await Helper.sendPromise('evm_mine', []);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute and see success - wrong user address.
        let weiValue = 4000;
        let expecteTwei = weiValue; // ratio 1 : 1
        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});

        let balance = await token.balanceOf(address1User1);
        assert.equal(balance.valueOf(), expecteTwei);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), (capWei.minus(weiValue)).valueOf(), "cap should be as user cap now");

        let kyberIEOBalance = await token.balanceOf(kyberIEO.address);
        assert.equal(kyberIEOBalance.valueOf(), kyberIEOInitialTokenTwei - expecteTwei);

        //contribute and see reverted - not enough tokens.
        let weiValueAboveTokenBalance = 2000;
        try {
            let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1,
                {value: weiValueAboveTokenBalance, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //see balance not changed
        balance = await token.balanceOf(address1User1);
        assert.equal(balance.valueOf(), weiValue);
    });

    it("test get contributor remaining cap in IEO stages + contribute per stage.", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;
        cappedStartTime = now + 100 * 1;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);
        await kyberIEO.addAlerter(alerter);

        await Helper.sendPromise('evm_increaseTime', [101]);
        await Helper.sendPromise('evm_mine', []);

        kyberIEOInitialTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf());

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute and see eligible decrease.
        let weiValue = 1000;
        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(address1User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), capWei.minus(weiValue).valueOf(), "cap should be lower now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), maxCapWei.valueOf(), "cap should be max Cap");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap, 0, "cap should be 0");

        // see trade reverted after IEO end
        try {
            await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }
    });


    it("test contribution while calling halt IEO and resume IEO API.", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);

        let now = await web3.eth.getBlock('latest').timestamp;

        cappedStartTime = now + 100;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);
        await kyberIEO.addAlerter(alerter);

        await Helper.sendPromise('evm_increaseTime', [101]);
        await Helper.sendPromise('evm_mine', []);

        kyberIEOInitialTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf());

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute
        let weiValue = 10000;
        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(address1User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        // halt IEO and see can't contribute
        result = await kyberIEO.haltIEO({from: alerter});
        assert.equal(result.logs[0].args.sender, alerter);

        // see trade reverted when IEO halted
        try {
            await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        // resume IEO and see can contribute
        result = await kyberIEO.resumeIEO({from: admin});
        assert.equal(result.logs[0].args.sender, admin);

        result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});

        let additionalTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        additionalTokenQty = additionalTokenQty.minus(additionalTokenQty.mod(1));
        expectedTokenQty = expectedTokenQty.plus(additionalTokenQty);
        rxQuantity = await token.balanceOf(address1User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());
    });

    it("test contribution with only capped stage.", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);
        let now = await web3.eth.getBlock('latest').timestamp;

        cappedStartTime = now + 100;
        openStartTime = now * 1 + 60 * 60;
        endTime = openStartTime;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);
        await kyberIEO.addAlerter(alerter);

        await Helper.sendPromise('evm_increaseTime', [101]);
        await Helper.sendPromise('evm_mine', []);

        kyberIEOInitialTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf());

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute
        let weiValue = 100;
        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(address1User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        //move to end of capped stage
        await Helper.sendPromise('evm_increaseTime', [1]);
        await Helper.sendPromise('evm_mine', []);
        now = await web3.eth.getBlock('latest').timestamp;
        let leftTillEnd = ((new BigNumber(openStartTime)).minus(now)).valueOf();
        await Helper.sendPromise('evm_increaseTime', [leftTillEnd - 2]);
        await Helper.sendPromise('evm_mine', []);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        expectedCap = capWei.minus(weiValue);
        assert.equal(cap.valueOf(), expectedCap.valueOf(), "wrong cap");

        await Helper.sendPromise('evm_increaseTime', [2]);
        await Helper.sendPromise('evm_mine', []);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), 0, "wrong cap");
    });

    it("test contribution with only open stage.", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);
        let now = await web3.eth.getBlock('latest').timestamp;

        cappedStartTime = now + 100;
        openStartTime = cappedStartTime;
        endTime = now * 1 + 60 * 60;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);
        await kyberIEO.addAlerter(alerter);

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        await Helper.sendPromise('evm_increaseTime', [95]);
        await Helper.sendPromise('evm_mine', []);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), 0, "cap should be max cap");

        await Helper.sendPromise('evm_increaseTime', [7]);
        await Helper.sendPromise('evm_mine', []);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), maxCapWei.valueOf(), "cap should be max cap");

        kyberIEOInitialTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), maxCapWei.valueOf(), "cap should be max cap");

        //contribute
        let weiValue = (capWei.plus(5)).valueOf();
        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(address1User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        //move to end of open stage
        await Helper.sendPromise('evm_increaseTime', [1]);
        await Helper.sendPromise('evm_mine', []);
        now = await web3.eth.getBlock('latest').timestamp;
        let leftTillEnd = ((new BigNumber(endTime)).minus(now)).valueOf();
        await Helper.sendPromise('evm_increaseTime', [leftTillEnd - 2]);
        await Helper.sendPromise('evm_mine', []);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), maxCapWei.valueOf(), "wrong cap");

        await Helper.sendPromise('evm_increaseTime', [2]);
        await Helper.sendPromise('evm_mine', []);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), 0, "wrong cap");
    });

    it("validate cap is calculated per User ID and not per address.", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);
        let now = await web3.eth.getBlock('latest').timestamp;

        cappedStartTime = now + 100;
        openStartTime = now * 1 + 60 * 60;
        endTime = openStartTime + 60 * 60;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);
        await kyberIEO.addAlerter(alerter);

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        await Helper.sendPromise('evm_increaseTime', [101]);
        await Helper.sendPromise('evm_mine', []);

        kyberIEOInitialTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute with address 1
        let weiValue = 100;
        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(address1User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        expectedCap = capWei.minus(weiValue);
        assert.equal(cap.valueOf(), expectedCap.valueOf(), "wrong cap");

        //contribute with address 2
        result = await kyberIEO.contribute(address2User1, user1ID, vU1Add2, rU1Add2, sU1Add2, {value: weiValue, from: address2User1});

        expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        rxQuantity = await token.balanceOf(address2User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        expectedCap = expectedCap.minus(weiValue);
        assert.equal(cap.valueOf(), expectedCap.valueOf(), "wrong cap");

        //contribute with address 3
        weiValue = expectedCap.valueOf();
        result = await kyberIEO.contribute(address3User1, user1ID, vU1Add3, rU1Add3, sU1Add3, {value: weiValue, from: address3User1});

        expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        rxQuantity = await token.balanceOf(address3User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        expectedCap = expectedCap.minus(weiValue);
        assert.equal(cap.valueOf(), expectedCap.valueOf(), "wrong cap");

        //verify next trade with different address reverts
        weiValue = 15;
        try {
            result = await kyberIEO.contribute(address2User1, user1ID, vU1Add2, rU1Add2, sU1Add2, {value: weiValue, from: address2User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }
    });

    it("validate cap is calculated per User ID and doesn't affect other user IDs.", async function () {
        tokenDecimals = 18;
        token = await TestToken.new("IEO Token", "IEO", tokenDecimals);
        let now = await web3.eth.getBlock('latest').timestamp;

        cappedStartTime = now + 100;
        openStartTime = now * 1 + 60 * 60;
        endTime = openStartTime + 60 * 60;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);
        await kyberIEO.addAlerter(alerter);

        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        kyberIEOInitialTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf());

        //move to IEO start time
        await Helper.sendPromise('evm_increaseTime', [101]);
        await Helper.sendPromise('evm_mine', []);

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");
        cap = await kyberIEO.getContributorRemainingCap(user2ID);
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        //contribute user1
        let weiValue = 100;
        let result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});

        let expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        let rxQuantity = await token.balanceOf(address1User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        expectedCap = capWei.minus(weiValue);
        assert.equal(cap.valueOf(), expectedCap.valueOf(), "wrong cap");

        //contribute with address 2
        result = await kyberIEO.contribute(address2User1, user1ID, vU1Add2, rU1Add2, sU1Add2, {value: weiValue, from: address2User1});

        expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        rxQuantity = await token.balanceOf(address2User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        expectedCap = expectedCap.minus(weiValue);
        assert.equal(cap.valueOf(), expectedCap.valueOf(), "wrong cap");

        //contribute with address 3
        weiValue = expectedCap.valueOf();
        result = await kyberIEO.contribute(address3User1, user1ID, vU1Add3, rU1Add3, sU1Add3, {value: weiValue, from: address3User1});

        expectedTokenQty = (new BigNumber(weiValue)).multipliedBy(rateNumerator).div(rateDenominator);
        expectedTokenQty = expectedTokenQty.minus(expectedTokenQty.mod(1));
        rxQuantity = await token.balanceOf(address3User1);
        assert.equal(rxQuantity.valueOf(), expectedTokenQty.valueOf());

        cap = await kyberIEO.getContributorRemainingCap(user1ID);
        expectedCap = expectedCap.minus(weiValue);
        assert.equal(cap.valueOf(), expectedCap.valueOf(), "wrong cap");

        //verify next trade with different address reverts
        weiValue = 15;
        try {
            result = await kyberIEO.contribute(address2User1, user1ID, vU1Add2, rU1Add2, sU1Add2, {value: weiValue, from: address2User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }
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

        cappedStartTime = now + 100;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;

        kyberIEO = await KyberIEO.new(admin, contributionWallet, token.address, capWei.valueOf(), IEOId, cappedStartTime, openStartTime, endTime);
        await kyberIEO.addOperator(signer);

        await Helper.sendPromise('evm_increaseTime', [101]);
        await Helper.sendPromise('evm_mine', []);

        kyberIEOInitialTokenTwei = (new BigNumber(10)).pow(tokenDecimals + 1 * 6);
        await token.transfer(kyberIEO.address, kyberIEOInitialTokenTwei.valueOf());

        //contribute before setting rate
        try {
            result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

//        set rate and see success
        IEORateAddress = await kyberIEO.IEORateContract();
        let IEORateInst = await IEORate.at(IEORateAddress);
        await IEORateInst.addOperator(operator);
        await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

        result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
        assert.equal(result.logs[0].args.payedWei.valueOf(), weiValue)
    });

    it("verify contribute reverted when wei payment is 0.", async function () {
        let weiValue = 0;

        try {
            result = await kyberIEO.contribute(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1, {value: weiValue, from: address1User1});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }
    });
});
