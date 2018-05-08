let TestToken = artifacts.require("./mockContracts/TestToken.sol");
let KyberIEO = artifacts.require("./KyberIEO.sol");
let IEORate = artifacts.require("./IEORate.sol");

let Helper = require("./helper.js");
let BigNumber = require('bignumber.js');


let operator;
let admin;
let contributor;

let IEORateInst;


let rateNumerator = 18;
let rateDenominator = 37;

contract('IEORate', function(accounts) {
    it("Init contract, set rate, test event", async function () {
        admin = accounts[0];
        operator = accounts[1];
        contributor = accounts[2];

        IEORateInst = await IEORate.new(admin);

        await IEORateInst.addOperator(operator);

        let result = await IEORateInst.setRateEthToToken(rateNumerator, rateDenominator, {from: operator});

//        console.log(result.logs[0].args);
        assert.equal(result.logs[0].args.rateNumerator, rateNumerator);
        assert.equal(result.logs[0].args.rateDenominator, rateDenominator);
    });

    it("test getters", async function () {
        let rxRateNumerator = await IEORateInst.ethToTokenNumerator();
        assert.equal(rxRateNumerator, rateNumerator);

        let rxRateDenominator = await IEORateInst.ethToTokenDenominator();
        assert.equal(rxRateDenominator, rateDenominator);

        let rate = await IEORateInst.getRate(contributor);
        assert.equal(rate[0].valueOf(), rateNumerator);
        assert.equal(rate[1].valueOf(), rateDenominator);
    });

    it("test set rate possible only by operator", async function () {
        let rateNumerator2 = 111;
        let rateDenominator2 = 165;

        try {
            let result = await IEORateInst.setRateEthToToken(rateNumerator2, rateDenominator2, {from: admin});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //verify rate hasn't changed
        rate = await IEORateInst.getRate(contributor);
        assert.equal(rate[0].valueOf(), rateNumerator);
        assert.equal(rate[1].valueOf(), rateDenominator);

        result = await IEORateInst.setRateEthToToken(rateNumerator2, rateDenominator2, {from: operator});

        //verify rate has changed
        rate = await IEORateInst.getRate(contributor);
        assert.equal(rate[0].valueOf(), rateNumerator2);
        assert.equal(rate[1].valueOf(), rateDenominator2);
    });

    it("test set rate reverted on zero rate", async function () {
        let rateNumerator2 = 33;
        let rateDenominator2 = 77;

        result = await IEORateInst.setRateEthToToken(rateNumerator2, rateDenominator2, {from: operator});
        //verify rate has changed
        rate = await IEORateInst.getRate(contributor);
        assert.equal(rate[0].valueOf(), rateNumerator2);
        assert.equal(rate[1].valueOf(), rateDenominator2);

        let rateNumerator3 = 15;
        let rateDenominator3 = 99;

        try {
            let result = await IEORateInst.setRateEthToToken(0, rateDenominator3, {from: operator});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //verify rate hasn't changed
        rate = await IEORateInst.getRate(contributor);
        assert.equal(rate[0].valueOf(), rateNumerator2);
        assert.equal(rate[1].valueOf(), rateDenominator2);

        try {
            let result = await IEORateInst.setRateEthToToken(rateNumerator3, 0, {from: operator});
            assert(false, "throw was expected in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //verify rate hasn't changed
        rate = await IEORateInst.getRate(contributor);
        assert.equal(rate[0].valueOf(), rateNumerator2);
        assert.equal(rate[1].valueOf(), rateDenominator2);

        result = await IEORateInst.setRateEthToToken(rateNumerator3, rateDenominator3, {from: operator});

        //verify rate has changed
        rate = await IEORateInst.getRate(contributor);
        assert.equal(rate[0].valueOf(), rateNumerator3);
        assert.equal(rate[1].valueOf(), rateDenominator3);
    });

});
