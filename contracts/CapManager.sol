pragma solidity ^0.4.23;


import "./Withdrawable.sol";
import "./zeppelin/SafeMath.sol";


//@Title Cap manager handles contribution cap per contributor.
//@dev   IEO will have 2 phases:
//          First phase is capped IEO where each contributor can contribute up to capped amount.
//          Second phase will be open for unlimited contributions that are blocked only by amount of tokens.
contract CapManager is Withdrawable {
    mapping(uint=>uint) public participatedWei;
    uint public contributorCapWei;
    uint internal IEOId; //uinque ID will be part of hash
    uint constant public MAX_PURCHASE_WEI = uint(-1);
    uint public cappedIEOStartTime;
    uint public openIEOStartTime; //open IEO means no cap on purchase amount of KYC addresses.
    uint public endIEOTime;

    using SafeMath for uint;

    constructor(uint _cappedIEOTime,
        uint _openIEOTime,
        uint _endIEOTime,
        uint _contributorCapWei,
        uint _IEOId,
        address _admin)
        Withdrawable(_admin)
        public
    {
        require(_cappedIEOTime >= now); // solium-disable-line security/no-block-members
        require(_cappedIEOTime <= _openIEOTime);
        require(_openIEOTime <= _endIEOTime);
        require(_IEOId != 0);

        contributorCapWei = _contributorCapWei;
        IEOId = _IEOId;
        cappedIEOStartTime = _cappedIEOTime;
        openIEOStartTime = _openIEOTime;
        endIEOTime = _endIEOTime;
    }

    //@dev  getContributorRemainingCap returns remaining cap for a contributor
    //      Assuming that contributor has passed KYC process = is allowed to participate.
    //      If contributor hasn"t participated - it will return full cap according to IEO stage (capped / open / close).
    //      If contributor already participated. when IEO in capped stage, will return contributor cap less previous
    //        participation. if open contribute stage will return max cap.
    //        notice the participation amount will still be blocked by token balance of this contract.
    function getContributorRemainingCap(uint userId) public view returns(uint capWei) {
        if (!IEOStarted()) return 0;
        if (IEOEnded()) return 0;

        if (openIEOStarted()) {
            capWei = MAX_PURCHASE_WEI;
        } else {
            if (participatedWei[userId] >= contributorCapWei) capWei = 0;
            else capWei = contributorCapWei.sub(participatedWei[userId]);
        }
    }

    function eligible(uint userID, uint amountWei) public view returns(uint) {
        uint remainingCap = getContributorRemainingCap(userID);
        if (amountWei > remainingCap) return remainingCap;
        return amountWei;
    }

    event ContributorCapSet(uint capWei, address sender);
    function setContributorCap(uint capWei) public onlyAdmin {
        contributorCapWei = capWei;
        emit ContributorCapSet(capWei, msg.sender);
    }

    function IEOStarted() public view returns(bool) {
        return (now >= cappedIEOStartTime); // solium-disable-line security/no-block-members
    }

    function openIEOStarted() public view returns(bool) {
        return (now >= openIEOStartTime); // solium-disable-line security/no-block-members
    }

    function IEOEnded() public view returns(bool) {
        return (now >= endIEOTime); // solium-disable-line security/no-block-members
    }

    function validateContributor(address contributor, uint userId, uint8 v, bytes32 r, bytes32 s) public view returns(bool) {
        require(verifySignature(keccak256(contributor, userId, IEOId), v, r, s));
        return true;
    }

    function getIEOId() external view returns(uint) {
        return IEOId;
    }

    function eligibleCheckAndIncrement(uint userId, uint amountInWei) internal returns(uint)
    {
        uint result = eligible(userId, amountInWei);
        participatedWei[userId] = participatedWei[userId].add(result);

        return result;
    }

    function verifySignature(bytes32 hash, uint8 v, bytes32 r, bytes32 s) internal view returns(bool) {
        address signer = ecrecover(hash, v, r, s);
        return operators[signer];
    }
}
