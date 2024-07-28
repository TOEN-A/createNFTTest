import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("MyNFT", function () {
  async function deployFixture() {
    const [owner, addr1] = await ethers.getSigners();
    // ownerとaddr1にtestFTトークンを配布
    const TestFT = await ethers.getContractFactory("TestFT");
    const testFT = await TestFT.deploy("TestFT", "TFT", 100);
    await testFT.connect(owner).mint(addr1.address, 100);

    // MyNFTをデプロイ
    const MyNFT = await ethers.getContractFactory("MyNFT");
    const myNFT = await MyNFT.deploy();
    return { owner, addr1, testFT, myNFT };
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

  it("登録したFTのアドレスの登録と取得ができる", async function () {
    const { owner, addr1, testFT, myNFT } = await loadFixture(deployFixture);
    await myNFT.connect(owner).registerFT(testFT.getAddress());
    const ftAddress = await myNFT.getFTAddress();
    expect(ftAddress).to.equal(await testFT.getAddress());
  });

  it("FTの登録はownerのみができる", async function () {
    const { owner, addr1, testFT, myNFT } = await loadFixture(deployFixture);
    await expect(myNFT.connect(addr1).registerFT(testFT.getAddress())).to.be
      .reverted;
  });

  it("FTを受け取ってNFTをレベルアップできる", async function () {
    const { owner, addr1, testFT, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(addr1, tokenURI);
    await myNFT.connect(owner).registerFT(testFT.getAddress());
    await testFT.connect(addr1).approve(myNFT.getAddress(), 100);
    await myNFT.connect(addr1).levelUpWithFT(0);
    const level = await myNFT.getTokenLevel(0);
    expect(level).to.equal(2); // レベルアップできる
    expect(await testFT.balanceOf(addr1.address)).to.equal(90); // FTが消費される
    expect(await testFT.balanceOf(myNFT.getAddress())).to.equal(10); // FTがコントラクトアドレスに送られる
  });

  it("存在しないNFTのレベルアップはFTを受け取っても出来ない", async function () {
    const { owner, addr1, testFT, myNFT } = await loadFixture(deployFixture);
    await myNFT.connect(owner).registerFT(testFT.getAddress());
    await testFT.connect(owner).approve(myNFT.getAddress(), 100);
    await expect(myNFT.connect(owner).levelUpWithFT(0)).to.be.revertedWith(
      "ERC721Metadata: Level up for nonexistent token"
    );
  });

  // 100レベル以上になるとレベルアップできない
  it("100レベル以上になるとレベルアップできない", async function () {
    const { owner, addr1, testFT, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await myNFT.connect(owner).registerFT(testFT.getAddress());
    await testFT.connect(owner).approve(myNFT.getAddress(), 100);
    await myNFT.connect(owner).setTokenLevel(0, 100);
    await expect(myNFT.connect(owner).levelUpWithFT(0)).to.be.revertedWith(
      "ERC721Metadata: Max level reached"
    );
  });

  it("NFTの持ち主以外はFTを使ってレベルアップできない", async function () {
    const { owner, addr1, testFT, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await myNFT.connect(owner).registerFT(testFT.getAddress());
    await testFT.connect(owner).approve(myNFT.getAddress(), 100);
    await expect(myNFT.connect(addr1).levelUpWithFT(0)).to.be.revertedWith(
      "ERC721Metadata: FT owner is not NFT owner"
    );
  });

  it("FTの登録がない場合はFTを使ってレベルアップできない", async function () {
    const { owner, addr1, testFT, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await testFT.connect(owner).approve(myNFT.getAddress(), 100);
    await expect(myNFT.connect(owner).levelUpWithFT(0)).to.be.revertedWith(
      "ERC721Metadata: FT address is not registered"
    );
  });

  it("前回のレベルアップからレベル*1hour経過していなければエラー", async function () {
    const { owner, addr1, testFT, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await myNFT.connect(owner).registerFT(testFT.getAddress());
    await testFT.connect(owner).approve(myNFT.getAddress(), 100);
    await myNFT.connect(owner).levelUpWithFT(0);
    await ethers.provider.send("evm_increaseTime", [3598]);
    await ethers.provider.send("evm_mine");
    await expect(myNFT.connect(owner).levelUpWithFT(0)).to.be.revertedWith(
      "ERC721Metadata: Not enough time elapsed since last level up"
    );
  });

  it("FTの残高が足りない場合はFTを使ってレベルアップできない", async function () {
    const { owner, addr1, testFT, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await myNFT.connect(owner).registerFT(testFT.getAddress());
    await testFT.connect(owner).approve(myNFT.getAddress(), 100);
    await myNFT.connect(owner).levelUpWithFT(0);
    await ethers.provider.send("evm_increaseTime", [3600]);
    await ethers.provider.send("evm_mine");
    await myNFT.connect(owner).levelUpWithFT(0);
    await ethers.provider.send("evm_increaseTime", [7200]);
    await ethers.provider.send("evm_mine");
    await myNFT.connect(owner).levelUpWithFT(0);
    await ethers.provider.send("evm_increaseTime", [10800]);
    await ethers.provider.send("evm_mine");
    await myNFT.connect(owner).levelUpWithFT(0);
    await ethers.provider.send("evm_increaseTime", [14400]);
    await ethers.provider.send("evm_mine");
    await expect(myNFT.connect(owner).levelUpWithFT(0)).to.be.revertedWith(
      "ERC721Metadata: Insufficient FT balance"
    );
  });

  // 最後にレベルアップした時間を取得できる
  it("最後にレベルアップした時間を取得できる", async function () {
    const { owner, addr1, testFT, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await myNFT.connect(owner).registerFT(testFT.getAddress());
    await testFT.connect(owner).approve(myNFT.getAddress(), 100);
    await myNFT.connect(owner).levelUpWithFT(0);
    const lastLevelUpTime = await myNFT.connect(owner).getLastLevelUpTime(0);
    expect(lastLevelUpTime).to.equal(await time.latest());
  });

  it("レベルの設定ができる", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await myNFT.connect(owner).setTokenLevel(0, 3);
    const level = await myNFT.getTokenLevel(0);
    expect(level).to.equal(3); // レベルの設定ができる
  });

  it("オーナー以外はレベルの設定は出来ない", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";

    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await expect(myNFT.connect(addr1).setTokenLevel(0, 2)).to.be.reverted;
  });

  it("存在しないtokenIdのレベルの取得、レベルアップ、レベルアップの時間の取得、レベルの設定は出来ない", async function () {
    const { owner, addr1, myNFT } = await loadFixture(deployFixture);
    const tokenURI = "https://example.com/token/1";
    await myNFT.connect(owner).mintNFT(owner, tokenURI);
    await expect(myNFT.connect(owner).getTokenLevel(1)).to.be.revertedWith(
      "ERC721Metadata: Level query for nonexistent token"
    );
    await expect(myNFT.connect(owner).getLastLevelUpTime(1)).to.be.revertedWith(
      "ERC721Metadata: Last level up time query for nonexistent token"
    );
    await expect(myNFT.connect(owner).setTokenLevel(1, 2)).to.be.revertedWith(
      "ERC721Metadata: Level set for nonexistent token"
    );
  });
});
