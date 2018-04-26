pragma solidity ^0.4.23;


import './CapManager.sol';
import './ERC20Interface.sol';
import './IEORate.sol';
import './KyberIEOInterface.sol';


contract KyberIEO is CapManager, KyberIEOInterface {
    ERC20 public token;
    uint  public raisedWei;
    uint  public distributed;
    bool  public haltSale;
    IEORate public IEORateContract;
    address public contributionWallet;

    constructor (
        address _admin,
        address _contributionWallet,
        ERC20 _token,
        uint _contributorCapWei,
        uint _IEOId,
        uint _cappedSaleStart,
        uint _publicSaleStart,
        uint _publicSaleEnd)
        CapManager(_cappedSaleStart, _publicSaleStart, _publicSaleEnd, _contributorCapWei, _IEOId, _admin)
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

    event Contribution(address contributor, uint distributed, uint payedWei);
    function contribute(address contributor, uint8 v, bytes32 r, bytes32 s) external payable returns(bool) {
        require(!haltSale);
        require(saleStarted());
        require(!saleEnded());
        require(IEORateContract.getRate() > 0);
        require(validateContributor(contributor, v, r, s));

        uint weiPayment = eligibleCheckAndIncrement(contributor, msg.value);
        require(weiPayment > 0);

        // send remaining wei to msg.sender, not to recipient
        if(msg.value > weiPayment) {
            msg.sender.transfer(msg.value.sub(weiPayment));
        }

        // send payment to wallet
        sendETHToContributionWallet(weiPayment);
        raisedWei = raisedWei.add(weiPayment);
        uint tokenQty = weiPayment.mul(IEORateContract.getRate());

        require(token.transfer(contributor, tokenQty));
        distributed.add(tokenQty);

        emit Contribution(contributor, tokenQty, weiPayment);

        return true;
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