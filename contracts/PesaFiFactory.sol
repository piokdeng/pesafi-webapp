// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PesaFiWallet.sol";

/**
 * @title PesaFiFactory
 * @dev Factory contract for deploying PesaFi wallets with CREATE2
 */
contract PesaFiFactory {
    // Events
    event WalletCreated(address indexed owner, address indexed wallet, uint256 salt);
    
    // Mapping from owner to wallet address
    mapping(address => address) public userWallets;
    mapping(address => bool) public isWallet;
    
    // Default daily limit (in USDC with 6 decimals)
    uint256 public constant DEFAULT_DAILY_LIMIT = 1000 * 10**6; // $1000
    
    // USDC address (will be set based on network)
    address public immutable USDC;
    
    /**
     * @dev Constructor to set USDC address based on network
     * @param _usdc USDC token address for the network
     */
    constructor(address _usdc) {
        USDC = _usdc;
    }
    
    /**
     * @dev Deploy a new wallet for a user
     * @param owner The owner of the new wallet
     * @param salt Unique salt for CREATE2
     */
    function deployWallet(address owner, uint256 salt) external returns (address) {
        require(userWallets[owner] == address(0), "Wallet already exists");

        bytes memory bytecode = abi.encodePacked(
            type(PesaFiWallet).creationCode,
            abi.encode(owner, DEFAULT_DAILY_LIMIT, USDC)
        );

        address wallet;
        assembly {
            wallet := create2(0, add(bytecode, 0x20), mload(bytecode), salt)
            if iszero(extcodesize(wallet)) {
                revert(0, 0)
            }
        }

        // USDC is now initialized in the constructor

        userWallets[owner] = wallet;
        isWallet[wallet] = true;

        emit WalletCreated(owner, wallet, salt);
        return wallet;
    }
    
    /**
     * @dev Calculate wallet address before deployment
     * @param owner The owner of the wallet
     * @param salt Unique salt for CREATE2
     */
    function getWalletAddress(address owner, uint256 salt) external view returns (address) {
        bytes memory bytecode = abi.encodePacked(
            type(PesaFiWallet).creationCode,
            abi.encode(owner, DEFAULT_DAILY_LIMIT, USDC)
        );

        bytes32 hash = keccak256(
            abi.encodePacked(
                bytes1(0xff),
                address(this),
                salt,
                keccak256(bytecode)
            )
        );

        return address(uint160(uint256(hash)));
    }
    
    /**
     * @dev Check if an address has a wallet
     */
    function hasWallet(address owner) external view returns (bool) {
        return userWallets[owner] != address(0);
    }
    
    /**
     * @dev Get wallet address for an owner
     */
    function getWallet(address owner) external view returns (address) {
        return userWallets[owner];
    }
}
