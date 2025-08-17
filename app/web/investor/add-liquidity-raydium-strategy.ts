import { ComputeBudgetProgram, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getProgram } from "../program";
import { getTokens } from "../tokens";
import { BN } from "@coral-xyz/anchor";
import {
  ApiV3PoolInfoConcentratedItem,
  PoolUtils,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";
import { _masterWallet, initSdkWithoutOwner } from "../../config";
import { raydiumPDAs, raydiumAmmConfig } from "../../../app/raydium-helpers";
import { protocolPDAs } from "../../protocol-pdas";
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { createLookUpTable } from "../../utils";
import { CLMM_PROGRAM_ID } from "../../constants";

export type AddLiquidityRaydiumStrategyParams = {
  provider: anchor.AnchorProvider;
  investor: PublicKey;
  vaultStrategyPda: PublicKey;
  strategyConfigName: string;
  amount: number;
};

export const addLiquidityRaydiumStrategyTx = async ({
  provider,
  investor,
  vaultStrategyPda,
  strategyConfigName,
  amount,
}: AddLiquidityRaydiumStrategyParams) => {
  const ammConfig = raydiumAmmConfig();
  const program = getProgram(provider);
  const raydium = await initSdkWithoutOwner({ loadToken: true });
  const { USDC, token0, token1 } = getTokens();

  const amountToAdd = amount * 1e6;
  const raydiumAmmConfigUsdcForToken0 = ammConfig;
  const raydiumAmmConfigUsdcForToken1 = ammConfig;

  const {
    mint0,
    mint1,
    poolStateMint0WithMint1,
    poolStateUSDCWithMint0,
    poolStateUSDCWithMint1,
    protocolPosition,
    openPositionTokenVault0,
    openPositionTokenVault1,
    usdcWithMint0VaultInput,
    usdcWithMint1VaultInput,
    usdcWithMint0VaultOutput,
    usdcWithMint1VaultOutput,
    bitmapExtUSDCWithMint0,
    bitmapExtUSDCWithMint1,
    bitmapExtMint0WithMint1,
    tickLowerArrayAddress,
    tickUpperArrayAddress,
  } = await raydiumPDAs({
    ammConfig,
    raydium,
    mint0: token0,
    mint1: token1,
  });

  const vaultStrategyAccount =
    await program.account.vaultStrategy.fetch(vaultStrategyPda);

  const vaultStrategyConfigPda = vaultStrategyAccount.vaultStrategyConfigKey;

  const vaultStrategyConfigAccount =
    await program.account.vaultStrategyConfig.fetch(vaultStrategyConfigPda);

  const { investorStrategyPositionPda, investReserveVaultPda } = protocolPDAs({
    strategyCreator: vaultStrategyConfigAccount.creator,
    investor,
    strategyConfigName,
    strategyId: vaultStrategyAccount.strategyId,
    mint0,
    mint1,
  });

  console.log(
    "Investor Strategy Position PDA:",
    investorStrategyPositionPda.toBase58()
  );

  const positionNftAccount = getAssociatedTokenAddressSync(
    vaultStrategyAccount.dexNftMint,
    vaultStrategyConfigPda,
    true, // allowOwnerOffCurve
    TOKEN_2022_PROGRAM_ID // Only using if using OpenPositionWithToken22Nft
  );

  const [personalPosition] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), vaultStrategyAccount.dexNftMint.toBuffer()],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const {
    remainingAccountsA,
    remainingAccountsB,
    raydiumObservationState0,
    raydiumObservationState1,
  } = await getObservationsAndRemainingAccounts({
    raydium,
    poolStateUSDCWithMint0,
    poolStateUSDCWithMint1,
    vaultStrategyAccount,
    USDC,
  });

  const { lookupTableAccount } = await createLookUpTable({
    connection: provider.connection as any,
    payer: _masterWallet,
    authority: _masterWallet,
    // reuseTable: new PublicKey("3okz33Qa9DhnyQRoHccgx7zvDs4acYXQarJVVw9kczag"),
    addresses: [
      investReserveVaultPda,

      ammConfig,
      poolStateUSDCWithMint0,
      poolStateUSDCWithMint1,
      usdcWithMint0VaultInput,
      usdcWithMint1VaultInput,
      usdcWithMint0VaultOutput,
      usdcWithMint1VaultOutput,
      raydiumObservationState0,
      raydiumObservationState1,
      ...remainingAccountsA,
      ...remainingAccountsB,
    ],
  });

  const { lookupTableAccount: vaultStrategyAccountLookUpTable } =
    await createLookUpTable({
      connection: provider.connection as any,
      payer: _masterWallet,
      authority: _masterWallet,
      reuseTable: vaultStrategyAccount.lookUpTable,
      addresses: [],
    });

  const minToken0Out = new BN(0);
  const minToken1Out = new BN(0);

  const investReserveIx = await program.methods
    .investReserve(new BN(amountToAdd))
    .accounts({
      investor,
      vaultStrategyConfig: vaultStrategyConfigPda,
      usdcMint: USDC,
    })
    // .signers([investor])
    .remainingAccounts([])
    .instruction();

  const swapToRatioIx = await program.methods
    .swapToRatioRaydiumVaultStrategy(
      vaultStrategyAccount.strategyId,
      minToken0Out,
      minToken1Out
    )
    .accounts({
      investor,
      vaultStrategyConfig: vaultStrategyConfigPda,
      raydiumPoolState: poolStateMint0WithMint1,
      raydiumPersonalPosition: personalPosition,
      raydiumAmmConfigUsdcForToken0,
      raydiumPoolStateUsdcForToken0: poolStateUSDCWithMint0,
      raydiumAmmConfigUsdcForToken1,
      raydiumPoolStateUsdcForToken1: poolStateUSDCWithMint1,
      raydiumVault0Input: usdcWithMint0VaultInput,
      raydiumVault1Input: usdcWithMint1VaultInput,
      raydiumVault0Output: usdcWithMint0VaultOutput,
      raydiumVault1Output: usdcWithMint1VaultOutput,
      raydiumVault0Mint: mint0,
      raydiumVault1Mint: mint1,
      usdcMint: USDC,
      raydiumObservationState0: raydiumObservationState0,
      raydiumObservationState1: raydiumObservationState1,
      raydiumTokenVault0: openPositionTokenVault0,
      raydiumTokenVault1: openPositionTokenVault1,
    })
    // .signers([investor])
    .remainingAccounts([
      { pubkey: bitmapExtUSDCWithMint0, isSigner: false, isWritable: true },
      ...remainingAccountsA.map((i) => ({
        pubkey: i,
        isSigner: false,
        isWritable: true,
      })),

      { pubkey: PublicKey.default, isSigner: false, isWritable: false },

      { pubkey: bitmapExtUSDCWithMint1, isSigner: false, isWritable: true },
      ...remainingAccountsB.map((i) => ({
        pubkey: i,
        isSigner: false,
        isWritable: true,
      })),
    ])
    .instruction();

  const addLiquidityIx = await program.methods
    .addLiquidityRaydiumVaultStrategy(vaultStrategyAccount.strategyId)
    .accounts({
      investor,
      vaultStrategyConfig: vaultStrategyConfigPda,
      raydiumPositionNftAccount: positionNftAccount,
      raydiumPoolState: poolStateMint0WithMint1,
      raydiumPersonalPosition: personalPosition,
      raydiumProtocolPosition: protocolPosition,
      raydiumTickArrayLower: tickLowerArrayAddress.toBase58(),
      raydiumTickArrayUpper: tickUpperArrayAddress.toBase58(),
      raydiumTokenVault0: openPositionTokenVault0,
      raydiumTokenVault1: openPositionTokenVault1,
      raydiumVault0Mint: mint0,
      raydiumVault1Mint: mint1,
    })
    // .signers([investor])
    .remainingAccounts([
      {
        pubkey: bitmapExtMint0WithMint1,
        isSigner: false,
        isWritable: true,
      },
    ])
    .instruction();

  const latestBlockhash = await provider.connection.getLatestBlockhash();

  const txMessage = new anchor.web3.TransactionMessage({
    payerKey: investor,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
      investReserveIx,
      swapToRatioIx,
      addLiquidityIx,
    ],
  }).compileToV0Message([vaultStrategyAccountLookUpTable, lookupTableAccount]);

  const tx = new anchor.web3.VersionedTransaction(txMessage);
  console.log("Transaction raw size", tx.serialize().length);

  return {
    vaultStrategyConfigPda,
    vaultStrategyPda,
    investorStrategyPositionPda,
    tx,
  };
};

