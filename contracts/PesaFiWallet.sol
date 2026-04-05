// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title PesaFiWallet
 * @dev Smart wallet contract for PesaFi users with account abstraction
 */
contract PesaFiWallet is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    // Events
    event FundsReceived(address indexed from, uint256 amount, address token);
    event FundsSent(address indexed to, uint256 amount, address token);
    event PaymentMade(address indexed merchant, uint256 amount, string paymentReference);
    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event RecoveryInitiated(address indexed newOwner);
    event RecoveryCompleted(address indexed newOwner);

    // State variables
    mapping(address => bool) public guardians;
    uint256 public guardianCount;
    uint256 public constant RECOVERY_DELAY = 2 days;
    
    struct RecoveryRequest {
        address newOwner;
        uint256 timestamp;
        uint256 confirmations;
        mapping(address => bool) hasConfirmed;
    }
    
    RecoveryRequest public recoveryRequest;
    
    // Daily spending limits
    mapping(address => uint256) public dailySpent;
    mapping(address => uint256) public lastSpentDay;
    uint256 public dailyLimit;

    // Supported tokens (mainly USDC)
    mapping(address => bool) public supportedTokens;

    // USDC address
    address public immutable USDC;

    constructor(address _owner, uint256 _dailyLimit, address _usdc) Ownable(_owner) {
        dailyLimit = _dailyLimit;
        USDC = _usdc;
        supportedTokens[_usdc] = true; // Auto-add USDC as supported token
    }

    /**
     * @dev Receive native currency (ETH on Base)
     */
    receive() external payable {
        emit FundsReceived(msg.sender, msg.value, address(0));
    }

    /**
     * @dev Send USDC or other ERC20 tokens
     */
    function sendToken(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(checkDailyLimit(token, amount), "Daily limit exceeded");
        
        updateDailySpent(token, amount);
        
        IERC20(token).transfer(to, amount);
        emit FundsSent(to, amount, token);
    }

    /**
     * @dev Make payment to merchant with reference
     */
    function payMerchant(
        address token,
        address merchant,
        uint256 amount,
        string memory paymentReference
    ) external onlyOwner nonReentrant {
        require(supportedTokens[token], "Token not supported");
        require(checkDailyLimit(token, amount), "Daily limit exceeded");
        
        updateDailySpent(token, amount);
        
        IERC20(token).transfer(merchant, amount);
        emit PaymentMade(merchant, amount, paymentReference);
    }

    /**
     * @dev Batch transfer to multiple recipients
     */
    function batchTransfer(
        address token,
        address[] memory recipients,
        uint256[] memory amounts
    ) external onlyOwner nonReentrant {
        require(recipients.length == amounts.length, "Arrays length mismatch");
        require(supportedTokens[token], "Token not supported");
        
        uint256 totalAmount = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalAmount += amounts[i];
        }
        
        require(checkDailyLimit(token, totalAmount), "Daily limit exceeded");
        updateDailySpent(token, totalAmount);
        
        for (uint256 i = 0; i < recipients.length; i++) {
            IERC20(token).transfer(recipients[i], amounts[i]);
            emit FundsSent(recipients[i], amounts[i], token);
        }
    }

    /**
     * @dev Check if amount is within daily limit
     */
    function checkDailyLimit(address token, uint256 amount) internal view returns (bool) {
        if (block.timestamp / 1 days > lastSpentDay[token]) {
            return amount <= dailyLimit;
        }
        return dailySpent[token] + amount <= dailyLimit;
    }

    /**
     * @dev Update daily spent amount
     */
    function updateDailySpent(address token, uint256 amount) internal {
        if (block.timestamp / 1 days > lastSpentDay[token]) {
            dailySpent[token] = amount;
            lastSpentDay[token] = block.timestamp / 1 days;
        } else {
            dailySpent[token] += amount;
        }
    }

    /**
     * @dev Add guardian for social recovery
     */
    function addGuardian(address guardian) external onlyOwner {
        require(!guardians[guardian], "Already a guardian");
        guardians[guardian] = true;
        guardianCount++;
        emit GuardianAdded(guardian);
    }

    /**
     * @dev Remove guardian
     */
    function removeGuardian(address guardian) external onlyOwner {
        require(guardians[guardian], "Not a guardian");
        guardians[guardian] = false;
        guardianCount--;
        emit GuardianRemoved(guardian);
    }

    /**
     * @dev Initiate recovery (called by guardian)
     */
    function initiateRecovery(address newOwner) external {
        require(guardians[msg.sender], "Not a guardian");
        require(recoveryRequest.timestamp == 0 || 
                block.timestamp > recoveryRequest.timestamp + 7 days, 
                "Recovery already in progress");
        
        recoveryRequest.newOwner = newOwner;
        recoveryRequest.timestamp = block.timestamp;
        recoveryRequest.confirmations = 1;
        recoveryRequest.hasConfirmed[msg.sender] = true;
        
        emit RecoveryInitiated(newOwner);
    }

    /**
     * @dev Confirm recovery (called by other guardians)
     */
    function confirmRecovery() external {
        require(guardians[msg.sender], "Not a guardian");
        require(recoveryRequest.timestamp > 0, "No recovery in progress");
        require(!recoveryRequest.hasConfirmed[msg.sender], "Already confirmed");
        require(block.timestamp <= recoveryRequest.timestamp + 7 days, "Recovery expired");
        
        recoveryRequest.hasConfirmed[msg.sender] = true;
        recoveryRequest.confirmations++;
        
        // Require majority of guardians to confirm
        if (recoveryRequest.confirmations > guardianCount / 2) {
            _transferOwnership(recoveryRequest.newOwner);
            delete recoveryRequest;
            emit RecoveryCompleted(recoveryRequest.newOwner);
        }
    }

    /**
     * @dev Cancel recovery (only owner)
     */
    function cancelRecovery() external onlyOwner {
        delete recoveryRequest;
    }

    /**
     * @dev Update daily spending limit
     */
    function updateDailyLimit(uint256 newLimit) external onlyOwner {
        dailyLimit = newLimit;
    }

    /**
     * @dev Add supported token
     */
    function addSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = true;
    }

    /**
     * @dev Remove supported token
     */
    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }

    /**
     * @dev Get wallet balance for a token
     */
    function getBalance(address token) external view returns (uint256) {
        if (token == address(0)) {
            return address(this).balance;
        }
        return IERC20(token).balanceOf(address(this));
    }

    /**
     * @dev Emergency withdrawal (only owner)
     */
    function emergencyWithdraw(address token) external onlyOwner {
        if (token == address(0)) {
            payable(owner()).transfer(address(this).balance);
        } else {
            uint256 balance = IERC20(token).balanceOf(address(this));
            IERC20(token).transfer(owner(), balance);
        }
    }
}
