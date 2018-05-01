let CapManager = artifacts.require("./CapManager.sol");

let Helper = require("./helper.js");
let BigNumber = require('bignumber.js');

let admin;
let someUser;
let dayInSecs = 24 * 60 * 60;
let capManager;
let cappedStartTime;
let openStartTime;
let endTime;
let capWei = (new BigNumber(10)).pow(18).div(2); //0.5 ether
let maxCapWei = ((new BigNumber(2)).pow(256)).minus(1);

//signed contributor value
let v = '0x1b';
let r = '0x737c9fb533be22ea2f400a2b9388ff28a1489fb76f5e852e7c20fec63da7b039';
let s = '0x07e08845abf71a4d6538e6c91d27b6b1d4b5af8d7be1a8e0c683b03fd0448e8d';
let contributor = '0x3ee48c714fb8adc5376716c69121009bc13f3045';
let signer = '0xcefff360d0576e3e63fd5e75fdedcf14875b184a';
let IEOId = '0x1234';


contract('CapManager', function(accounts) {
    it("test IEO start / end times.", async function () {
        admin = accounts[0];
         if (contributor != accounts[1]) {
             console.log("for testing this script testrpc must be run with known menomincs so keys are known in advance")
             console.log("If keys are not known can't use existing signatures that verify user.");
             console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
             assert(false);
         }

        someUser = accounts[2];

        operator = accounts[3];

        if (signer != operator) {
            console.log("for testing this script testrpc must be started with known menomincs so keys are well known.")
            console.log("If keys are not known can't use existing signatures that verify user.");
            console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
            assert(false);
        }

        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
//        console.log(cappedStartTime + "  cappedStartTime")
//        console.log(openStartTime + "  openStartTime")
//        console.log(endTime + "  openStartTime")

        //api: _cappedIEOTime, _openIEOTime, _endIEOTime, _contributorCapWei, IEOId, _admin
        capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);

        let isStarted = await capManager.IEOStarted();
        let isOpenIEOStarted = await capManager.openIEOStarted();
        let IEOEnded = await capManager.IEOEnded();
        assert.equal(isStarted, false, "IEO started should be false now");
        assert.equal(isOpenIEOStarted, false, "open IEO started should be false now");
        assert.equal(IEOEnded, false, "IEO ended should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        isStarted = await capManager.IEOStarted();
        isOpenIEOStarted = await capManager.openIEOStarted();
        IEOEnded = await capManager.IEOEnded();
        assert.equal(isStarted, true, "IEO started should be true now");
        assert.equal(isOpenIEOStarted, false, "open IEO started should be false now");
        assert.equal(IEOEnded, false, "IEO ended should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        isStarted = await capManager.IEOStarted();
        isOpenIEOStarted = await capManager.openIEOStarted();
        IEOEnded = await capManager.IEOEnded();
        assert.equal(isStarted, true, "IEO started should be true now");
        assert.equal(isOpenIEOStarted, true, "open IEO started should be true now");
        assert.equal(IEOEnded, false, "IEO ended should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        isStarted = await capManager.IEOStarted();
        isOpenIEOStarted = await capManager.openIEOStarted();
        IEOEnded = await capManager.IEOEnded();
        assert.equal(isStarted, true, "IEO started should be true now");
        assert.equal(isOpenIEOStarted, true, "open IEO started should be true now");
        assert.equal(IEOEnded, true, "IEO ended should be true now");
    });

    it("test contributor remaining cap in IEO stages.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;

        capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);

        let cap = await capManager.getContributorRemainingCap(someUser);
        assert.equal(cap, 0, "cap should be 0");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await capManager.getContributorRemainingCap(someUser);;
        assert.equal(cap.valueOf(), capWei.valueOf(), "cap should be as user cap now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await capManager.getContributorRemainingCap(someUser);;
        assert.equal(cap.valueOf(), maxCapWei.valueOf(), "cap should be max Cap");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await capManager.getContributorRemainingCap(someUser);;
        assert.equal(cap, 0, "cap should be 0");
    });


    it("test eligible behavior in IEO stages.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;
        let requestedWei =  (new BigNumber(10)).pow(18);
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;

        capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);

        let eligible = await capManager.eligible(someUser, requestedWei.valueOf());
        assert.equal(eligible, 0, "cap should be 0");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        eligible = await capManager.eligible(someUser, requestedWei.valueOf());
        assert.equal(eligible.valueOf(), capWei.valueOf(), "eligible should be as user cap now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        eligible = await capManager.eligible(someUser, requestedWei.valueOf());
        assert.equal(eligible.valueOf(), requestedWei.valueOf(), "eligible should be max Cap");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        eligible = await capManager.eligible(someUser, requestedWei.valueOf());
        assert.equal(eligible.valueOf(), 0, "cap should be 0");
    });

    it("test setting contributor cap.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;
        let newCapWei = capWei.plus(5000);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;

        capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);
        let result = await capManager.setContributorCap(newCapWei.valueOf());

        assert.equal(result.logs[0].args.capWei.valueOf(), newCapWei.valueOf());
        assert.equal(result.logs[0].args.sender.valueOf(), admin);

        //set cap
        let cap = await capManager.getContributorRemainingCap(someUser);
        assert.equal(cap, 0, "cap should be 0");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await capManager.getContributorRemainingCap(someUser);;
        assert.equal(cap.valueOf(), newCapWei.valueOf(), "cap should be as user cap now");

        //now set again
        newCapWei = newCapWei.minus(6500);
        result = await capManager.setContributorCap(newCapWei.valueOf());

        assert.equal(result.logs[0].args.capWei.valueOf(), newCapWei.valueOf());
        assert.equal(result.logs[0].args.sender.valueOf(), admin);

        cap = await capManager.getContributorRemainingCap(someUser);;
        assert.equal(cap.valueOf(), newCapWei.valueOf(), "cap should be as user cap now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await capManager.getContributorRemainingCap(someUser);;
        assert.equal(cap.valueOf(), maxCapWei.valueOf(), "cap should be max Cap");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await capManager.getContributorRemainingCap(someUser);;
        assert.equal(cap, 0, "cap should be 0");

        newCapWei = newCapWei.minus(150);
        result = await capManager.setContributorCap(newCapWei.valueOf());
        cap = await capManager.getContributorRemainingCap(someUser);;
        assert.equal(cap, 0, "cap should be 0");
    });

    it("test contributor validation - signature process.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;
        let requestedWei =  (new BigNumber(10)).pow(18);
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;

        capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);
        //see revert when signer not added as operator
        try {
            await capManager.validateContributor(contributor, v, r, s);
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        await capManager.addOperator(operator);

        //see no revert with legal contributor
        await capManager.validateContributor(contributor, v, r, s);

        //see revert for different contributor
        try {
            await capManager.validateContributor(admin, v, r, s);
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }
    });

    it("test get IEO Id.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;
        let requestedWei =  (new BigNumber(10)).pow(18);
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;

        capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);
        let rxIEOId = await capManager.getIEOId();
        assert.equal(rxIEOId.toString(16), IEOId.slice(2));
    });

    it("verify set cap enabled only for admin.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;

        cappedStartTime = now;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;
        capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);

        let newCapWei = capWei.plus(300);
        await capManager.setContributorCap(newCapWei.valueOf());
        cap = await capManager.getContributorRemainingCap(someUser);;
        assert.equal(cap.valueOf(), newCapWei.valueOf());

        let otherCapWei = capWei.minus(150);
        try {
            await capManager.setContributorCap(otherCapWei.valueOf(), {from: operator});
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        cap = await capManager.getContributorRemainingCap(someUser);;
        assert.equal(cap, newCapWei.valueOf());
    });

    it("verify deploy contract revert for bad values.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;

        //one succesful deploy
        cappedStartTime = now;
        openStartTime = now + 9 * 1;
        endTime = now * 1 + dayInSecs * 2;
        capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);

        //revert when starting before now
        cappedStartTime = now - 1;
        openStartTime = now + 9 * 1;
        endTime = now * 1 + dayInSecs * 2;
        try {
            capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //revert when open IEO start < IEO Start
        cappedStartTime = now + 10 * 1;
        openStartTime = now + 9 * 1;
        endTime = now * 1 + dayInSecs * 2;
        try {
            capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }


        //revert when IEO End < IEO start
        cappedStartTime = now ;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = openStartTime - 1;
        try {
            capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        //revert when IEO ID is 0
        cappedStartTime = now ;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;
        IEOId = 0;

        try {
            capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }
    });
});