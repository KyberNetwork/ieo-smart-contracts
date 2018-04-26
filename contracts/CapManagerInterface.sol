pragma solidity ^0.4.23;


interface CapManagerInterface {
    function getContributorRemainingCap(address contributor) external view returns(uint capWei);
    function IEOId() external view returns(uint);
}
