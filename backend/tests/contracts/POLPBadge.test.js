const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("POLPBadge", function() {
  let POLPBadge;
  let polpBadge;
  let owner;
  let user1;
  let user2;

  beforeEach(async function() {
    [owner, user1, user2] = await ethers.getSigners();
    
    POLPBadge = await ethers.getContractFactory("POLPBadge");
    polpBadge = await POLPBadge.deploy();
    await polpBadge.deployed();
  });

  describe("Deployment", function() {
    it("Should set the right owner", async function() {
      expect(await polpBadge.owner()).to.equal(owner.address);
    });

    it("Should initialize with token ID 0", async function() {
      expect(await polpBadge.nextTokenId()).to.equal(0);
    });

    it("Should have the correct name and symbol", async function() {
      expect(await polpBadge.name()).to.equal("POLP Badge");
      expect(await polpBadge.symbol()).to.equal("POLP");
    });
  });

  describe("Badge Claiming", function() {
    const badgeId = 1;
    const tokenURI = "ipfs://QmTest";

    it("Should allow owner to mint a badge", async function() {
      await polpBadge.claimBadge(user1.address, badgeId, tokenURI);
      
      expect(await polpBadge.ownerOf(0)).to.equal(user1.address);
      expect(await polpBadge.tokenURI(0)).to.equal(tokenURI);
      expect(await polpBadge.claimed(user1.address, badgeId)).to.be.true;
    });    it("Should prevent non-owner from minting badges", async function() {
      await expect(
        polpBadge.connect(user1).claimBadge(user2.address, badgeId, tokenURI)
      ).to.be.revertedWithCustomError(polpBadge, "OwnableUnauthorizedAccount")
        .withArgs(user1.address);
    });

    it("Should prevent claiming same badge twice", async function() {
      await polpBadge.claimBadge(user1.address, badgeId, tokenURI);
      
      await expect(
        polpBadge.claimBadge(user1.address, badgeId, tokenURI)
      ).to.be.revertedWith("Already claimed");
    });

    it("Should increment token ID after minting", async function() {
      await polpBadge.claimBadge(user1.address, badgeId, tokenURI);
      expect(await polpBadge.nextTokenId()).to.equal(1);
      
      await polpBadge.claimBadge(user2.address, badgeId + 1, tokenURI);
      expect(await polpBadge.nextTokenId()).to.equal(2);
    });

    it("Should emit Transfer event on mint", async function() {
      await expect(polpBadge.claimBadge(user1.address, badgeId, tokenURI))
        .to.emit(polpBadge, "Transfer")
        .withArgs(ethers.constants.AddressZero, user1.address, 0);
    });
  });

  describe("Badge Queries", function() {
    it("Should correctly report claimed status", async function() {
      expect(await polpBadge.claimed(user1.address, 1)).to.be.false;
      
      await polpBadge.claimBadge(user1.address, 1, "ipfs://test");
      
      expect(await polpBadge.claimed(user1.address, 1)).to.be.true;
      expect(await polpBadge.claimed(user2.address, 1)).to.be.false;
    });

    it("Should handle multiple badge types per user", async function() {
      await polpBadge.claimBadge(user1.address, 1, "ipfs://test1");
      await polpBadge.claimBadge(user1.address, 2, "ipfs://test2");

      expect(await polpBadge.claimed(user1.address, 1)).to.be.true;
      expect(await polpBadge.claimed(user1.address, 2)).to.be.true;
      expect(await polpBadge.claimed(user1.address, 3)).to.be.false;
    });
  });
});
