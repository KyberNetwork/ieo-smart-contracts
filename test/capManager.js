let Permissions = artifacts.require("./PermissionGroups.sol");
let Withdrawable = artifacts.require("./Withdrawable.sol");
let TestToken = artifacts.require("./mockContracts/TestToken.sol");
let CapManager = artifacts.require("./CapManager.sol");

let Helper = require("./helper.js");

let token;
let admin;
let dayInSecs = 24 * 60 * 60;
let approver;
let cappedStartTime;
let openStartTime;
let endTime;
let contributor = '0x089965cfCBDA5B70E90764AA122C732D148eff71';

contract('CapManager', function(accounts) {
    it("test sale start / end times.", async function () {
        admin = accounts[0];
        let someUser = accounts[1];

        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
//        console.log(cappedStartTime + "  cappedStartTime")
//        console.log(openStartTime + "  openStartTime")
//        console.log(endTime + "  openStartTime")

        approver = await CapManager.new(cappedStartTime, openStartTime, endTime, admin);

        let isStarted = await approver.saleStarted();
        assert.equal(isStarted, false, "sale should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        isStarted = await approver.saleStarted();
        assert.equal(isStarted, true, "sale should be true now");

        let saleEnded = await approver.saleEnded();
        assert.equal(saleEnded, false, "sale should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        saleEnded = await approver.saleEnded();
        assert.equal(saleEnded, false, "sale should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        saleEnded = await approver.saleEnded();
        assert.equal(saleEnded, true, "sale should be false now");

    });

    it("test sale start / end times.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
//        console.log(cappedStartTime + "  cappedStartTime")
//        console.log(openStartTime + "  openStartTime")
//        console.log(endTime + "  openStartTime")

        approver = await CapManager.new(cappedStartTime, openStartTime, endTime, admin);

        let isStarted = await approver.saleStarted();
        assert.equal(isStarted, false, "sale should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        isStarted = await approver.saleStarted();
        assert.equal(isStarted, true, "sale should be true now");

        let saleEnded = await approver.saleEnded();
        assert.equal(saleEnded, false, "sale should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        saleEnded = await approver.saleEnded();
        assert.equal(saleEnded, false, "sale should be false now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);

        saleEnded = await approver.saleEnded();
        assert.equal(saleEnded, true, "sale should be false now");

    });

});