pragma solidity ^0.4.23;


import "../PermissionGroups.sol";


contract MockPermission is PermissionGroups {
    uint public rate;
    bool public tradeActive = true;

    constructor() public
        PermissionGroups(msg.sender)
    {
    }

    function setRate ( uint newRate ) public
        onlyOperator
    {
        rate = newRate;
    }

    function stopTrade () public
        onlyAlerter
    {
        tradeActive = false;
    }

    function activateTrade () public
        onlyOperator
    {
        tradeActive = true;
    }
}
