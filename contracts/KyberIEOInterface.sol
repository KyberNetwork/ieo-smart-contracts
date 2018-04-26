pragma solidity ^0.4.23;


interface KyberIEOInterface {
    function contribute(address contributor, uint8 v, bytes32 r, bytes32 s) external payable returns(bool);
}