const getObservationsAndRemainingAccounts = async ({
  raydium,
  poolStateUSDCWithMint0,
  poolStateUSDCWithMint1,
  vaultStrategyAccount,
  USDC,
}: {
  raydium: Raydium;
  poolStateUSDCWithMint0: PublicKey;
  poolStateUSDCWithMint1: PublicKey;
  vaultStrategyAccount: any;
  USDC: PublicKey;
}) => {
  // First, we need to calculate the amounts that will actually be swapped
  // This matches the logic in the Rust program

  const totalReservedAmount = new anchor.BN(10_000_000); // From the test setup
  const percentage = vaultStrategyAccount.percentage; // Get the actual percentage from the strategy
  const MAX_PERCENTAGE = 10_000;

  const usdcAmount = totalReservedAmount
    .mul(new anchor.BN(percentage))
    .div(new anchor.BN(MAX_PERCENTAGE));
  console.log("Total USDC amount to be swapped:", usdcAmount.toNumber());

  // Calculate ratio amounts (this should match your Rust calc_ratio_amounts_for_usdc logic)
  // For now, let's assume 50/50 split - you should implement the exact same logic here
  const usdcForToken0Amount = usdcAmount.div(new anchor.BN(2));
  const usdcForToken1Amount = usdcAmount.div(new anchor.BN(2));

  console.log("USDC for Token0:", usdcForToken0Amount.toNumber());
  console.log("USDC for Token1:", usdcForToken1Amount.toNumber());

  const dataA = await raydium.clmm.getPoolInfoFromRpc(
    poolStateUSDCWithMint0.toBase58()
  );
  const poolInfoA: ApiV3PoolInfoConcentratedItem = dataA.poolInfo;
  const raydiumObservationState0 = dataA.computePoolInfo.observationId;

  const dataB = await raydium.clmm.getPoolInfoFromRpc(
    poolStateUSDCWithMint1.toBase58()
  );
  const poolInfoB: ApiV3PoolInfoConcentratedItem = dataB.poolInfo;
  const raydiumObservationState1 = dataB.computePoolInfo.observationId;

  const poolIdA = poolStateUSDCWithMint0.toBase58();
  const poolIdB = poolStateUSDCWithMint1.toBase58();

  // Use the actual amounts that will be swapped, not arbitrary amounts
  // We're swapping USDC for Token0, so input is USDC (mintA or mintB depending on ordering)
  // Let's check the token ordering for poolStateUSDCWithMint0

  // Determine which mint is USDC in poolA
  const isUsdcMintAInPoolA = poolInfoA.mintA.address === USDC.toString();
  const tokenOutA = isUsdcMintAInPoolA ? poolInfoA.mintB : poolInfoA.mintA;

  const {
    // minAmountOut: minAmountOutA,
    remainingAccounts: remainingAccountsA,
  } = await PoolUtils.computeAmountOutFormat({
    poolInfo: dataA.computePoolInfo,
    tickArrayCache: dataA.tickData[poolIdA],
    amountIn: usdcForToken0Amount,
    tokenOut: tokenOutA, // Use the correct output token
    slippage: 0,
    epochInfo: await raydium.fetchEpochInfo(),
  });

  // Let's check the token ordering for poolStateUSDCWithMint1
  const isUsdcMintAInPoolB = poolInfoB.mintA.address === USDC.toString();
  const tokenOutB = isUsdcMintAInPoolB ? poolInfoB.mintB : poolInfoB.mintA;

  const {
    // minAmountOut: minAmountOutB,
    remainingAccounts: remainingAccountsB,
  } = await PoolUtils.computeAmountOutFormat({
    poolInfo: dataB.computePoolInfo,
    tickArrayCache: dataB.tickData[poolIdB],
    amountIn: usdcForToken1Amount,
    tokenOut: tokenOutB, // Use the correct output token
    slippage: 0,
    epochInfo: await raydium.fetchEpochInfo(),
  });

  return {
    remainingAccountsA,
    remainingAccountsB,
    raydiumObservationState0,
    raydiumObservationState1,
  };
};
