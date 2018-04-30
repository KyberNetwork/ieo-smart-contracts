let Permissions = artifacts.require("./PermissionGroups.sol");
let Withdrawable = artifacts.require("./Withdrawable.sol");
let TestToken = artifacts.require("./mockContracts/TestToken.sol");
let MockWithdrawable = artifacts.require("./mockContracts/MockWithdrawable.sol");

let Helper = require("./helper.js");

let token;
let admin;

contract('Withdrawable', function(accounts) {
    it("should test withdraw token success for admin.", async function () {

        admin = accounts[0];
        let someUser = accounts[1];
        //init globals
        let withdrawableInst = await Withdrawable.new(admin);
        token = await TestToken.new("tst", "test", 18);

        // transfer some tokens to withdrawable.
        await token.transfer (withdrawableInst.address, 100);

        let balance = await token.balanceOf(withdrawableInst.address);
        assert.equal(balance.valueOf(), 100, "unexpected balance in withdrawable contract.");

        let rxAdmin = await withdrawableInst.admin();
        assert.equal(admin, rxAdmin.valueOf(), "wrong admin " + rxAdmin.valueOf());

        // withdraw the tokens from withdrawableInst
        await withdrawableInst.withdrawToken(token.address, 60, someUser);

        balance = await token.balanceOf(withdrawableInst.address);
        assert.equal(balance.valueOf(), 40, "unexpected balance in withdrawble contract.");

        balance = await token.balanceOf(someUser);
        assert.equal(balance.valueOf(), 60, "unexpected balance in accounts[1].");
    });

    it("should test withdraw token reject for non admin.", async function () {
        // transfer some tokens to withdrawable.
        let withdrawableInst = await Withdrawable.new(admin);
        await token.transfer (withdrawableInst.address, 100);

        try {
            // withdraw the tokens from withdrawableInst
            await withdrawableInst.withdrawToken(token.address, 60, accounts[2], {from: accounts[2]});
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        let balance = await token.balanceOf(withdrawableInst.address);
        assert.equal(balance.valueOf(), 100, "unexpected balance in withdrawble contract.");

        balance = await token.balanceOf(accounts[2]);
        assert.equal(balance.valueOf(), 0, "unexpected balance in accounts[1].");
    });
    it("should test withdraw token reject when amount too high.", async function () {
        // transfer some tokens to withdrawable.
        let withdrawableInst = await Withdrawable.new(admin);
        await token.transfer (withdrawableInst.address, 100);

        try {
            // withdraw the tokens from withdrawableInst
            await withdrawableInst.withdrawToken(token.address, 130, accounts[3]);
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        let balance = await token.balanceOf(withdrawableInst.address);
        assert.equal(balance.valueOf(), 100, "unexpected balance in withdrawble contract.");
    });
    it("should test withdraw ether success for admin.", async function () {
        let mockWithdrawableInst = await MockWithdrawable.new();
        // send some ether to withdrawable.
        await Helper.sendEtherWithPromise(accounts[7], mockWithdrawableInst.address, 10);

        // withdraw the ether from withdrawableInst
        await mockWithdrawableInst.withdrawEther(7, accounts[7])

        let balance = await Helper.getBalancePromise(mockWithdrawableInst.address);
        assert.equal(balance.valueOf(), 3, "unexpected balance in withdrawble contract.");
    });
    it("should test withdraw ether reject for non admin.", async function () {
        let mockWithdrawableInst = await MockWithdrawable.new();
        // send some ether to withdrawable.
        await Helper.sendEtherWithPromise(accounts[7], mockWithdrawableInst.address, 10);

        // try to withdraw the ether from withdrawableInst
        try {
            // withdraw the tokens from withdrawableInst
            await mockWithdrawableInst.withdrawEther(7, accounts[7], {from: accounts[7]});
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        let balance = await Helper.getBalancePromise(mockWithdrawableInst.address);
        assert.equal(balance.valueOf(), 10, "unexpected balance in withdrawble contract.");
    });
    it("should test withdraw ether reject when amount too high.", async function () {
        let mockWithdrawableInst = await MockWithdrawable.new();
        // send some ether to withdrawable.
        await Helper.sendEtherWithPromise(accounts[7], mockWithdrawableInst.address, 10);

        // try to withdraw the ether from withdrawableInst
        try {
            // withdraw the tokens from withdrawableInst
            await mockWithdrawableInst.withdrawEther(15, accounts[7]);
            assert(false, "expected to throw error in line above.")
        } catch(e){
            assert(Helper.isRevertErrorMessage(e), "expected throw but got: " + e);
        }

        let balance = await Helper.getBalancePromise(mockWithdrawableInst.address);
        assert.equal(balance.valueOf(), 10, "unexpected balance in withdrawble contract.");
    });
});