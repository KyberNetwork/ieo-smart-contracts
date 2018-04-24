pragma solidity ^0.4.23;


import './Withdrawable.sol';
import './zeppelin/SafeMath.sol';


contract CapManager is Withdrawable {
    mapping(address=>uint) contributorCategory;
    mapping(uint=>uint) categoryCapWei;
    mapping(address=>uint) participatedWei;
    address public someUniqueAddress;
    uint constant MAX_PURCHASE_WEI = 10 ** 30;
    uint constant internal MAX_DECIMAL_DIFF = 18;
    uint constant internal ETH_DECIMALS = 18;
    uint constant internal BPS = 10000;
    uint constant internal MAX_RATE = (BPS * 10**6); // up to 1M tokens per ETH
    uint public cappedIEOStartTime;
    uint public openIEOStartTime; //open IEO means no cap on purchase amount of KYC addresses.
    uint public endIEOTime;

    using SafeMath for uint;

    constructor (uint _cappedIEOTime, uint _openIEOTime, uint _endIEOTime, address uniqueAddress, address _admin)
        Withdrawable(_admin)
        public
    {
        require(_cappedIEOTime < _openIEOTime);
        require(_openIEOTime < _endIEOTime);
        require(uniqueAddress != address(0));

        someUniqueAddress = uniqueAddress;
        cappedIEOStartTime = _cappedIEOTime;
        openIEOStartTime = _openIEOTime;
        endIEOTime = _endIEOTime;
    }

    function getContributorCapWei(address contributor) public view returns(uint capWei) {
        capWei = categoryCapWei[contributorCategory[contributor]];
    }

    function getContributorRemainingCapWei(address contributor) public view returns(uint capWei) {
        if(now >= endIEOTime) return 0;
        if(contributorCategory[contributor] == 0) return 0;

        capWei = categoryCapWei[contributorCategory[contributor]];
    }

    function eligible(address contributor, uint amountWei) public view returns(uint) {
        if(now < cappedIEOStartTime) return 0;
        if(now >= endIEOTime) return 0;
        if(contributorCategory[contributor] == 0) return 0;

        if (now < openIEOStartTime) {
            uint capWei = categoryCapWei[contributorCategory[contributor]];
            if (participatedWei[contributor] >= capWei) return 0;

            uint remainingCap = capWei.sub(participatedWei[contributor]);
            if (amountWei > remainingCap) return remainingCap;
            return amountWei;
        }

        return amountWei;
    }

    function setCagtegoryCap(uint category, uint capWei) public onlyAdmin {
        categoryCapWei[category] = capWei;
    }

    function setContributorCategory(
        address contributor,
        uint category,
        address thisAddress,
        uint8 v,
        bytes32 r,
        bytes32 s) public onlyOperator
    {
        require(thisAddress == address(this));
        require(verifySignature(keccak256(contributor, category, someUniqueAddress), v, r, s));

        contributorCategory[contributor] = category;
    }

    function saleStarted() public view returns(bool) {
        return (now >= cappedIEOStartTime);
    }

    function saleEnded() public view returns(bool) {
        return (now > endIEOTime);
    }

    function eligibleCheckAndIncrement(address contributor, uint amountInWei) internal returns(uint) {
        uint result = eligible(contributor, amountInWei);
        participatedWei[contributor] = participatedWei[contributor].add( result );

        return result;
    }

    function verifySignature(bytes32 hash, uint8 v, bytes32 r, bytes32 s) internal view returns(bool) {
        address signer = ecrecover(hash, v, r, s);
        return operators[signer];
    }

    function calcDstQty(uint srcQty, uint srcDecimals, uint dstDecimals, uint rateBps) internal pure returns(uint) {

        if (dstDecimals >= srcDecimals) {
            require((dstDecimals.sub(srcDecimals)) <= MAX_DECIMAL_DIFF);
            return ((srcQty.mul(rateBps).mul(10 ** (dstDecimals.sub(srcDecimals))))).div(BPS);
        } else {
            require((srcDecimals.sub(dstDecimals)) <= MAX_DECIMAL_DIFF);
            return srcQty.mul(rateBps).div(BPS.mul(10 ** (srcDecimals.sub(dstDecimals))));
        }
    }
}