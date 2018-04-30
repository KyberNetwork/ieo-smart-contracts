let Permissions = artifacts.require("./PermissionGroups.sol");
let Withdrawable = artifacts.require("./Withdrawable.sol");
let CapManager = artifacts.require("./CapManager.sol");

let Helper = require("./helper.js");
let BigNumber = require('bignumber.js');

let admin;
let someUser;
let IEOId = '0x1234';
let dayInSecs = 24 * 60 * 60;
let capManager;
let cappedStartTime;
let openStartTime;
let endTime;
let capWei = (new BigNumber(10)).pow(18).div(2); //0.5 ether
let maxCapWei = ((new BigNumber(2)).pow(256)).minus(1);
let contributor;

contract('CapManager', function(accounts) {
    it("test IEO start / end times.", async function () {
        admin = accounts[0];
        someUser = accounts[1];

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
        assert.equal(isStarted, false, "IEO started should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        isStarted = await capManager.IEOStarted();
        assert.equal(isStarted, true, "IEO should be true now");

        let IEOEnded = await capManager.IEOEnded();
        assert.equal(IEOEnded, false, "IEO should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        IEOEnded = await capManager.IEOEnded();
        assert.equal(IEOEnded, false, "IEO should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        IEOEnded = await capManager.IEOEnded();
        assert.equal(IEOEnded, true, "IEO should be false now");

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
});