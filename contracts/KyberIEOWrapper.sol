pragma solidity ^0.4.23;


import './KyberIEO.sol';
import './ERC20Interface.sol';


interface KyberNetwork {
    function trade(ERC20 src, uint srcAmount, ERC20 dest, address destAddress, uint maxDestAmount,
        uint minConversionRate, address walletId) external payable returns(uint);
    function getExpectedRate(ERC20 src, ERC20 dest, uint srcQty) external view
        returns (uint expectedRate, uint slippageRate);
}


contract KyberIEOWrapper is Withdrawable {

    KyberNetwork kyberNetwork;
    KyberIEO kyberIeo;
    ERC20 constant internal ETH_TOKEN_ADDRESS = ERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);

    constructor(KyberNetwork _kyber, address _admin) public Withdrawable(_admin) {
        require (_kyber != address(0));
        kyberNetwork = _kyber;
    }

    event ContributionToken(address contributor, ERC20 token, uint amountTwei, uint tradedWei, uint change);
    function contributeWithToken(
        address contributor,
        ERC20 token,
        uint amountTwei,
        uint8 v,
        bytes32 r,
        bytes32 s) public returns(uint)
    {
        uint weiCap = kyberIeo.getContributorRemainingCap(contributor);
        require(weiCap > 0);

        uint expectedRate;
        uint slippageRate;
        (expectedRate, slippageRate) = kyberNetwork.getExpectedRate(token, ETH_TOKEN_ADDRESS, amountTwei);

        require(expectedRate > 0);
        require(token.transferFrom(contributor, this, amountTwei));

        token.approve(address(kyberNetwork), amountTwei);
        uint amountWei = kyberNetwork.trade(token, amountTwei, ETH_TOKEN_ADDRESS, address(this), weiCap,
            slippageRate, address(kyberIeo.IEOId));

        uint change = token.balanceOf(this);
        if (change > 0) token.transfer(contributor, change);

        kyberIeo.contribute.value(amountWei)(contributor, v, r, s);

        emit ContributionToken(contributor, token, amountWei, amountTwei, change);
    }
}
