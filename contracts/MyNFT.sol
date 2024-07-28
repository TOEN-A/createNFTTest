// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    mapping(uint256 => uint256) private _tokenLevels;
    mapping(uint256 => uint256) private _lastLevelUpTime;
    address private _ftAddress;
    IERC20 private _ftToken;
    // レベルの最大値
    uint256 private _MAXLEVEL = 100;

    constructor() ERC721("MyNFT", "NFT") Ownable(_msgSender()) {}

    function mintNFT(
        address recipient,
        string memory tokenURI
    ) public onlyOwner {
        uint256 newItemId = _tokenIds++;
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);
        _tokenLevels[newItemId] = 1; // 初期レベルを1に設定
    }

    // FTのトークンアドレスを登録する
    function registerFT(address ftAddress) public onlyOwner {
        _ftAddress = ftAddress;
    }

    // FTのトークンアドレスを取得する
    function getFTAddress() public view returns (address) {
        return _ftAddress;
    }

    // FTトークンをレベルの10倍だけ受けとってレベルアップする
    function levelUpWithFT(uint256 tokenId) public {
        require(
            tokenId < _tokenIds,
            "ERC721Metadata: Level up for nonexistent token"
        );
        require(
            _tokenLevels[tokenId] < _MAXLEVEL,
            "ERC721Metadata: Max level reached"
        );
        require(
            ownerOf(tokenId) == msg.sender,
            "ERC721Metadata: FT owner is not NFT owner"
        );
        require(
            _ftAddress != address(0),
            "ERC721Metadata: FT address is not registered"
        );
        uint256 ftBalance = IERC20(_ftAddress).balanceOf(msg.sender);
        uint256 levelUpCost = _tokenLevels[tokenId] * 10;
        uint256 requiredTimeElapsed = _tokenLevels[tokenId] * 1 hours - 1 hours;
        require(
            block.timestamp >= _lastLevelUpTime[tokenId] + requiredTimeElapsed,
            "ERC721Metadata: Not enough time elapsed since last level up"
        );

        require(
            ftBalance >= levelUpCost,
            "ERC721Metadata: Insufficient FT balance"
        );
        IERC20(_ftAddress).transferFrom(msg.sender, address(this), levelUpCost);
        _tokenLevels[tokenId] += 1;
        _lastLevelUpTime[tokenId] = block.timestamp;
    }

    function getTokenLevel(uint256 tokenId) public view returns (uint256) {
        require(
            tokenId < _tokenIds,
            "ERC721Metadata: Level query for nonexistent token"
        );
        return _tokenLevels[tokenId];
    }

    // 最後にレベルアップした時間を取得する
    function getLastLevelUpTime(uint256 tokenId) public view returns (uint256) {
        require(
            tokenId < _tokenIds,
            "ERC721Metadata: Last level up time query for nonexistent token"
        );
        return _lastLevelUpTime[tokenId];
    }

    function setTokenLevel(uint256 tokenId, uint256 newLevel) public onlyOwner {
        require(
            tokenId < _tokenIds,
            "ERC721Metadata: Level set for nonexistent token"
        );
        _tokenLevels[tokenId] = newLevel;
    }
}
