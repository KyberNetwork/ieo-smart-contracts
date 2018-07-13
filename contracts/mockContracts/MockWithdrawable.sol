pragma solidity ^0.4.24;


import "../Withdrawable.sol";


contract MockWithdrawable is Withdrawable {
    constructor() Withdrawable(msg.sender) public {}
    function () public payable { }
}
