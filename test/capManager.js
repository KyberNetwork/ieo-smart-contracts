let Permissions = artifacts.require("./PermissionGroups.sol");
let Withdrawable = artifacts.require("./Withdrawable.sol");
let TestToken = artifacts.require("./mockContracts/TestToken.sol");
let CapManager = artifacts.require("./CapManager.sol");

let Helper = require("./helper.js");
let BigNumber = require('../../bignumber.js');

let token;
let admin;
let dayInSecs = 24 * 60 * 60;
let approver;
let cappedStartTime;
let openStartTime;
let endTime;
let capWei = (new BigNumber(10)).pow(18).div(2); //0.5 ether
let maxCapWei = (new BigNumber(2)).pow(256).sub(1);
let contributor;

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

        approver = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei, admin);

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

    it("test eligible cap for user during sale stages.", async function () {
        let now = await web3.eth.getBlock('latest').timestamp;
//        console.log("now " + now);

        cappedStartTime = now * 1 + dayInSecs * 1;
        openStartTime = now * 1 + dayInSecs * 2;
        endTime = now * 1 + dayInSecs * 3;
        approver = await CapManager.new(cappedStartTime, openStartTime, endTime, capWei, admin);

        let cap = await approver.getContributorRemainingCap(someUser);
        assert.equal(cap, 0, "cap should be 0");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await approver.getContributorRemainingCap(someUser);;
        assert.equal(cap, capWei, "cap shold be as user cap now");

        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await approver.getContributorRemainingCap(someUser);;
        assert.equal(cap, maxCapWei, "cap shold be max Cap");


        await Helper.sendPromise('evm_increaseTime', [(dayInSecs + 1 * 50)]);
        await Helper.sendPromise('evm_mine', []);
        cap = await approver.getContributorRemainingCap(someUser);;
        assert.equal(cap, 0, "cap shold be 0");
    });

});