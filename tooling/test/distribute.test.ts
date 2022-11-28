import hre, { ethers } from "hardhat";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

import { SafeToken__factory } from "../typechain";

import fork from "./helpers/fork";
import safeSetOwner from "./helpers/safeSetOwner";
import safeTokenUnpause from "./helpers/safeTokenUnpause";
import deployMerkleDistro from "./helpers/deployTestDistro";

import { createDistributeTxMainnet } from "../src/fns/createDistributeTx";

import { addresses, VESTING_ID } from "../src/config";

describe("createDistributeTxMainnet", function () {
  beforeEach(async () => {
    await loadFixture(setup);
  });
  it("correctly executes the encoded multisend tx", async () => {
    const { safeSdk, safeToken, merkleDistro } = await loadFixture(setup);

    // PRE-CLAIM checks
    expect(await merkleDistro.merkleRoot()).to.equal(ethers.constants.HashZero);
    expect(await safeToken.balanceOf(merkleDistro.address)).to.equal(0);
    expect(await safeToken.balanceOf(addresses.mainnet.omniMediator)).to.equal(
      0,
    );

    const amountToClaim = BigNumber.from("10000000");
    const amountToBridge = BigNumber.from("500000");
    const nextMerkleRoot =
      "0xaaaabbbbccccddddeeeeffff0000111122223333444455556666777788889999";

    const tx = await createDistributeTxMainnet(
      safeSdk,
      addresses,
      merkleDistro.address,
      // doesnt matter
      "0x5aFE3855358E112B5647B952709E6165e1c1eEEe",
      VESTING_ID,
      amountToClaim,
      amountToBridge,
      nextMerkleRoot,
    );
    await safeSdk.executeTransaction(tx);

    // POST-CLAIM checks
    expect(await merkleDistro.merkleRoot()).to.equal(nextMerkleRoot);
    expect(await safeToken.balanceOf(merkleDistro.address)).to.equal(
      amountToClaim,
    );
    expect(await safeToken.balanceOf(addresses.mainnet.omniMediator)).to.equal(
      amountToBridge,
    );
  });
});

async function setup() {
  await fork(15914301);

  const [deployer] = await ethers.getSigners();

  const safeAddress = addresses.mainnet.treasurySafe;

  const safeSdk = await safeSetOwner(safeAddress, deployer);

  const safeToken = SafeToken__factory.connect(
    addresses.mainnet.token,
    ethers.provider,
  );

  await safeTokenUnpause(safeToken);

  const merkleDistro = await deployMerkleDistro(
    hre,
    {
      token: safeToken.address,
      merkleRoot: ethers.constants.HashZero,
      owner: safeAddress,
    },
    deployer,
  );

  return {
    safeSdk,
    safeToken,
    merkleDistro,
  };
}