// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract POLPBadge is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;

    // badgeId => wallet => claimed
    mapping(uint256 => mapping(address => bool)) public hasClaimed;

    constructor() ERC721("POLP Badge", "POLP") Ownable(msg.sender) {}

    /**
     * @dev Mint a badge NFT to a user, only if not previously claimed.
     * @param to Address to mint to
     * @param badgeId ID of the badge (semantic category)
     * @param tokenURI URI pointing to metadata (can be IPNS)
     */
    function claimBadge(address to, uint256 badgeId, string memory tokenURI) public onlyOwner {
        require(!hasClaimed[badgeId][to], "Already claimed");

        uint256 tokenId = nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI);

        hasClaimed[badgeId][to] = true;
    }

    /**
     * @dev Check if a wallet has claimed a specific badge.
     */
    function claimed(address user, uint256 badgeId) external view returns (bool) {
        return hasClaimed[badgeId][user];
    }
}
