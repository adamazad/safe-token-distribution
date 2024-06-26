import { BigNumber } from "ethers";
import { useReadContracts, useReadContract } from "wagmi";

import SafeTag from "../SafeTag";
import ConnectionStatus from "./ConnectionStatus";
import classes from "./style.module.css";
import VestingChart from "../VestingChart";

import { safeTokenAddress, vestingId, vestingPoolAddress } from "../../config";

import VestingPoolABI from "../../abis/VestingPool";
import SafeTokenABI from "../../abis/SafeToken";
import { BNtoFloat } from "../../utils";

const VestingInfo: React.FC = () => {
  const staticRes = useReadContracts({
    contracts: [
      {
        chainId: 1,
        address: vestingPoolAddress,
        abi: VestingPoolABI,
        functionName: "vestings",
        args: [vestingId],
      },
      {
        chainId: 1,
        address: safeTokenAddress,
        abi: SafeTokenABI,
        functionName: "totalSupply",
      },
    ],
  });

  const vestingRes = useReadContract({
    chainId: 1,
    address: vestingPoolAddress,
    abi: VestingPoolABI,
    functionName: "calculateVestedAmount",
    args: [
      "0x12c1ee9f9b122fa7a0e7a6a733f6e07d30affb7fac1ca061325b11d9ba677382",
    ],
  });

  // if data from contracts cannot be fetched, chart will show static
  // unvested allocation diagram,
  const totalSAFESupply = staticRes.isSuccess
    ? BigNumber.from(
        staticRes.data![1].result || "1000000000000000000000000000",
      )
    : BigNumber.from("1000000000000000000000000000");
  const gnosisInitial = BigNumber.from("10011026319019003889472853");
  const gnosisDAOTotal = staticRes.isSuccess
    ? BigNumber.from(
        staticRes.data![0].result![5] || "150000000000000000000000000",
      ).add(gnosisInitial)
    : BigNumber.from("150000000000000000000000000");
  const vestedAmount = vestingRes.isSuccess
    ? BigNumber.from(vestingRes.data[0])
    : BigNumber.from(0);

  return (
    <div className={classes.vestingInfo}>
      <p>
        GnosisDAO received 15% of the total <SafeTag /> Token supply, vesting
        over 4 years. The vested tokens are moved to the claim pool monthly.{" "}
        <a
          target="_blank"
          rel="noreferrer"
          href="https://forum.gnosis.io/t/gip-64-should-gnosisdao-distribute-safe-tokens-to-incentivize-decentralizing-gnosis-chain/5896"
        >
          Read more here.
        </a>
      </p>
      {!staticRes.isLoading && !vestingRes.isLoading && (
        <VestingChart
          safeTokenSupply={BNtoFloat(totalSAFESupply, 18)}
          gnosisDaoAllocation={BNtoFloat(gnosisDAOTotal, 18)}
          gnosisDaoVested={BNtoFloat(vestedAmount, 18)}
        />
      )}
      <ConnectionStatus
        isError={vestingRes.isError}
        className={classes.statusContainer}
      />
    </div>
  );
};

export default VestingInfo;
