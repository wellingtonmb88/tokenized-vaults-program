import { ComputeBudgetProgram, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { _masterWallet, initSdkWithoutOwner } from "../../config";
import { raydiumPDAs, raydiumAmmConfig } from "../../../app/raydium-helpers";
import {
  getAccountOrCreateAssociatedTokenAccountTx,
  getTokens,
} from "../tokens";
import { getProgram } from "../program";
import { protocolPDAs } from "../../protocol-pdas";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { createLookUpTable } from "../../utils";

const RAYDIUM_POSITION_NFT = Keypair.generate();

// Pyth price feed IDs (stable (mainnet))
const PYTH_SOL_USD_FEED_ID =
  "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";
const PYTH_USDC_USD_FEED_ID =
  "0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a";

const PYTH_SOL_USD_FEED_ACCOUNT = new PublicKey(
  "7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"
);
const PYTH_USDC_USD_FEED_ACCOUNT = new PublicKey(
  "Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX"
);

export type CreateRaydiumStrategyParams = {
  provider: anchor.AnchorProvider;
  creator: PublicKey;
  strategyId: number;
  strategyConfigName: string;
  percentage: number; // ex.: 100_000; 10% basis points
  tickLower: number;
  tickUpper: number;
  amount0Max: string;
  amount1Max: string;
};

export const createRaydiumStrategyTx = async ({
  provider,
  creator,
  strategyId,
  strategyConfigName,
  percentage,
  tickLower,
  tickUpper,
  amount0Max,
  amount1Max,
}: CreateRaydiumStrategyParams) => {
  const ammConfig = raydiumAmmConfig();
  const program = getProgram(provider);
  const raydium = await initSdkWithoutOwner({ loadToken: true });
  const { USDC, token0, token1 } = getTokens();

  // Strategy parameters
  const amount_0_max = new anchor.BN(amount0Max);
  const amount_1_max = new anchor.BN(amount1Max);

  // // Raydium tick parameters (example values)
  // // // TickSpacing 1
  // let tickLower = -194221;
  // let tickUpper = 7940;
  // if (process.env.ENV === "devnet") {
  //   // TickSpacing 10
  //   tickLower = -128160;
  //   tickUpper = 75020;
  // }

  const {
    mint0,
    mint1,
    poolStateMint0WithMint1,
    tickLowerArrayAddress,
    tickUpperArrayAddress,
    tickArrayLowerStartIndex,
    tickArrayUpperStartIndex,
    bitmapExtMint0WithMint1,
    personalPosition,
    protocolPosition,
    openPositionTokenVault0,
    openPositionTokenVault1,
  } = await raydiumPDAs({
    ammConfig,
    raydium,
    nft: RAYDIUM_POSITION_NFT.publicKey,
    tickLower,
    tickUpper,
    mint0: token0,
    mint1: token1,
  });

  const {
    vaultStrategyConfigPda,
    vaultStrategyPda,
    investorStrategyPositionPda,
    vaultStrategyCfgUsdcEscrow,
    vaultStrategyCfgMint0Escrow,
    vaultStrategyCfgMint1Escrow,
    vaultStrategyCfgMint0FeesEscrow,
    vaultStrategyCfgMint1FeesEscrow,
    vaultStrategyCfgMint0PerfFeesEscrow,
    vaultStrategyCfgMint1PerfFeesEscrow,
  } = protocolPDAs({
    strategyCreator: creator,
    investor: creator,
    strategyConfigName,
    strategyId,
    mint0: token0,
    mint1: token1,
  });

  const positionNftAccount = getAssociatedTokenAddressSync(
    RAYDIUM_POSITION_NFT.publicKey,
    vaultStrategyConfigPda,
    true, // allowOwnerOffCurve
    TOKEN_2022_PROGRAM_ID // Only using if using OpenPositionWithToken22Nft
  );

  const { account: creatorTokenAccount0, transaction: creatorTokenAccount0Tx } =
    await getAccountOrCreateAssociatedTokenAccountTx(
      provider.connection as any,
      mint0,
      creator,
      false,
      "confirmed",
      TOKEN_PROGRAM_ID
    );

  const { account: creatorTokenAccount1, transaction: creatorTokenAccount1Tx } =
    await getAccountOrCreateAssociatedTokenAccountTx(
      provider.connection as any,
      mint1,
      creator,
      false,
      "confirmed",
      TOKEN_PROGRAM_ID
    );

  const [creatorTokenAccount0PubKey] = PublicKey.findProgramAddressSync(
    [creator.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint0.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const [creatorTokenAccount1PubKey] = PublicKey.findProgramAddressSync(
    [creator.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint1.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  const { lookupTableAccount } = await createLookUpTable({
    connection: provider.connection as any,
    payer: _masterWallet,
    authority: _masterWallet,
    addresses: [
      RAYDIUM_POSITION_NFT.publicKey,
      positionNftAccount,
      poolStateMint0WithMint1,
      protocolPosition,
      tickLowerArrayAddress,
      tickUpperArrayAddress,
      personalPosition,
      creatorTokenAccount0PubKey,
      creatorTokenAccount1PubKey,
      openPositionTokenVault0,
      openPositionTokenVault1,
      mint0,
      mint1,
      USDC,
      PYTH_SOL_USD_FEED_ACCOUNT,
      PYTH_USDC_USD_FEED_ACCOUNT,

      vaultStrategyConfigPda,
      vaultStrategyPda,
      investorStrategyPositionPda,

      poolStateMint0WithMint1,
      protocolPosition,
      vaultStrategyCfgUsdcEscrow,
      vaultStrategyCfgMint0Escrow,
      vaultStrategyCfgMint1Escrow,
      vaultStrategyCfgMint0FeesEscrow,
      vaultStrategyCfgMint1FeesEscrow,
      vaultStrategyCfgMint0PerfFeesEscrow,
      vaultStrategyCfgMint1PerfFeesEscrow,
      bitmapExtMint0WithMint1,
    ],
  });

  const createVaultStrategyIx = await program.methods
    .createRaydiumVaultStrategy(
      strategyId,
      percentage,
      amount_0_max,
      amount_1_max,
      tickLower,
      tickUpper,
      tickArrayLowerStartIndex,
      tickArrayUpperStartIndex,
      PYTH_SOL_USD_FEED_ID,
      PYTH_USDC_USD_FEED_ID,
      lookupTableAccount.key
    )
    .accounts({
      creator,
      vaultStrategyConfig: vaultStrategyConfigPda,
      raydiumPositionNftMint: RAYDIUM_POSITION_NFT.publicKey,
      raydiumPositionNftAccount: positionNftAccount,
      raydiumPoolState: poolStateMint0WithMint1,
      raydiumProtocolPosition: protocolPosition,
      raydiumTickArrayLower: tickLowerArrayAddress.toBase58(),
      raydiumTickArrayUpper: tickUpperArrayAddress.toBase58(),
      raydiumPersonalPosition: personalPosition,
      raydiumTokenAccount0: creatorTokenAccount0PubKey,
      raydiumTokenAccount1: creatorTokenAccount1PubKey,
      raydiumTokenVault0: openPositionTokenVault0,
      raydiumTokenVault1: openPositionTokenVault1,
      raydiumVault0Mint: mint0,
      raydiumVault1Mint: mint1,
      pythToken0PriceUpdate: PYTH_SOL_USD_FEED_ACCOUNT,
      pythToken1PriceUpdate: PYTH_USDC_USD_FEED_ACCOUNT,
    })
    // .signers([creator, RAYDIUM_POSITION_NFT])
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
    payerKey: creator,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100 }),
      ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 }),
      ...(!creatorTokenAccount0 ? creatorTokenAccount0Tx.instructions : []),
      ...(!creatorTokenAccount1 ? creatorTokenAccount1Tx.instructions : []),
      createVaultStrategyIx,
    ],
  }).compileToV0Message([lookupTableAccount]);
  
  const tx = new anchor.web3.VersionedTransaction(txMessage);
  console.log("Transaction raw size", tx.serialize().length);

  return {
    nft: RAYDIUM_POSITION_NFT.publicKey,
    signers: [RAYDIUM_POSITION_NFT],
    tx,
  };
};
