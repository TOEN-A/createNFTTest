// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    uint256 private _tokenIds;
    mapping(uint256 => uint256) private _tokenLevels;
    error NonexistentToken();

    constructor() ERC721("MyNFT", "NFT") Ownable(_msgSender()) {}

    function mintNFT(
        address recipient,
        string memory tokenURI
    ) public onlyOwner returns (uint256) {
        uint256 newItemId = _tokenIds++;
        _mint(recipient, newItemId);
        _setTokenURI(newItemId, tokenURI);
        _tokenLevels[newItemId] = 1; // 初期レベルを1に設定
        return newItemId;
    }

    function getTokenLevel(uint256 tokenId) public view returns (uint256) {
        require(
            tokenId < _tokenIds,
            "ERC721Metadata: Level query for nonexistent token"
        );
        return _tokenLevels[tokenId];
    }

    function levelUp(uint256 tokenId) public onlyOwner {
        require(
            tokenId < _tokenIds,
            "ERC721Metadata: Level up for nonexistent token"
        );
        _tokenLevels[tokenId] += 1;
    }

    function setTokenLevel(uint256 tokenId, uint256 newLevel) public onlyOwner {
        require(
            tokenId < _tokenIds,
            "ERC721Metadata: Level set for nonexistent token"
        );
        _tokenLevels[tokenId] = newLevel;
    }
}
