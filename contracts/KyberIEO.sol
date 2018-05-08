pragma solidity ^0.4.23;


import "./CapManager.sol";
import "./ERC20Interface.sol";
import "./IEORate.sol";
import "./KyberIEOInterface.sol";


contract KyberIEO is KyberIEOInterface, CapManager {
    mapping(address=>bool) public whiteListedAddresses;
    ERC20 public token;
    uint  public raisedWei;
    uint  public distributedTokensTwei;
    bool  public haltedIEO = false;
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

    event IEOHalted(address sender);
    function haltIEO() public onlyAlerter {
        haltedIEO = true;
        emit IEOHalted(msg.sender);
    }

    event IEOResumed(address sender);
    function resumeIEO() public onlyAdmin {
        haltedIEO = false;
        emit IEOResumed(msg.sender);
    }

    event Contribution(address msgSender, address contributor, uint userId, uint distributedTokensTwei, uint payedWei);
    function contribute(address contributor, uint userId, uint8 v, bytes32 r, bytes32 s) external payable returns(bool) {
        require(!haltedIEO);
        require(IEOStarted());
        require(!IEOEnded());
        require((contributor == msg.sender) || whiteListedAddresses[msg.sender]);

        uint rateNumerator;
        uint rateDenominator;
        require(validateContributor(contributor, userId, v, r, s));
        (rateNumerator, rateDenominator) = IEORateContract.getRate(contributor);
        require(rateNumerator > 0);
        require(rateDenominator > 0);

        uint weiPayment = eligibleCheckAndIncrement(userId, msg.value);
        require(weiPayment > 0);

        uint tokenQty = weiPayment.mul(rateNumerator).div(rateDenominator);
        require(tokenQty > 0);

        // send remaining wei to msg.sender, not to contributor
        if(msg.value > weiPayment) {
            msg.sender.transfer(msg.value.sub(weiPayment));
        }

        // send payment to wallet
        sendETHToContributionWallet(weiPayment);
        raisedWei = raisedWei.add(weiPayment);

        //send exchanged tokens to contributor
        require(token.transfer(contributor, tokenQty));
        distributedTokensTwei = distributedTokensTwei.add(tokenQty);

        emit Contribution(msg.sender, contributor, userId, tokenQty, weiPayment);

        return true;
    }

    event addressWhiteListed(address _address, bool whiteListed);
    function whiteListAddress(address addr, bool whiteListed) public onlyAdmin {
        whiteListedAddresses[addr] = whiteListed;
        emit addressWhiteListed(addr, whiteListed);
    }

    function getRate (address contributor) public view returns(uint rateNumerator, uint rateDenominator) {
        (rateNumerator, rateDenominator) = IEORateContract.getRate(contributor);
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
