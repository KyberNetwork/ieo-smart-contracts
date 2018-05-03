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


contract('CapManager', function(accounts) {
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

    it("test IEO start / end times.", async function () {
        admin = accounts[0];
         if ((address1User1 != accounts[1]) || (address2User1 != accounts[7]) || (address3User1 != accounts[8]) ||
             (address1User2 != accounts[9]) || (address1User3 != accounts[6]))
         {
             console.log("for testing this script testrpc must be run with known menomincs so keys are known in advance")
             console.log("If keys are not known can't use existing signatures that verify user.");
             console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
             assert(false);
         }

        someUser = accounts[2];
        operator = accounts[3];

        await Helper.sendPromise('evm_mine', []);
        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
//        console.log(cappedStartTime + "  cappedStartTime")
//        console.log(openStartTime + "  openStartTime")
//        console.log(endTime + "  openStartTime")

        //api: _cappedIEOTime, _openIEOTime, _endIEOTime, _address1User1CapWei, IEOId, _admin
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
            await capManager.validateContributor(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1);
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        await capManager.addOperator(signer);

        //see no revert with legal contributor
        await capManager.validateContributor(address1User1, user1ID, vU1Add1, rU1Add1, sU1Add1);
        await capManager.validateContributor(address2User1, user1ID, vU1Add2, rU1Add2, sU1Add2);
        await capManager.validateContributor(address3User1, user1ID, vU1Add3, rU1Add3, sU1Add3);
        await capManager.validateContributor(address1User2, user2ID, vU2Add1, rU2Add1, sU2Add1);
        await capManager.validateContributor(address1User3, user3ID, vU3Add1, rU3Add1, sU3Add1);

        //see revert for different contributor
        try {
            await capManager.validateContributor(admin, user1ID, vU1Add1, rU1Add1, sU1Add1);
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

        cappedStartTime = now + 100;
        openStartTime = now * 1 + dayInSecs * 1;
        endTime = now * 1 + dayInSecs * 2;
        capManager = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei.valueOf(), IEOId, admin);

        await Helper.sendPromise('evm_increaseTime', [101]);
        await Helper.sendPromise('evm_mine', []);

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
        cappedStartTime = now + 100;
        openStartTime = now + dayInSecs * 1;
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
