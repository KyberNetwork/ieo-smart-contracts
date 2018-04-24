pragma solidity 0.4.23;


import './CapManager.sol';
import './ERC20Interface.sol';


contract KyberIEO is CapManager {
    ERC20 public token;
    uint  public raisedWei;
    uint  public soldTwei;
    bool  public haltSale;
    uint  public tokenDecimals;
    uint  public rateEthToTokenBps; // bps = 10000, so if rateEthToTokenBps is 10000 it means we trade one ether to one token.
    address public saleWallet;

    mapping(bytes32=>uint) public proxyPurchases;

    constructor (
        address _admin,
        address _saleWallet,
        ERC20 _token,
        address uinqueAddress,
        uint _cappedSaleStartTime,
        uint _publicSaleStartTime,
        uint _publicSaleEndTime)
        CapManager(_cappedSaleStartTime, _publicSaleStartTime, _publicSaleEndTime, _admin, uinqueAddress)
        public
    {
        require(_token != address(0));
        require(_saleWallet != address(0));

        tokenDecimals = token.decimals();
        require(tokenDecimals > 0);

        saleWallet = _saleWallet;
        token = _token;
    }


    function() public payable {
        buy(msg.sender);
    }

    function haltSale() public onlyAlerter {
        haltSale = true;
    }

    function resumeSale() public onlyAdmin {
        haltSale = false;
    }

    event Buy(address _buyer, uint _tokenTwei, uint _payedWei);
    function buy(address recipient) public payable returns(uint){
        require(tx.gasprice <= 50000000000 wei);
        require(!haltSale);
        require(saleStarted());
        require(!saleEnded());
        require(rateEthToTokenBps > 0);

        uint weiPayment = eligibleCheckAndIncrement(recipient, msg.value);

        require(weiPayment > 0);

        // send remaining wei to msg.sender, not to recipient
        if(msg.value > weiPayment) {
            msg.sender.transfer(msg.value.sub(weiPayment));
        }

        // send payment to wallet
        sendETHToSaleWallet(weiPayment);
        raisedWei = raisedWei.add(weiPayment);
        uint tokenQtyTwei = calcDstQty(weiPayment, ETH_DECIMALS, tokenDecimals, rateEthToTokenBps);

        require(token.transfer(recipient, tokenQtyTwei));
        soldTwei.add(tokenQtyTwei);

        emit Buy(recipient, tokenQtyTwei, weiPayment);

        return weiPayment;
    }

    // just to check that funds goes to the right place
    // tokens are not given in return
    function debugBuy() public payable {
        require(msg.value == 123);
        sendETHToSaleWallet(msg.value);
    }

    function sendETHToSaleWallet(uint valueWei) internal {
        saleWallet.transfer(valueWei);
    }
}