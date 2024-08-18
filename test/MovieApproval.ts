import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

describe("MovieApproval", function () {
  async function deployFixture() {
    const [owner, addr1, addr2] = await ethers.getSigners();
    const MyNFT = await ethers.getContractFactory("MyNFT");
    const myNFT = await MyNFT.deploy();

    const TestFT = await ethers.getContractFactory("TestFT");
    const testFT = await TestFT.deploy("TestFT", "TFT", 1000);
    await testFT.connect(owner).mint(addr1.address, 1000);
    await testFT.connect(owner).mint(addr2.address, 1000);

    const MovieApproval = await ethers.getContractFactory("MovieApproval");
    const movieApproval = await MovieApproval.deploy(myNFT);
    return { owner, addr1, addr2, myNFT, testFT, movieApproval };
  }

  it("should set the right owner", async function () {
    const { owner, movieApproval } = await loadFixture(deployFixture);
    expect(await movieApproval.owner()).to.equal(owner.address);
  });

  it("should register an NFT", async function () {
    const { owner, myNFT, movieApproval } = await loadFixture(deployFixture);
    await movieApproval.registerNFT(myNFT);
    expect(await movieApproval.getRegisteredNFT()).to.equal(myNFT);
  });

  it("should register FT", async function () {
    const { owner, myNFT, testFT, movieApproval } = await loadFixture(deployFixture);
    await movieApproval.registerFT(testFT.getAddress());
    expect(await movieApproval.getFTAddress()).to.equal(testFT.getAddress());
  });

  it("should register a movie", async function () {
    const { owner, addr1, myNFT, movieApproval } = await loadFixture(
      deployFixture
    );
    const tokenURI = "https://example.com/token/1";
    await myNFT.mintNFT(addr1.address, tokenURI);
    await movieApproval.connect(addr1).registerMovie(0, "Movie 1");
    expect(await movieApproval.getRegisterMovieCount(0)).to.equal(1);
    expect(await movieApproval.getGuid(0, 0)).to.equal("Movie 1");
    expect(await movieApproval.getGuidCount("Movie 1")).to.equal(1);
  });

  it("should not register a movie if not the owner", async function () {
    const { owner, addr1, addr2, myNFT, movieApproval } = await loadFixture(
      deployFixture
    );
    const tokenURI = "https://example.com/token/1";
    await myNFT.mintNFT(addr1.address, tokenURI);
    await expect(
      movieApproval.connect(addr2).registerMovie(0)
    ).to.be.revertedWith("MovieApproval: NFT owner is not sender");
  });

  it("should reset register count", async function () {
    const { owner, addr1, myNFT, movieApproval } = await loadFixture(
      deployFixture
    );
    const tokenURI = "https://example.com/token/1";
    await myNFT.mintNFT(addr1.address, tokenURI);
    await movieApproval.connect(addr1).registerMovie(0);
    await movieApproval.resetRegisterCount();
    expect(await movieApproval.getRegisterMovieCount(0)).to.equal(0);
  });

  it("should not reset register count and guids if not the owner", async function () {
    const { owner, addr1, addr2, myNFT, movieApproval } = await loadFixture(
      deployFixture
    );
    const tokenURI = "https://example.com/token/1";
    await myNFT.mintNFT(addr1.address, tokenURI);
    await movieApproval.connect(addr1).registerMovie(0);
    await expect(
      movieApproval.connect(addr2).resetRegisterCount()
    ).to.be.revertedWith("Only the owner can call this function");
  });

  it("should not register more than max count", async function () {
    const { owner, addr1, myNFT, movieApproval } = await loadFixture(
      deployFixture
    );
    const tokenURI = "https://example.com/token/1";
    await myNFT.mintNFT(addr1.address, tokenURI);
    for (let i = 0; i < 10; i++) {
      await movieApproval.connect(addr1).registerMovie(0);
    }
    await expect(
      movieApproval.connect(addr1).registerMovie(0)
    ).to.be.revertedWith("MovieApproval: Max register count reached");
  });
});
