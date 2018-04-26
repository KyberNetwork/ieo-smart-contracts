pragma solidity ^0.4.23;


import './Withdrawable.sol';
import './zeppelin/SafeMath.sol';


contract IEORate is Withdrawable {

    uint public rateEthToToken;

    constructor(address admin) Withdrawable(admin) public
    {}

    event RateSet (uint rate, address sender);

    function setRateEthToToken(uint rate) public onlyOperator {
        rateEthToToken = rate;
        emit RateSet(rate, msg.sender);
    }

    function getRate () public view returns(uint) {
        return rateEthToToken;
    }
}
