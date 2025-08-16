import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { _masterWallet, connection, initSdk, setupDotEnv } from "./config";
import {
  ApiV3PoolInfoConcentratedItem,
  CLMM_PROGRAM_ID,
  getPdaPersonalPositionAddress,
  PositionInfoLayout,
  PositionUtils,
  Raydium,
  TickArrayLayout,
  TickUtils,
  U64_IGNORE_RANGE,
} from "@raydium-io/raydium-sdk-v2";
import { swap } from "./swap";
import { airdrop, sleep } from "./utils";
// import { fetchPositionInfo } from "./fetchPositionInfo";
import { TokenA, TokenB } from "./constants";
import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { Decimal } from "decimal.js";

setupDotEnv();

let feePayer: Keypair;
let raydium: Raydium;

const run = async () => {
  const provider = new AnchorProvider(
    connection as any,
    new Wallet(_masterWallet as any),
    {
      commitment: "confirmed",
    }
  );
  anchor.setProvider(provider);

  feePayer = _masterWallet;
  await airdrop(provider.connection, feePayer.publicKey);
  provider.connection.getBalance(feePayer.publicKey).then((balance) => {
    console.log(`After generateFees The lamport balance is ${balance}`);
    console.log();
  });

  raydium = await initSdk({ owner: feePayer, loadToken: true });

  let mintA = TokenA;
  let mintB = TokenB;

  let poolIdC = "6WZxvb9wgVGWf8QqT5mYErvB5wR2Kz17JLn45WCMTm5P";
  let NFT = "7By72PX53y5T4eMaa5EFD2A731rP8oTtFdB57ZqUhLjR";

  if (process.env.ENV === "devnet") {
    poolIdC = "5CsfFEZVw2hjjEM1GEBam61ADdBnNLGTo4t2Gfb5oEzt";
    NFT = "Dt3UzrLQq9bvoiPzi6dB9cFYUvMRpyPMevVzWavvy4Re";
  }

  for (let i = 0; i < 0; i++) {
    await swap(
      raydium,
      poolIdC,
      mintA.toBase58(),
      new anchor.BN(50 * LAMPORTS_PER_SOL)
    ).catch(console.error);

    sleep(1000);
    await swap(
      raydium,
      poolIdC,
      mintB.toBase58(),
      new anchor.BN(40 * LAMPORTS_PER_SOL)
    ).catch(console.error);
  }
  const positionPubKey = getPdaPersonalPositionAddress(
    new PublicKey(CLMM_PROGRAM_ID),
    new PublicKey(NFT)
  ).publicKey;

  const positionAccountInfo =
    await raydium.connection.getAccountInfo(positionPubKey);
  const position = PositionInfoLayout.decode(positionAccountInfo!.data);

  let poolInfo: ApiV3PoolInfoConcentratedItem;
  if (raydium.cluster === "mainnet") {
    poolInfo = (
      await raydium.api.fetchPoolById({ ids: position.poolId.toBase58() })
    )[0] as ApiV3PoolInfoConcentratedItem;
  } else {
    const data = await raydium.clmm.getPoolInfoFromRpc(
      position.poolId.toBase58()
    );
    poolInfo = data.poolInfo;
  }

  const [tickLowerArrayAddress, tickUpperArrayAddress] = [
    TickUtils.getTickArrayAddressByTick(
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
      position.tickLower,
      poolInfo.config.tickSpacing
    ),
    TickUtils.getTickArrayAddressByTick(
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
      position.tickUpper,
      poolInfo.config.tickSpacing
    ),
  ];

  const tickArrayRes = await raydium.connection.getMultipleAccountsInfo([
    tickLowerArrayAddress,
    tickUpperArrayAddress,
  ]);
  if (!tickArrayRes[0] || !tickArrayRes[1]) {
    throw new Error("tick data not found");
  }
  const tickArrayLower = TickArrayLayout.decode(tickArrayRes[0].data);
  const tickArrayUpper = TickArrayLayout.decode(tickArrayRes[1].data);
  const tickLowerState =
    tickArrayLower.ticks[
      TickUtils.getTickOffsetInArray(
        position.tickLower,
        poolInfo.config.tickSpacing
      )
    ];
  const tickUpperState =
    tickArrayUpper.ticks[
      TickUtils.getTickOffsetInArray(
        position.tickUpper,
        poolInfo.config.tickSpacing
      )
    ];
  const rpcPoolData = await raydium.clmm.getRpcClmmPoolInfo({
    poolId: poolIdC,
  });
  const tokenFees = PositionUtils.GetPositionFeesV2(
    rpcPoolData,
    position,
    tickLowerState,
    tickUpperState
  );
  const [tokenFeeAmountA, tokenFeeAmountB] = [
    tokenFees.tokenFeeAmountA.gte(new BN(0)) &&
    tokenFees.tokenFeeAmountA.lt(U64_IGNORE_RANGE)
      ? tokenFees.tokenFeeAmountA
      : new BN(0),
    tokenFees.tokenFeeAmountB.gte(new BN(0)) &&
    tokenFees.tokenFeeAmountB.lt(U64_IGNORE_RANGE)
      ? tokenFees.tokenFeeAmountB
      : new BN(0),
  ];

  const epochInfo = await raydium.connection.getEpochInfo();
  const { amountA, amountB } = PositionUtils.getAmountsFromLiquidity({
    poolInfo,
    ownerPosition: position,
    liquidity: position.liquidity,
    slippage: 0,
    add: false,
    epochInfo,
  });

  const [pooledAmount0, pooledAmount1] = [
    new Decimal(amountA.amount.toString()).div(10 ** poolInfo.mintA.decimals),
    new Decimal(amountB.amount.toString()).div(10 ** poolInfo.mintB.decimals),
  ];

  console.log("pooledAmount0", pooledAmount0.toString());
  console.log("pooledAmount1", pooledAmount1.toString());

  console.log("tokenFeeAmountA", tokenFeeAmountA.toString());
  console.log("tokenFeeAmountB", tokenFeeAmountB.toString());

  console.log("done");
  process.exit();
};

run();
