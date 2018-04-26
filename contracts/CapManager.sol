pragma solidity ^0.4.23;


import './Withdrawable.sol';
import './zeppelin/SafeMath.sol';


contract CapManager is Withdrawable {
    mapping(address=>uint) participatedWei;
    uint public contributorCapWei;
    uint public ieoId; //uinque ID will be part of hash
    uint constant MAX_PURCHASE_WEI = (2 ** 256) - 1;
    uint public cappedIEOStartTime;
    uint public openIEOStartTime; //open IEO means no cap on purchase amount of KYC addresses.
    uint public endIEOTime;

    using SafeMath for uint;

    constructor (
        uint _cappedIEOTime,
        uint _openIEOTime,
        uint _endIEOTime,
        uint _contributorCapWei,
        uint ID,
        address _admin)
        Withdrawable(_admin)
        public
    {
        require(_cappedIEOTime < _openIEOTime);
        require(_openIEOTime < _endIEOTime);
        require(ID != 0);

        contributorCapWei = _contributorCapWei;
        ieoId = ID;
        cappedIEOStartTime = _cappedIEOTime;
        openIEOStartTime = _openIEOTime;
        endIEOTime = _endIEOTime;
    }

    function getContributorRemainingCap(address contributor) public view returns(uint capWei) {
        if (!saleStarted()) return 0;
        if (saleEnded()) return 0;

        if (openSaleStarted()) {
            capWei = MAX_PURCHASE_WEI;
        } else {
            if (participatedWei[contributor] >= contributorCapWei) capWei = 0;
            else capWei = contributorCapWei.sub(participatedWei[contributor]);
        }
    }

    function eligible(address contributor, uint amountWei) public view returns(uint) {
        uint remainingCap = getContributorRemainingCap(contributor);
        if (amountWei > remainingCap) return remainingCap;
        return amountWei;
    }

    event ContributorCapSet(uint capWei, address sender);
    function setContributorCap(uint capWei) public onlyAdmin {
        contributorCapWei = capWei;
        emit ContributorCapSet(capWei, msg.sender);
    }

    function saleStarted() public view returns(bool) {
        return (now >= cappedIEOStartTime);
    }

    function openSaleStarted() public view returns(bool) {
        return (now > openIEOStartTime);
    }

    function saleEnded() public view returns(bool) {
        return (now > endIEOTime);
    }

    function validateContributor(address contributor, uint8 v, bytes32 r, bytes32 s) internal view returns(bool)
    {
        require(verifySignature(keccak256(contributor, ieoId), v, r, s));
        return true;
    }

    function eligibleCheckAndIncrement(
        address contributor,
        uint amountInWei)
        internal returns(uint)
    {
        uint result = eligible(contributor, amountInWei);
        participatedWei[contributor] = participatedWei[contributor].add(result);

        return result;
    }

    function verifySignature(bytes32 hash, uint8 v, bytes32 r, bytes32 s) internal view returns(bool) {
        address signer = ecrecover(hash, v, r, s);
        return operators[signer];
    }
}