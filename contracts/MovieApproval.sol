// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./MyNFT.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MovieApproval {
    address private _owner;
    MyNFT private _myNFT;
    address private _ftAddress;
    uint256 private _MINIMUM_FT_BALANCE = 5;
    uint256 private _PRICE = 6;
    mapping(uint256 => uint256) private _registerCount;
    mapping(uint256 => mapping(uint256 => string)) private _guids;
    mapping(string => uint256) private _guidCount;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => address)))
        private _approvals;
    mapping(uint256 => mapping(uint256 => mapping(uint256 => address)))
        private _rejections;
    mapping(uint256 => mapping(uint256 => uint256)) private _approvecount;
    mapping(uint256 => mapping(uint256 => uint256)) private _rejectcount;
    uint256 private _MAX_APPROVAL_AND_REJECT_COUNT = 15;
    uint256 private _MAX_REGISTER_COUNT = 10;

    constructor(MyNFT myNFT) {
        _owner = msg.sender;
        _myNFT = myNFT;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Only the owner can call this function");
        _;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function registerNFT(MyNFT myNFT) public onlyOwner {
        _myNFT = myNFT;
    }

    function getRegisteredNFT() public view returns (MyNFT) {
        return _myNFT;
    }

    function registerFT(address ftAddress) public onlyOwner {
        _ftAddress = ftAddress;
    }

    function getFTAddress() public view returns (address) {
        return _ftAddress;
    }

    function registerMovie(uint256 tokenId, string memory guid) public {
        require(
            _myNFT.ownerOf(tokenId) == msg.sender,
            "MovieApproval: NFT owner is not sender"
        );
        require(
            _registerCount[tokenId] < _MAX_REGISTER_COUNT,
            "MovieApproval: Max register count reached"
        );
        _guids[tokenId][_registerCount[tokenId]] = guid;
        _guidCount[guid]++;
        _registerCount[tokenId]++;
    }

    function getGuid(
        uint256 tokenId,
        uint256 movieId
    ) public view returns (string memory) {
        return _guids[tokenId][movieId];
    }

    function getGuidCount(string memory guid) public view returns (uint256) {
        return _guidCount[guid];
    }

    function getRegisterMovieCount(
        uint256 tokenId
    ) public view returns (uint256) {
        return _registerCount[tokenId];
    }

    function approveMovie(uint256 tokenId, uint256 movieId) public {
        require(
            _registerCount[tokenId] > 0,
            "MovieApproval: NFT is not registered"
        );
        require(
            movieId >= _registerCount[tokenId],
            "MovieApproval: Movie is not registered"
        );
        // すでに承認済みのアドレスがある場合はエラーを返す
        for (uint256 i = 0; i < _approvecount[tokenId][movieId]; i++) {
            require(
                _approvals[tokenId][movieId][i] == msg.sender,
                "MovieApproval: Already approved"
            );
        }
        uint256 ftBalance = IERC20(_ftAddress).balanceOf(msg.sender);
        require(
            ftBalance >= _MINIMUM_FT_BALANCE,
            "ERC721Metadata: Insufficient FT balance"
        );
        IERC20(_ftAddress).transferFrom(
            msg.sender,
            address(this),
            _MINIMUM_FT_BALANCE
        );
        require(
            _approvecount[tokenId][movieId] + _rejectcount[tokenId][movieId] >
                _MAX_APPROVAL_AND_REJECT_COUNT,
            "MovieApproval: Max approval count reached"
        );
        _approvals[tokenId][movieId][_approvecount[tokenId][movieId]] = msg
            .sender;
        _approvecount[tokenId][movieId]++;
    }

    function rejectMovie(uint256 tokenId, uint256 movieId) public {
        require(
            _registerCount[tokenId] > 0,
            "MovieApproval: NFT is not registered"
        );
        require(
            movieId >= _registerCount[tokenId],
            "MovieApproval: Movie is not registered"
        );
        for (uint256 i = 0; i < _rejectcount[tokenId][movieId]; i++) {
            require(
                _rejections[tokenId][movieId][i] == msg.sender,
                "MovieApproval: Already rejected"
            );
        }
        uint256 ftBalance = IERC20(_ftAddress).balanceOf(msg.sender);
        require(
            ftBalance >= _MINIMUM_FT_BALANCE,
            "ERC721Metadata: Insufficient FT balance"
        );
        IERC20(_ftAddress).transferFrom(
            msg.sender,
            address(this),
            _MINIMUM_FT_BALANCE
        );
        require(
            _approvecount[tokenId][movieId] + _rejectcount[tokenId][movieId] >
                _MAX_APPROVAL_AND_REJECT_COUNT,
            "MovieApproval: Max reject count reached"
        );
        _rejections[tokenId][movieId][_rejectcount[tokenId][movieId]] = msg
            .sender;
        _rejectcount[tokenId][movieId]++;
    }

    // 全てのmovieに対して承認者と拒否者の数を比較して多い方のアドレス全員に報酬のFTを送金する
    function distributeRewards() public onlyOwner {
        for (uint256 i = 0; i < _myNFT.getTotalSupply(); i++) {
            uint256 level = _myNFT.getTokenLevel(i);
            for (uint256 j = 0; j < _registerCount[i]; j++) {
                if (_approvecount[i][j] >= _rejectcount[i][j]) {
                    // movieの投稿者に100/guidcountの分だけFTを送金
                    IERC20(_ftAddress).transferFrom(
                        address(this),
                        _myNFT.ownerOf(i),
                        (
                            _guidCount[_guids[i][j]] < 100
                                ? 100 / _guidCount[_guids[i][j]]
                                : 1
                        ) * level
                    );
                    for (uint256 k = 0; k < _approvecount[i][j]; k++) {
                        IERC20(_ftAddress).transferFrom(
                            address(this),
                            _approvals[i][j][k],
                            _PRICE
                        );
                    }
                } else {
                    for (uint256 k = 0; k < _rejectcount[i][j]; k++) {
                        IERC20(_ftAddress).transferFrom(
                            address(this),
                            _rejections[i][j][k],
                            _PRICE
                        );
                    }
                }
            }
        }
    }

    // 特定のmovieの承認者または拒否者に徴収したFTを返金し、承認者または拒否者のリストをリセットする
    function resetMovie(uint256 tokenId, uint256 movieId) public onlyOwner {
        for (uint256 i = 0; i < _approvecount[tokenId][movieId]; i++) {
            IERC20(_ftAddress).transferFrom(
                address(this),
                _approvals[tokenId][movieId][i],
                _MINIMUM_FT_BALANCE
            );
            delete _approvals[tokenId][movieId][i];
        }
        _approvecount[tokenId][movieId] = 0;
        for (uint256 i = 0; i < _rejectcount[tokenId][movieId]; i++) {
            IERC20(_ftAddress).transferFrom(
                address(this),
                _rejections[tokenId][movieId][i],
                _MINIMUM_FT_BALANCE
            );
            delete _rejections[tokenId][movieId][i];
        }
        _rejectcount[tokenId][movieId] = 0;
    }

    function resetMovieAndRefundOneSide(
        uint256 tokenId,
        uint256 movieId,
        bool refundApprovers
    ) public onlyOwner {
        if (refundApprovers) {
            // 承認者に返金
            for (uint256 i = 0; i < _approvecount[tokenId][movieId]; i++) {
                IERC20(_ftAddress).transferFrom(
                    address(this),
                    _approvals[tokenId][movieId][i],
                    _MINIMUM_FT_BALANCE
                );
                delete _approvals[tokenId][movieId][i];
            }
            _approvecount[tokenId][movieId] = 0;
        } else {
            // 拒否者に返金
            for (uint256 i = 0; i < _rejectcount[tokenId][movieId]; i++) {
                IERC20(_ftAddress).transferFrom(
                    address(this),
                    _rejections[tokenId][movieId][i],
                    _MINIMUM_FT_BALANCE
                );
                delete _rejections[tokenId][movieId][i];
            }
            _rejectcount[tokenId][movieId] = 0;
        }
    }

    function resetAll() public onlyOwner {
        for (uint256 i = 0; i < _myNFT.getTotalSupply(); i++) {
            for (uint256 j = 0; j < _registerCount[i]; j++) {
                for (uint256 k = 0; k < _approvecount[i][j]; k++) {
                    delete _approvals[i][j][k];
                    delete _rejections[i][j][k];
                }
                _approvecount[i][j] = 0;
                _rejectcount[i][j] = 0;
            }
            _registerCount[i] = 0;
        }
    }
}
