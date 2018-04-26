pragma solidity ^0.4.23;


import "./ERC20Interface.sol";
import "./PermissionGroups.sol";


/**
 * @title Contracts that should be able to recover tokens or ethers can inherit this contract.
 * @author Ilan Doron
 * @dev Allows to recover any tokens or Ethers received in a contract.
 * Should prevent any accidental loss of tokens.
 */
contract Withdrawable is PermissionGroups {

    constructor(address _admin) PermissionGroups (_admin) public {}

    event TokenWithdraw(ERC20 token, uint amount, address sendTo);

    /**
     * @dev Withdraw all ERC20 compatible tokens
     * @param token ERC20 The address of the token contract
     */
    function withdrawToken(ERC20 token, uint amount, address sendTo) external onlyAdmin {
        require(token.transfer(sendTo, amount));
        emit TokenWithdraw(token, amount, sendTo);
    }

    event EtherWithdraw(uint amount, address sendTo);

    /**
     * @dev Withdraw Ethers
     */
    function withdrawEther(uint amount, address sendTo) external onlyAdmin {
        sendTo.transfer(amount);
        emit EtherWithdraw(amount, sendTo);
    }
}
