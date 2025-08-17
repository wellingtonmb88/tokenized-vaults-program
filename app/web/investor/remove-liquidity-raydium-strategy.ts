import { ComputeBudgetProgram, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getProgram } from "../program";
import {
  getAccountOrCreateAssociatedTokenAccountTx,
  getTokens,
} from "../tokens";
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
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { createLookUpTable } from "../../utils";
import { CLMM_PROGRAM_ID } from "../../constants";

export type RemoveLiquidityRaydiumStrategyParams = {
  provider: anchor.AnchorProvider;
  investor: PublicKey;
  vaultStrategyPda: PublicKey;
  strategyConfigName: string;
  percentage: number;
};

export const removeLiquidityRaydiumStrategyTx = async ({
  provider,
  investor,
  vaultStrategyPda,
  strategyConfigName,
  percentage,
}: RemoveLiquidityRaydiumStrategyParams) => {
  const ammConfig = raydiumAmmConfig();
  const program = getProgram(provider);
  const raydium = await initSdkWithoutOwner({ loadToken: true });
  const { token0, token1 } = getTokens();

  const minToken0Out = new BN(0);
  const minToken1Out = new BN(0);
  const percentageToRemove = new BN(percentage * 1e9);

  const {
    mint0,
    mint1,
    poolStateMint0WithMint1,
    protocolPosition,
    openPositionTokenVault0,
    openPositionTokenVault1,
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

  const { account: investorMint0Account, transaction: investorMint0AccountTx } =
    await getAccountOrCreateAssociatedTokenAccountTx(
      provider.connection as any,
      mint0,
      investor,
      false,
      "confirmed",
      TOKEN_PROGRAM_ID
    );

  const { account: investorMint1Account, transaction: investorMint1AccountTx } =
    await getAccountOrCreateAssociatedTokenAccountTx(
      provider.connection as any,
      mint1,
      investor,
      false,
      "confirmed",
      TOKEN_PROGRAM_ID
    );

  // const [investorMint0AccountPubKey] = PublicKey.findProgramAddressSync(
  //   [investor.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint0.toBuffer()],
  //   ASSOCIATED_TOKEN_PROGRAM_ID
  // );

  // const [creatorTokenAccount1PubKey] = PublicKey.findProgramAddressSync(
  //   [investor.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint1.toBuffer()],
  //   ASSOCIATED_TOKEN_PROGRAM_ID
  // );

  const { lookupTableAccount: vaultStrategyAccountLookUpTable } =
    await createLookUpTable({
      connection: provider.connection as any,
      payer: _masterWallet,
      authority: _masterWallet,
      reuseTable: vaultStrategyAccount.lookUpTable,
      addresses: [],
    });

  const removeLiquidityIx = await program.methods
    .removeLiquidityRaydiumVaultStrategy(
      vaultStrategyAccount.strategyId,
      percentageToRemove,
      minToken0Out,
      minToken1Out
    )
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
      ...(!investorMint0Account ? investorMint0AccountTx.instructions : []),
      ...(!investorMint1Account ? investorMint1AccountTx.instructions : []),
      removeLiquidityIx,
    ],
  }).compileToV0Message([vaultStrategyAccountLookUpTable]);

  const tx = new anchor.web3.VersionedTransaction(txMessage);
  console.log("Transaction raw size", tx.serialize().length);

  return {
    vaultStrategyConfigPda,
    vaultStrategyPda,
    investorStrategyPositionPda,
    tx,
  };
};
