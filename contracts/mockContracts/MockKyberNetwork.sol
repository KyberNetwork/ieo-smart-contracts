pragma solidity ^0.4.23;


import '../ERC20Interface.sol';


contract MockKyberNetwork {
    mapping(bytes32=>uint) pairRate; //rate in precision units. i.e. if rate is 10**18 its like 1:1
    uint constant PRECISION = 10 ** 18;
    ERC20 constant internal ETH_TOKEN_ADDRESS = ERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);

    function setPairRate(ERC20 src, ERC20 dest, uint rate) public {
        pairRate[keccak256(src, dest)] = rate;
    }

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
        uint rate = pairRate[keccak256(src, dest)];

        walletId;
        
        require(rate > 0);
        require(msg.value == srcAmount); //used only to trade ether to token
        require(rate > minConversionRate);

        uint destAmount = srcAmount * rate / PRECISION;
        uint actualSrcAmount = srcAmount;

        if (destAmount > maxDestAmount) {
            destAmount = maxDestAmount;
            actualSrcAmount = maxDestAmount * PRECISION / rate;
            msg.sender.transfer(srcAmount - actualSrcAmount);
        }

        dest.transfer(destAddress, destAmount);

        return destAmount;
    }
}
