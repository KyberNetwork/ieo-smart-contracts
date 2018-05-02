pragma solidity ^0.4.23;


interface KyberIEOInterface {
    function contribute(address contributor, uint userId, uint8 v, bytes32 r, bytes32 s) external payable returns(bool);
    function getContributorRemainingCap(uint userId) external view returns(uint capWei);
    function getIEOId() external view returns(uint);
}

