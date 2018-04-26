pragma solidity ^0.4.23;


import './Withdrawable.sol';
import './zeppelin/SafeMath.sol';


contract IEORate is Withdrawable {

    uint public rateEthToToken; // bps = 10000, so if rateEthToTokenBps is 10000 it means we trade one ether to one token.

    constructor(address admin) Withdrawable(admin) public
    {}

    event setRate (uint rate, address sender);

    function setRateEthToToken(uint rate) public onlyOperator {
        rateEthToToken = rate;
    }

    function getRate () public view returns(uint) {
        return rateEthToToken;
    }
}
