pragma solidity ^0.4.23;


import "./KyberIEO.sol";
import "./IEORate.sol";
import "./ERC20Interface.sol";


contract ERC20Plus is ERC20 {
    function symbol() external view returns(string);
}


contract KyberIEOGetter {

    function getIEOInfo(KyberIEO IEO) public view returns (
        uint[3] IEOTimes,
        bool[4] IEOStates,
        uint[2] rate,
        uint[4] amounts,
        uint tokenDecimals,
        address tokenAddress,
        string symbol
        )
    {
        IEOTimes = [IEO.cappedIEOStartTime(), IEO.openIEOStartTime(), IEO.endIEOTime()];
        IEOStates = [IEO.IEOStarted(), IEO.openIEOStarted(), IEO.IEOEnded(), IEO.haltedIEO()];
        rate = [IEORate(IEO.IEORateContract()).ethToTokenNumerator(), IEORate(IEO.IEORateContract()).ethToTokenDenominator()];
        amounts = [IEO.distributedTokensTwei(), IEO.raisedWei(), IEO.contributorCapWei(), 0];
        amounts[3] = IEO.token().balanceOf(address(IEO));

        return(IEOTimes, IEOStates, rate, amounts, IEO.token().decimals(), IEO.token(), ERC20Plus(IEO.token()).symbol());
    }

    function getIEOsInfo(KyberIEO[] IEOs) public view returns(
        uint[] distributedTweiPerIEO,
        uint[] tokenBalancePerIEO,
        address[] tokenAddressPerIEO,
        bytes32[] tokenSymbolPerIEO,
        uint[] tokenDecimalsPerIEO
        )
    {

        distributedTweiPerIEO = new uint[](IEOs.length);
        tokenBalancePerIEO = new uint[](IEOs.length);
        tokenAddressPerIEO = new address[](IEOs.length);
        tokenSymbolPerIEO = new bytes32[](IEOs.length);
        tokenDecimalsPerIEO = new uint[](IEOs.length);

        for(uint i = 0; i < IEOs.length; i++) {
            distributedTweiPerIEO[i] = IEOs[i].distributedTokensTwei();
            tokenBalancePerIEO[i] = IEOs[i].token().balanceOf(address(IEOs[i]));
            tokenAddressPerIEO[i] = IEOs[i].token();
            tokenSymbolPerIEO[i] = stringToBytes32(ERC20Plus(IEOs[i].token()).symbol());
            tokenDecimalsPerIEO[i] = IEOs[i].token().decimals();
        }
    }

    function stringToBytes32(string memory source) public pure returns (bytes32 result) {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }
}
