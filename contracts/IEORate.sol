pragma solidity ^0.4.23;


import './Withdrawable.sol';
import './zeppelin/SafeMath.sol';


contract IEORate is Withdrawable {

    uint public rateEthToTokenBps; // bps = 10000, so if rateEthToTokenBps is 10000 it means we trade one ether to one token.

    constructor(address admin) Withdrawable(admin) public
    {}

    function setRateEthToToken(uint rateBps) public onlyOperator {
        rateEthToTokenBps = rateBps;
    }

    function getRateBps () public view returns(uint) {
        return rateEthToTokenBps;
    }
}
