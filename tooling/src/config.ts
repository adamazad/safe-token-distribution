import { HardhatRuntimeEnvironment } from "hardhat/types";
import { getSingletonFactoryInfo } from "@gnosis.pm/safe-singleton-factory";
import assert from "assert";
import { keccak256 } from "ethers/lib/utils";
import { OmniMediator__factory } from "../typechain";
import EthersAdapter from "@gnosis.pm/safe-ethers-lib";
import SafeServiceClient from "@gnosis.pm/safe-service-client";
import Safe from "@gnosis.pm/safe-core-sdk";

export const SNAPSHOT_FREQUENCY_IN_MINUTES = 60 * 24; // once a day

export const SAFE_TOKEN_ADDRESS = "0x5aFE3855358E112B5647B952709E6165e1c1eEEe";

export const OMNI_MEDIATOR_ADDRESS_MAINNET =
  "0x88ad09518695c6c3712AC10a214bE5109a655671";
export const OMNI_MEDIATOR_ADDRESS_GC =
  "0xf6A78083ca3e2a662D6dd1703c939c8aCE2e268d";

export const VESTING_POOL_ADDRESS =
  "0x96b71e2551915d98d22c448b040a3bc4801ea4ff";
export const VESTING_ID =
  "0x12c1ee9f9b122fa7a0e7a6a733f6e07d30affb7fac1ca061325b11d9ba677382";
export const VESTING_CREATION_BLOCK = 15582160;
export const VESTING_BENEFICIARY = "0x849d52316331967b6ff1198e5e32a0eb168d039d";

export const MERKLE_DISTRO_DEPLOYMENT_SALT =
  "0x0000000000000000000000000000000000000000000000000000000000badfed";

export const SAFE_MAINNET = "0x849d52316331967b6ff1198e5e32a0eb168d039d";
export const SAFE_GC = "0x849d52316331967b6ff1198e5e32a0eb168d039d";

export async function getAddressConfig(hre: HardhatRuntimeEnvironment) {
  const { gc: providerGC } = getProviders(hre);

  const homeOmniMediator = OmniMediator__factory.connect(
    OMNI_MEDIATOR_ADDRESS_GC,
    providerGC,
  );

  const bridgedSafeToken = await homeOmniMediator.bridgedTokenAddress(
    SAFE_TOKEN_ADDRESS,
  );

  const factory = await hre.ethers.getContractFactory("MerkleDistro");
  const deployTx = await factory.getDeployTransaction(
    VESTING_BENEFICIARY,
    hre.ethers.constants.HashZero,
    VESTING_BENEFICIARY,
  );
  assert(deployTx.data);

  return {
    distroMainnet: hre.ethers.utils.getCreate2Address(
      singletonFactoryAddress("1"),
      MERKLE_DISTRO_DEPLOYMENT_SALT,
      keccak256(deployTx.data),
    ),
    distroGC: hre.ethers.utils.getCreate2Address(
      singletonFactoryAddress("100"),
      MERKLE_DISTRO_DEPLOYMENT_SALT,
      keccak256(deployTx.data),
    ),
    safeToken: SAFE_TOKEN_ADDRESS,
    bridgedSafeToken,
    omniMediatorMainnet: OMNI_MEDIATOR_ADDRESS_MAINNET,
    omniMediatorGC: OMNI_MEDIATOR_ADDRESS_GC,
    vestingPool: VESTING_POOL_ADDRESS,
  };
}

function singletonFactoryAddress(network: string) {
  const info = getSingletonFactoryInfo(parseInt(network));

  return info?.address || "0x4e59b44847b379578588920ca78fbf26c0b4956c";
}

export function getProviders(hre: HardhatRuntimeEnvironment) {
  const mainnet = new hre.ethers.providers.JsonRpcProvider(
    `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
  );

  const gc = new hre.ethers.providers.JsonRpcProvider(
    `https://rpc.gnosischain.com `,
  );

  return { mainnet, gc };
}

export async function getSafeSDKs(hre: HardhatRuntimeEnvironment) {
  const [delegate] = await hre.ethers.getSigners();

  const providers = getProviders(hre);

  const ethAdapterMainnet = new EthersAdapter({
    ethers: hre.ethers,
    signerOrProvider: delegate.connect(providers.mainnet),
  });

  const ethAdapterGC = new EthersAdapter({
    ethers: hre.ethers,
    signerOrProvider: delegate.connect(providers.gc),
  });

  // https://safe-transaction-mainnet.safe.global/
  // https://safe-transaction-gnosis-chain.safe.global/

  const serviceClientMainnet = new SafeServiceClient({
    txServiceUrl: "https://safe-transaction-mainnet.safe.global/",
    ethAdapter: ethAdapterMainnet,
  });

  const safeSdkMainnet = await Safe.create({
    ethAdapter: ethAdapterMainnet,
    safeAddress: SAFE_MAINNET,
  });

  const serviceClientGC = new SafeServiceClient({
    txServiceUrl: "https://safe-transaction-gnosis-chain.safe.global/",
    ethAdapter: ethAdapterGC,
  });

  const safeSdkGC = await Safe.create({
    ethAdapter: ethAdapterGC,
    safeAddress: SAFE_MAINNET,
  });

  return {
    safeSdkMainnet,
    serviceClientMainnet,
    safeSdkGC,
    serviceClientGC,
  };
}
