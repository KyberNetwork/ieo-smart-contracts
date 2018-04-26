pragma solidity ^0.4.23;


import './KyberIEO.sol';
import './ERC20Interface.sol';


interface KyberNetwork {
    function trade(ERC20 src, uint srcAmount, ERC20 dest, address destAddress, uint maxDestAmount,
        uint minConversionRate, address walletId) external payable returns(uint);
    function getExpectedRate(ERC20 src, ERC20 dest, uint srcQty) external view
        returns (uint expectedRate, uint slippageRate);
}

interface KyberIEOInterface {
    function contribute(address contributor, uint8 v, bytes32 r, bytes32 s) external payable returns(uint);
    function getContributorRemainingCap(address contributor) external view returns(uint capWei);
    function IEOId() external view returns(uint);
}


contract KyberIEOWrapper is Withdrawable {

    ERC20 constant internal ETH_TOKEN_ADDRESS = ERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);

    constructor(address _admin) public Withdrawable(_admin) {}

    event ContributionToken(address contributor, ERC20 token, uint amountTwei, uint tradedWei, uint change);
    function contributeWithToken(
        ERC20 token,
        uint amountTwei,
        uint minConversionRate,
        KyberNetwork network,
        KyberIEOInterface kyberIEO,
        uint8 v,
        bytes32 r,
        bytes32 s) public returns(uint)
    {
        uint weiCap = kyberIEO.getContributorRemainingCap(msg.sender);
        require(weiCap > 0);

        require(token.transferFrom(msg.sender, this, amountTwei));

        token.approve(address(network), amountTwei);
        uint amountWei = network.trade(token, amountTwei, ETH_TOKEN_ADDRESS, address(this), weiCap,
            minConversionRate, address(kyberIEO.IEOId()));

        //emit event here where we still have valid "change" value
        emit ContributionToken(msg.sender, token, amountWei, amountTwei, token.balanceOf(this));

        if (token.balanceOf(this) > 0) {
            token.approve(address(network), 0);
            token.transfer(msg.sender, token.balanceOf(this));
        }

        kyberIEO.contribute.value(amountWei)(msg.sender, v, r, s);
    }
}
