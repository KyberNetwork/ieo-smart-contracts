pragma solidity ^0.4.23;


import "./Withdrawable.sol";
import "./zeppelin/SafeMath.sol";


contract IEORate is Withdrawable {

    uint public ethToTokenNumerator;
    uint public ethToTokenDenominator;

    constructor(address admin) Withdrawable(admin) public
    {}

    event RateSet (uint rateNumerator, uint rateDenominator, address sender);

    function setRateEthToToken(uint rateNumerator, uint rateDenominator) public onlyOperator {
        require(rateNumerator > 0);
        require(rateDenominator > 0);

        ethToTokenNumerator = rateNumerator;
        ethToTokenDenominator = rateDenominator;
        emit RateSet(rateNumerator, rateDenominator, msg.sender);
    }

    function getRate (address contributor) public view returns(uint rateNumerator, uint rateDenominator) {
        contributor; //later shall have different rate per user. logic not defined yet.
        rateNumerator = ethToTokenNumerator;
        rateDenominator = ethToTokenDenominator;
    }
}
