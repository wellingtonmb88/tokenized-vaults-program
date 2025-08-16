import {
  ApiV3PoolInfoConcentratedItem,
  ClmmKeys,
  ComputeClmmPoolInfo,
  PoolUtils,
  ReturnTypeFetchMultiplePoolTickArrays,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";
import { txVersion } from "./config";
import { isValidClmm } from "./utils";

export const swap = async (
  raydium: Raydium,
  poolId: string,
  inputMint: string,
  inputAmount: BN
) => {
  let poolInfo: ApiV3PoolInfoConcentratedItem;
  let poolKeys: ClmmKeys | undefined;
  let clmmPoolInfo: ComputeClmmPoolInfo;
  let tickCache: ReturnTypeFetchMultiplePoolTickArrays;

  if (raydium.cluster === "mainnet") {
    // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId });
    poolInfo = data[0] as ApiV3PoolInfoConcentratedItem;
    if (!isValidClmm(poolInfo.programId))
      throw new Error("target pool is not CLMM pool");

    clmmPoolInfo = await PoolUtils.fetchComputeClmmInfo({
      connection: raydium.connection,
      poolInfo,
    });
    tickCache = await PoolUtils.fetchMultiplePoolTickArrays({
      connection: raydium.connection,
      poolKeys: [clmmPoolInfo],
    });
  } else {
    const data = await raydium.clmm.getPoolInfoFromRpc(poolId);
    poolInfo = data.poolInfo;
    poolKeys = data.poolKeys;
    clmmPoolInfo = data.computePoolInfo;
    tickCache = data.tickData;
  }

  if (
    inputMint !== poolInfo.mintA.address &&
    inputMint !== poolInfo.mintB.address
  )
    throw new Error("input mint does not match pool");

  const baseIn = inputMint === poolInfo.mintA.address;

  console.log("baseIn:", baseIn);

  const { minAmountOut, remainingAccounts } =
    await PoolUtils.computeAmountOutFormat({
      poolInfo: clmmPoolInfo,
      tickArrayCache: tickCache[poolId],
      amountIn: inputAmount,
      tokenOut: poolInfo[baseIn ? "mintB" : "mintA"],
      slippage: 0,
      epochInfo: await raydium.fetchEpochInfo(),
    });

  console.log("minAmountOut:", minAmountOut.amount.toSignificant(6));
  console.log("remainingAccounts:", remainingAccounts);

  const { execute } = await raydium.clmm.swap({
    poolInfo,
    poolKeys,
    inputMint: poolInfo[baseIn ? "mintA" : "mintB"].address,
    amountIn: inputAmount,
    amountOutMin: minAmountOut.amount.raw,
    observationId: clmmPoolInfo.observationId,
    ownerInfo: {
      useSOLBalance: true, // if wish to use existed wsol token account, pass false
    },
    remainingAccounts,
    txVersion,
  });

  // printSimulateInfo()
  const { txId } = await execute();
  console.log("swapped in clmm pool:", {
    txId: `https://explorer.solana.com/tx/${txId}`,
  });
};
