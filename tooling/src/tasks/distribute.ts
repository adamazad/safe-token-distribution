import { readdirSync } from "fs";
import path from "path";
import assert from "assert";
import { BigNumber } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { sum } from "../fns/bag";

import {
  ALLOCATIONS_DIR,
  checkpointExists,
  loadSnapshot,
} from "../persistence";

task(
  "distribute",
  "Calculate funding amounts, and posts two transactions that will eventually update the Distribution setup and enable new claimers",
)
  .addParam("merkleRootMainnet", "", undefined, types.string, true)
  .addParam("merkleRootGnosis", "", undefined, types.string, true)
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const log = (text: string) => console.info(`Task distribute -> ${text}`);

    const { isReady, distroAddressMainnet, distroAddressGnosis } =
      await hre.run("status", { silent: true });

    if (!isReady) {
      log("Setup not ready for Distribution. Skipping...");
      return;
    }

    const { merkleRootMainnet, merkleRootGnosis } =
      taskArgs.merkleRootMainnet && taskArgs.merkleRootGnosis
        ? taskArgs
        : await hre.run("checkpoint");
    if (!checkpointExists(merkleRootMainnet)) {
      throw new Error(
        `Checkpoints for (mainnet) ${merkleRootMainnet} not found`,
      );
    }

    if (!checkpointExists(merkleRootGnosis)) {
      throw new Error(`Checkpoints for (gnosis) ${merkleRootGnosis} not found`);
    }

    let amountToFundMainnet = BigNumber.from(0);
    let amountToFundGnosis = BigNumber.from(0);

    for (const fileName of readdirSync(ALLOCATIONS_DIR)) {
      const filePath = path.join(ALLOCATIONS_DIR, fileName);
      if (fileName.startsWith("mainnet")) {
        const allocation = loadSnapshot(filePath);
        assert(allocation);
        amountToFundMainnet = amountToFundMainnet.add(sum(allocation));
      }

      if (fileName.startsWith("gnosis")) {
        const allocation = loadSnapshot(filePath);
        assert(allocation);
        amountToFundGnosis = amountToFundGnosis.add(sum(allocation));
      }
    }

    const amountToClaim = BigNumber.from(0)
      .add(amountToFundMainnet)
      .add(amountToFundGnosis);

    log(`AmountToClaim      : ${formatUnits(amountToClaim)}`);
    log(`AmountToFundMainnet: ${formatUnits(amountToFundMainnet)}`);
    log(`AmountToFundGnosis : ${formatUnits(amountToFundGnosis)}`);

    await hre.run("propose", {
      distroAddressMainnet,
      distroAddressGnosis,
      merkleRootMainnet,
      merkleRootGnosis,
      amountToClaim,
      amountToFundMainnet,
      amountToFundGnosis,
    });
  });
