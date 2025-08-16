import {
  ApiV3PoolInfoConcentratedItem,
  TickUtils,
  PoolUtils,
  ClmmKeys,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";
import { setupDotEnv, txVersion } from "./config";
import Decimal from "decimal.js";
import { sleep } from "./utils";

setupDotEnv();

export const createPosition = async (
  raydium: Raydium,
  poolId: string,
  inputAmount: number,
  retryCount: number = 0
) => {
  let poolInfo: ApiV3PoolInfoConcentratedItem;
  let poolKeys: ClmmKeys | undefined;

  if (raydium.cluster === "mainnet") {
    // note: api doesn't support get devnet pool info, so in devnet else we go rpc method
    // if you wish to get pool info from rpc, also can modify logic to go rpc method directly
    const data = await raydium.api.fetchPoolById({ ids: poolId });
    poolInfo = data[0] as ApiV3PoolInfoConcentratedItem;
    // if (!isValidClmm(poolInfo.programId)) throw new Error('target pool is not CLMM pool')
  } else {
    const data = await raydium.clmm.getPoolInfoFromRpc(poolId);
    poolInfo = data.poolInfo;
    poolKeys = data.poolKeys;
  }

  /** code below will get on chain realtime price to avoid slippage error, uncomment it if necessary */
  // const rpcData = await raydium.clmm.getRpcClmmPoolInfo({ poolId: poolInfo.id })
  // poolInfo.price = rpcData.currentPrice

  const [startPrice, endPrice] = [0.00001, 2000000];

  const { tick: lowerTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal(startPrice),
    baseIn: true,
  });

  const { tick: upperTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal(endPrice),
    baseIn: true,
  });

  const epochInfo = await raydium.fetchEpochInfo();
  const res = await PoolUtils.getLiquidityAmountOutFromAmountIn({
    poolInfo,
    slippage: 0,
    inputA: true,
    tickUpper: Math.max(lowerTick, upperTick),
    tickLower: Math.min(lowerTick, upperTick),
    amount: new BN(
      new Decimal(inputAmount || "0")
        .mul(10 ** poolInfo.mintA.decimals)
        .toFixed(0)
    ),
    add: true,
    amountHasFee: true,
    epochInfo: epochInfo,
  });

  const { tick: currentTick } = TickUtils.getPriceAndTick({
    poolInfo,
    price: new Decimal(poolInfo.price.toPrecision(6)),
    baseIn: true,
  });

  console.log("current price:", poolInfo.price.toPrecision(6));
  console.log("current tick:", currentTick);
  console.log(
    "tickUpper/tickLower:",
    Math.max(lowerTick, upperTick),
    Math.min(lowerTick, upperTick)
  );
  console.log(
    "amountA/amountB ",
    res.amountA.amount.toString(),
    res.amountB.amount.toString()
  );
  try {
    const { execute, extInfo } = await raydium.clmm.openPositionFromBase({
      poolInfo,
      poolKeys,
      tickUpper: Math.max(lowerTick, upperTick),
      tickLower: Math.min(lowerTick, upperTick),
      base: "MintA",
      ownerInfo: {
        useSOLBalance: true,
      },
      baseAmount: new BN(
        new Decimal(inputAmount || "0")
          .mul(10 ** poolInfo.mintA.decimals)
          .toFixed(0)
      ),
      otherAmountMax: res.amountSlippageB.amount,
      // nft2022: true,
      txVersion,
      // optional: set up priority fee here
      computeBudgetConfig: {
        units: 600000,
        microLamports: 100000,
      },
    });

    // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
    const { txId } = await execute({ sendAndConfirm: true });
    console.log("clmm position opened:", {
      txId,
      nft: extInfo.nftMint.toBase58(),
    });
  } catch (error) {
    console.error(
      "failed to open clmm position, retrying...",
      retryCount + 1,
      error
    );
    if (retryCount >= 1) {
      throw new Error("Failed to open clmm position after multiple retries");
    }
    // await sleep(3000);
    // return createPosition(raydium, poolId, inputAmount, retryCount + 1);
  }
};
