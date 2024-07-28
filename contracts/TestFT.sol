// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestFT is ERC20 {
    address public owner;

    constructor(string memory name, string memory symbol, uint initialSupply) ERC20(name, symbol) {
        owner = msg.sender;
        _mint(msg.sender, initialSupply);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner can mint tokens");
        _;
    }

    function mint(address _to, uint _amount) public onlyOwner {
        _mint(_to, _amount);
        emit MintEvent(_to, _amount);
    }

    event MintEvent(address indexed to, uint256 indexed amount);
}