pragma solidity 0.4.23;


import './CapManager.sol';
import './ERC20Interface.sol';
import './IEORate.sol';


contract KyberIEO is CapManager {
    ERC20 public token;
    uint  public raisedWei;
    uint  public soldTwei;
    bool  public haltSale;
    uint  public tokenDecimals;
    address public IEOWrapperContract;
    IEORate public IEORateContract;
    address public contributionWallet;

    mapping(bytes32=>uint) public proxyPurchases;

    constructor (
        address _admin,
        address _contributionWallet,
        ERC20 _token,
        uint _contributorCapWei,
        address uinqueAddress,
        uint _cappedSaleStart,
        uint _publicSaleStart,
        uint _publicSaleEnd)
        CapManager(_cappedSaleStart, _publicSaleStart, _publicSaleEnd, _contributorCapWei, _admin, uinqueAddress)
        public
    {
        require(_token != address(0));
        require(_contributionWallet != address(0));

        tokenDecimals = token.decimals();
        require(tokenDecimals > 0);

        IEORateContract = new IEORate(_admin);
        contributionWallet = _contributionWallet;
        token = _token;
    }

    function haltSale() public onlyAlerter {
        haltSale = true;
    }

    function resumeSale() public onlyAdmin {
        haltSale = false;
    }

    event Contribute(address _buyer, uint _tokenTwei, uint _payedWei);

    function contribute(address contributor, uint8 v, bytes32 r, bytes32 s) public payable returns(uint) {
        require(tx.gasprice <= 50000000000 wei);
        require(!haltSale);
        require(saleStarted());
        require(!saleEnded());
        require(IEORateContract.getRateBps() > 0);
        require((msg.sender == contributor) || (msg.sender == IEOWrapperContract));
        require(validateContributor(contributor, v, r, s));

        uint weiPayment = eligibleCheckAndIncrement(contributor, msg.value);
        require(weiPayment > 0);

        // send remaining wei to msg.sender, not to recipient
        if(msg.value > weiPayment) {
            msg.sender.transfer(msg.value.sub(weiPayment));
        }

        // send payment to wallet
        sendETHToSaleWallet(weiPayment);
        raisedWei = raisedWei.add(weiPayment);
        uint tokenQtyTwei = calcDstQty(weiPayment, ETH_DECIMALS, tokenDecimals, IEORateContract.getRateBps());

        require(token.transfer(contributor, tokenQtyTwei));
        soldTwei.add(tokenQtyTwei);

        emit Contribute(contributor, tokenQtyTwei, weiPayment);

        return weiPayment;
    }

    function setIEOWrapperAddress(address _IEOWrapper) public onlyAdmin {
        require(_IEOWrapper != address(0));
        IEOWrapperContract = _IEOWrapper;
    }

    // just to check that funds goes to the right place
    // tokens are not given in return
    function debugBuy() public payable {
        require(msg.value == 123);
        sendETHToSaleWallet(msg.value);
    }

    function sendETHToSaleWallet(uint valueWei) internal {
        contributionWallet.transfer(valueWei);
    }
}