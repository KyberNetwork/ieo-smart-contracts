pragma solidity ^0.4.23;


import './CapManager.sol';
import './ERC20Interface.sol';
import './IEORate.sol';
import './KyberIEOInterface.sol';


contract KyberIEO is CapManager {
    ERC20 public token;
    uint  public raisedWei;
    uint  public distributedTokensTwei;
    bool  public haltSale = false;
    IEORate public IEORateContract;
    address public contributionWallet;

    constructor (
        address _admin,
        address _contributionWallet,
        ERC20 _token,
        uint _contributorCapWei,
        uint _IEOId,
        uint _cappedIEOStart,
        uint _openIEOStart,
        uint _publicIEOEnd)
        CapManager(_cappedIEOStart, _openIEOStart, _publicIEOEnd, _contributorCapWei, _IEOId, _admin)
        public
    {
        require(_token != address(0));
        require(_contributionWallet != address(0));

        IEORateContract = new IEORate(_admin);
        contributionWallet = _contributionWallet;
        token = _token;
    }

    event SaleHalted(address sender);
    function haltSale() public onlyAlerter {
        haltSale = true;
        emit SaleHalted(msg.sender);
    }

    event SaleResumed(address sender);
    function resumeSale() public onlyAdmin {
        haltSale = false;
        emit SaleResumed(msg.sender);
    }

    event Contribution(address contributor, uint distributedTokensTwei, uint payedWei);
    function contribute(address contributor, uint8 v, bytes32 r, bytes32 s) external payable returns(bool) {
        require(!haltSale);
        require(IEOStarted());
        require(!IEOEnded());

        uint rateNumerator;
        uint rateDenominator;
        (rateNumerator, rateDenominator) = IEORateContract.getRate();
        require(rateNumerator > 0);
        require(rateDenominator > 0);
        require(validateContributor(contributor, v, r, s));

        uint weiPayment = eligibleCheckAndIncrement(contributor, msg.value);
        require(weiPayment > 0);

        uint tokenQty = weiPayment.mul(rateNumerator).div(rateDenominator);
        require(tokenQty > 0);

        // send remaining wei to msg.sender, not to recipient
        if(msg.value > weiPayment) {
            msg.sender.transfer(msg.value.sub(weiPayment));
        }

        // send payment to wallet
        sendETHToContributionWallet(weiPayment);
        raisedWei = raisedWei.add(weiPayment);

        //send exchanged tokens to contributor
        require(token.transfer(contributor, tokenQty));
        distributedTokensTwei = distributedTokensTwei.add(tokenQty);

        emit Contribution(contributor, tokenQty, weiPayment);

        return true;
    }

    function getRate () public view returns(uint rateNumerator, uint rateDenominator) {
        (rateNumerator, rateDenominator) = IEORateContract.getRate();
    }

    // just to check that funds goes to the right place
    // tokens are not given in return
    function debugBuy() public payable {
        require(msg.value == 123);
        sendETHToContributionWallet(msg.value);
    }

    function sendETHToContributionWallet(uint valueWei) internal {
        contributionWallet.transfer(valueWei);
    }
}