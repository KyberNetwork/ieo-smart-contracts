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
let signer = '0xcefff360d0576e3e63fd5e75fdedcf14875b184a';

//user1
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

let user2ID = '0x744456789987654321abcd';
let address1User2 = '0x005feb7254ddccfa8b4a4a4a365d13a2a5866075';
let vU2Add1 = '0x1c';
let rU2Add1 = '0x6f87e26ca09e0da6e054156a58d95ad3d92b425ecc2afe28595d087e7bdc44d7';
let sU2Add1 = '0x4991747c9f68fa92456b37b3642158cd20f3cf1d1939689a5337657193ab6b08';

let user3ID = '0x744456789983217654321abcd';
let address1User3 = '0x0220c2187de0136d738b407d1db5e3c6ab946112';
let vU3Add1 = '0x1c';
let rU3Add1 = ' 0xe5f3487bf4dde644f7d2d6eb4deb5fef3963e0c14f66accff8b1ac988c9162d5';
let sU3Add1 = ' 0x2459cfeea2064f65d39b4178e930b537b88c17b4159f5f7b6bcad32fa1e3bf01';


contract('CapManager', function(accounts) {
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
        if (signer != operator) {
            console.log("for testing this script testrpc must be started with known menomincs so keys are well known.")
            console.log("If keys are not known can't use existing signatures that verify user.");
            console.log("please run test rpc using bash script './runTestRpc' in root folder of this project.")
            assert(false);
        }

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

        await capManager.addOperator(operator);

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