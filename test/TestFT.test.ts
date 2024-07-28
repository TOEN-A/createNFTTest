import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("TestFT", function () {
  async function deployFixture() {
    const [owner, addr1] = await ethers.getSigners();
    // ownerとaddr1にtestFTトークンを配布
    const TestFT = await ethers.getContractFactory("TestFT");
    const testFT = await TestFT.deploy("TestFT", "TFT", 100000);

    return { owner, addr1, testFT };
  }

  it("token nameとsymbolとオーナーが正しい", async function () {
    const { owner, testFT } = await loadFixture(deployFixture);
    expect(await testFT.name()).to.equal("TestFT");
    expect(await testFT.symbol()).to.equal("TFT");
    expect(await testFT.owner()).to.equal(owner.address);
  });

  it("トークンの総数が正しい", async function () {
    const { owner, addr1, testFT } = await loadFixture(deployFixture);
    expect(await testFT.totalSupply()).to.equal(100000);
  });

  it("トークンの残高が正しい", async function () {
    const { owner, addr1, testFT } = await loadFixture(deployFixture);
    expect(await testFT.balanceOf(owner.address)).to.equal(100000);
  });

  it("トークンをミントできる", async function () {
    const { owner, addr1, testFT } = await loadFixture(deployFixture);
    await testFT.connect(owner).mint(addr1.address, 100);
    expect(await testFT.balanceOf(addr1.address)).to.equal(100);
  });

  it("オーナー以外はトークンをミントできない", async function () {
    const { owner, addr1, testFT } = await loadFixture(deployFixture);
    await expect(testFT.connect(addr1).mint(owner.address, 100)).to.be.reverted;
  });
});
