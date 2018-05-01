let TestToken = artifacts.require("./mockContracts/TestToken.sol");
let KyberIEO = artifacts.require("./KyberIEO.sol");
let IEORate = artifacts.require("./IEORate.sol");

let Helper = require("./helper.js");
let BigNumber = require('bignumber.js');
let operator;
let admin;
let IEORateInst;


let rateNumerator = 18;
let rateDenominator = 37;

contract('KyberIEO', function(accounts) {
    it("Init contract, set rate, test event", async function () {
        admin = accounts[0];
        operator = accounts[1];

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

        let rate = await IEORateInst.getRate();
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
        rate = await IEORateInst.getRate();
        assert.equal(rate[0].valueOf(), rateNumerator);
        assert.equal(rate[1].valueOf(), rateDenominator);

        result = await IEORateInst.setRateEthToToken(rateNumerator2, rateDenominator2, {from: operator});

        //verify rate has changed
        rate = await IEORateInst.getRate();
        assert.equal(rate[0].valueOf(), rateNumerator2);
        assert.equal(rate[1].valueOf(), rateDenominator2);
    });

});
