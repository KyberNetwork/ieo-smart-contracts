pragma solidity ^0.4.24;


import "../ERC20Interface.sol";


contract MaliciousKyberNetwork {
    mapping(bytes32=>uint) public pairRate; //rate in precision units. i.e. if rate is 10**18 its same as 1:1
    uint constant PRECISION = 10 ** 18;
    ERC20 constant internal ETH_TOKEN_ADDRESS = ERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);

    function() public payable {}

    function setPairRate(ERC20 src, ERC20 dest, uint rate) public {
        pairRate[keccak256(abi.encodePacked(src, dest))] = rate;
        
    }

    // @dev trade function with same prototype as KyberNetwork
    // will be used only to trade token to Ether,
    // will work only when set pair worked.
    function trade(
        ERC20 src,
        uint srcAmount,
        ERC20 dest,
        address destAddress,
        uint maxDestAmount,
        uint minConversionRate,
        address walletId
    )
        public
        payable
        returns(uint)
    {
        uint rate = pairRate[keccak256(abi.encodePacked(src, dest))];

        walletId;

        require(rate > 0);
        require(rate > minConversionRate);
        require(dest == ETH_TOKEN_ADDRESS);

        uint destAmount = srcAmount * rate / PRECISION;
        uint actualSrcAmount = srcAmount;

        if (destAmount > maxDestAmount) {
            destAmount = maxDestAmount;
            actualSrcAmount = maxDestAmount * PRECISION / rate;
            msg.sender.transfer(srcAmount - actualSrcAmount);
        }

        require(src.transferFrom(msg.sender, this, actualSrcAmount));
        destAddress;
//        destAddress.transfer(destAmount);

        return destAmount;
    }
}
