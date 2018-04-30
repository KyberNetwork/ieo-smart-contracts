pragma solidity ^0.4.23;


import "./ERC20Interface.sol";
import "./Withdrawable.sol";
import "./KyberIEOInterface.sol";


interface KyberNetwork {
    function trade(
        ERC20 src,
        uint srcAmount,
        ERC20 dest,
        address destAddress,
        uint maxDestAmount,
        uint minConversionRate,
        address walletId) external payable returns(uint);
}


contract KyberIEOWrapper is Withdrawable {

    ERC20 constant internal ETH_TOKEN_ADDRESS = ERC20(0x00eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee);

    constructor(address _admin) public Withdrawable(_admin) {}

    function() public payable {}

    event ContributionByToken(address contributor, ERC20 token, uint amountSentTwei, uint tradedWei, uint changeTwei);
    function contributeWithToken(
        ERC20 token,
        uint amountTwei,
        uint minConversionRate,
        KyberNetwork network,
        KyberIEOInterface kyberIEO,
        uint8 v,
        bytes32 r,
        bytes32 s) public returns(bool)
    {
        uint weiCap = kyberIEO.getContributorRemainingCap(msg.sender);
        require(weiCap > 0);

        require(token.transferFrom(msg.sender, this, amountTwei));

        token.approve(address(network), amountTwei);
        uint amountWei = network.trade(token, amountTwei, ETH_TOKEN_ADDRESS, this, weiCap,
            minConversionRate, address(kyberIEO.getIEOId()));

        //emit event here where we still have valid "change" value
        emit ContributionByToken(msg.sender, token, amountTwei, amountWei, token.balanceOf(this));

        if (token.balanceOf(this) > 0) {
            //if not all tokens were taken by network approve value is not zereod.
            // must zero it so next time will not revert.
            token.approve(address(network), 0);
            token.transfer(msg.sender, token.balanceOf(this));
        }

        require(kyberIEO.contribute.value(amountWei)(msg.sender, v, r, s));
        return true;
    }
}
