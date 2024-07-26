import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("MyNFT", function () {
  async function deployFixture() {
    const [owner, addr1] = await ethers.getSigners();
    const MyNFT = await ethers.getContractFactory("MyNFT");
    const myNFT = await MyNFT.deploy();
    return { owner, addr1, myNFT };
  }

  it("token nameとsymbolとオーナーが正しい", async function () {
    const { owner, myNFT } = await loadFixture(deployFixture);
    expect(await myNFT.name()).to.equal("MyNFT");
    expect(await myNFT.symbol()).to.equal("NFT");
    expect(await myNFT.owner()).to.equal(owner.address);
  });

  it("ミントできる", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);
    await myNFT.connect(owner).mintNFT(owner, "https://example.com");
    expect(await myNFT.balanceOf(owner)).to.equal(1);
  });

  it("オーナー以外はミントできない", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);
    await expect(myNFT.connect(addr1).mintNFT(owner, "https://example.com")).to
      .be.reverted;
  });

  it("ミントされるたびにtokenIdが増える", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);

    const tokenURI1 = "https://example.com/token/1";
    const tokenURI2 = "https://example.com/token/2";

    await myNFT.connect(owner).mintNFT(addr1.address, tokenURI1);
    expect(await myNFT.tokenURI(0)).to.equal(tokenURI1);
    await myNFT.connect(owner).mintNFT(addr1.address, tokenURI2);
    expect(await myNFT.tokenURI(1)).to.equal(tokenURI2);
  });

  it("NFTの初期レベルは1", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    const level = await myNFT.getTokenLevel(0);
    expect(level).to.equal(1); // 初期レベルは1
  });

  it("レベルアップできる", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await myNFT.connect(owner).levelUp(0);
    const level = await myNFT.getTokenLevel(0);
    expect(level).to.equal(2); // レベルアップできる
  });

  it("レベルの設定ができる", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await myNFT.connect(owner).setTokenLevel(0, 3);
    const level = await myNFT.getTokenLevel(0);
    expect(level).to.equal(3); // レベルの設定ができる
  });

  it("オーナー以外はレベルアップ及びレベルの設定は出来ない", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await expect(myNFT.connect(addr1).levelUp(0)).to.be.reverted;
    await expect(myNFT.connect(addr1).setTokenLevel(0, 2)).to.be.reverted;
  });

  it("存在しないtokenIdのレベルの取得、レベルアップ、レベルの設定は出来ない", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";
    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await expect(myNFT.connect(owner).getTokenLevel(1)).to.be.revertedWith("ERC721Metadata: Level query for nonexistent token");
    await expect(myNFT.connect(owner).levelUp(1)).to.be.revertedWith("ERC721Metadata: Level up for nonexistent token");
    await expect(myNFT.connect(owner).setTokenLevel(1, 2)).to.be.revertedWith("ERC721Metadata: Level set for nonexistent token");
  });
});
