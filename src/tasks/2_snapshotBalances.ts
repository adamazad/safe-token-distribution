import assert from "assert";
import { task, types } from "hardhat/config";
import moment from "moment";
import {
  loadBalancesGC,
  loadBalancesMainnet,
  loadBlocks,
  writeBalancesGC,
  writeBalancesMainnet,
} from "../persistence";
import {
  queryBalancesGC,
  queryBalancesMainnet,
} from "../queries/queryBalances";

task(
  "snapshot:balances",
  "For every blockHeight in schedule fetches a balance snapshot (mainnet and gc)",
)
  .addOptionalParam(
    "lazy",
    "Don't recalculate if result is found in disk",
    true,
    types.boolean,
  )
  .setAction(async (taskArgs) => {
    const blocks = loadBlocks();
    const entries = Object.keys(blocks);

    sanityCheck(entries);

    for (const iso of entries) {
      const blockNumber = blocks[iso].mainnet.blockNumber;
      let balancesMainnet = loadBalancesMainnet(blockNumber);
      if (taskArgs.lazy === false || balancesMainnet === null) {
        balancesMainnet = await queryBalancesMainnet(blockNumber);
      }

      /*
       * note: we load the balances using the GC blockNumber
       * but we persist it under the mainnet file path
       * both are to be loaded at the same, and the reference is the mainnet block
       */
      const blockNumberGC = blocks[iso].gc.blockNumber;
      // load using mainnet block
      let balancesGC = loadBalancesGC(blockNumber);
      if (taskArgs.lazy === false || balancesGC === null) {
        // query using gc
        balancesGC = await queryBalancesGC(blockNumberGC);
      }

      writeBalancesMainnet(blockNumber, balancesMainnet);
      // load using mainnet block
      writeBalancesGC(blockNumber, balancesGC);
    }
  });

function sanityCheck(schedule: string[]) {
  assert(
    schedule
      .map((entry) => moment(entry))
      .every(
        (entry, index, entries) =>
          index === 0 || entries[index - 1].isBefore(entry),
      ),
  );
}