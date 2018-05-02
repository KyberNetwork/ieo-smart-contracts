pragma solidity ^0.4.23;


import "./ERC20Interface.sol";
import "./Withdrawable.sol";
import "./KyberIEOInterface.sol";
import "./zeppelin/SafeMath.sol";


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

    using SafeMath for uint;

    constructor(address _admin) public Withdrawable(_admin) {}

    function() public payable {}

    struct ContributeData {
        uint userId;
        ERC20 token;
        uint amountTwei;
        uint minConversionRate;
        uint maxDestAmountWei;
        KyberNetwork network;
        KyberIEOInterface kyberIEO;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    event ContributionByToken(address contributor, uint userId, ERC20 token, uint amountSentTwei, uint tradedWei, uint changeTwei);
    function contributeWithToken(
        uint userId,
        ERC20 token,
        uint amountTwei,
        uint minConversionRate,
        uint maxDestAmountWei,
        KyberNetwork network,
        KyberIEOInterface kyberIEO,
        uint8 v,
        bytes32 r,
        bytes32 s) external returns(bool)
    {
        ContributeData memory data = ContributeData(userId, token, amountTwei, minConversionRate, maxDestAmountWei, network,
            kyberIEO, v, r, s);
        return contribute(data);
    }

    function contribute(ContributeData data) internal returns(bool) {
        uint weiCap = data.kyberIEO.getContributorRemainingCap(data.userId);
        if (data.maxDestAmountWei < weiCap) weiCap = data.maxDestAmountWei;
        require(weiCap > 0);

        uint initialTokenBalance = data.token.balanceOf(this);

        require(data.token.transferFrom(msg.sender, this, data.amountTwei));

        data.token.approve(address(data.network), data.amountTwei);
        uint amountWei = data.network.trade(data.token, data.amountTwei, ETH_TOKEN_ADDRESS, this, weiCap,
            data.minConversionRate, this);

        //emit event here where we still have valid "change" value
        emit ContributionByToken(msg.sender, data.userId, data.token, data.amountTwei, amountWei, data.token.balanceOf(this));

        if (data.token.balanceOf(this) > initialTokenBalance) {
            //if not all tokens were taken by network approve value is not zereod.
            // must zero it so next time will not revert.
            data.token.approve(address(data.network), 0);
            data.token.transfer(msg.sender, (data.token.balanceOf(this).sub(initialTokenBalance)));
        }

        require(data.kyberIEO.contribute.value(amountWei)(msg.sender, data.userId, data.v, data.r, data.s));
        return true;
    }
}
