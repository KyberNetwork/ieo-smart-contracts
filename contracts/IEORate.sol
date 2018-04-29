pragma solidity ^0.4.23;


import './Withdrawable.sol';
import './zeppelin/SafeMath.sol';


contract IEORate is Withdrawable {

    uint public ethToTokenNumerator;
    uint public ethToTokenDenominator;

    constructor(address admin) Withdrawable(admin) public
    {}

    event RateSet (uint rateNumerator, uint rateDenominator, address sender);

    function setRateEthToToken(uint rateNumerator, uint rateDenominator) public onlyOperator {
        ethToTokenNumerator = rateNumerator;
        ethToTokenDenominator = rateDenominator;
        emit RateSet(rateNumerator, rateDenominator, msg.sender);
    }

    function getRate () public view returns(uint rateNumerator, uint rateDenominator) {
        rateNumerator = ethToTokenNumerator;
        rateDenominator = ethToTokenDenominator;
    }
}
