import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { TokenizedVaultsProgram } from "../../../target/types/tokenized_vaults_program";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createTransferCheckedInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  transfer,
} from "@solana/spl-token";
import { expect } from "chai";
import {
  ApiV3PoolInfoConcentratedItem,
  PoolUtils,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";
import {
  _creatorWallet,
  _masterWallet,
  connection,
  initSdk,
  setupDotEnv,
} from "../../../app/config";
import { raydiumPDAs } from "../../../app/raydium-helpers";
import {
  AMM_CONFIG,
  CLMM_PROGRAM_ID,
  TokenA,
  TokenB,
  USDC,
  WSOL,
} from "../../../app/constants";
import {
  airdrop,
  createLookUpTable,
  getTokenBalanceForOwner,
  transferToken,
  transferToTokenAccount,
  customMintToWithATA,
} from "../../../app/utils";
import { protocolPDAs } from "../../../app/protocol-pdas";
import { confirmTransaction } from "@solana-developers/helpers";
import { VAULT_STRATEGY_CONFIG_NAME } from "../constants";
import { removeLiquidityRaydiumStrategyTx } from "../../../app/web/investor/remove-liquidity-raydium-strategy";

setupDotEnv();

describe("remove-liquidity-raydium-vault-strategy", () => {
  const creator = _creatorWallet;
  const feePayer = Keypair.generate();

  // Get the provider and connection objects
  const provider = new anchor.AnchorProvider(
    connection as any,
    new anchor.Wallet(creator as any),
    {
      commitment: "confirmed",
    }
  );
  anchor.setProvider(provider);
  const program = anchor.workspace
    .tokenizedVaultsProgram as Program<TokenizedVaultsProgram>;

  let raydium: Raydium;

  before(async () => {
    console.log("Running tests on ", process.env.ENV);
    console.log("Creator address:", creator.publicKey.toString());
    // Check existing balance first
    const creatorBalance = await connection.getBalance(creator.publicKey);
    const feePayerBalance = await connection.getBalance(feePayer.publicKey);

    console.log("Creator balance:", creatorBalance / LAMPORTS_PER_SOL, "SOL");
    console.log(
      "Fee payer balance:",
      feePayerBalance / LAMPORTS_PER_SOL,
      "SOL"
    );

    // Only airdrop if balance is insufficient (devnet allows airdrops)
    if (creatorBalance < LAMPORTS_PER_SOL) {
      await airdrop(
        connection as any,
        creator.publicKey,
        200 * LAMPORTS_PER_SOL
      );
    }

    if (feePayerBalance < LAMPORTS_PER_SOL) {
      await airdrop(
        connection as any,
        feePayer.publicKey,
        200 * LAMPORTS_PER_SOL
      );
    }

    raydium = await initSdk({ owner: feePayer, loadToken: true });

    const balanceWsol = await getTokenBalanceForOwner(
      connection as any,
      WSOL,
      creator.publicKey
    );
    console.log(`\n WSOL Balance: ${balanceWsol?.uiAmountString} WSOL \n `);

    const balanceUsdc = await getTokenBalanceForOwner(
      connection as any,
      USDC,
      creator.publicKey
    );
    console.log(`\n USDC Balance: ${balanceUsdc?.uiAmountString} USDC \n `);
    console.log();
  });

  it("Remove Liquidity Raydium Vault Strategy", async () => {
    const strategyId = 1;
    const strategyConfigName = VAULT_STRATEGY_CONFIG_NAME;
    const percentageToRemove = 100;

    const {
      mint0,
      mint1,
      vaultStrategyConfigPda,
      vaultStrategyPda,
      investorStrategyPositionPda,
      vaultStrategyCfgMint0Escrow,
      vaultStrategyCfgMint1Escrow,
      vaultStrategyCfgMint0FeesEscrow,
      vaultStrategyCfgMint1FeesEscrow,
      vaultStrategyCfgMint0PerfFeesEscrow,
      vaultStrategyCfgMint1PerfFeesEscrow,
    } = protocolPDAs({
      strategyCreator: creator.publicKey,
      investor: creator.publicKey,
      strategyConfigName,
      strategyId,
      mint0: TokenA,
      mint1: TokenB,
    });

    try {
      const { tx } = await removeLiquidityRaydiumStrategyTx({
        provider,
        investor: creator.publicKey,
        vaultStrategyPda,
        strategyConfigName,
        percentage: percentageToRemove,
      });

      tx.sign([creator]);

      const txSignature = await connection.sendTransaction(tx as any, {
        skipPreflight: false,
        preflightCommitment: "finalized",
      });
      await confirmTransaction(connection as any, txSignature, "finalized");

      console.log("\n Transaction signature:", txSignature);

      tx.sign([creator]);

      console.log("Transaction raw size", tx.serialize().length);

      // const txSignature = await connection.sendTransaction(tx as any, {
      //   skipPreflight: false,
      //   preflightCommitment: "finalized",
      // });
      // await confirmTransaction(connection as any, txSignature, "finalized");

      // console.log("\n Transaction signature:", txSignature);

      const [investorMint0AccountPubKey] = PublicKey.findProgramAddressSync(
        [
          creator.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          mint0.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const [creatorTokenAccount1PubKey] = PublicKey.findProgramAddressSync(
        [
          creator.publicKey.toBuffer(),
          TOKEN_PROGRAM_ID.toBuffer(),
          mint1.toBuffer(),
        ],
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      let investorMint0Account = await getOrCreateAssociatedTokenAccount(
        connection as any,
        creator,
        mint0,
        creator.publicKey,
        false,
        "finalized"
      );
      let investorMint1Account = await getOrCreateAssociatedTokenAccount(
        connection as any,
        creator,
        mint1,
        creator.publicKey,
        false,
        "finalized"
      );

      console.log(
        "After investorMint0Account:",
        investorMint0Account.amount.toString()
      );
      console.log(
        "After investorMint1Account:",
        investorMint1Account.amount.toString()
      );
      let mint_0_fees_escrow = await connection.getTokenAccountBalance(
        vaultStrategyCfgMint0FeesEscrow
      );
      console.log(
        "After mint_0_fees_escrow Account Balance:",
        mint_0_fees_escrow
      );
      let mint_1_fees_escrow = await connection.getTokenAccountBalance(
        vaultStrategyCfgMint1FeesEscrow
      );
      console.log(
        "After mint_1_fees_escrow Account Balance:",
        mint_1_fees_escrow
      );
      let perf_fees_0_escrow = await connection.getTokenAccountBalance(
        vaultStrategyCfgMint0PerfFeesEscrow
      );
      console.log(
        "After perf_fees_0_escrow Account Balance:",
        perf_fees_0_escrow
      );

      let perf_fees_1_escrow = await connection.getTokenAccountBalance(
        vaultStrategyCfgMint1PerfFeesEscrow
      );
      console.log(
        "After perf_fees_1_escrow Account Balance:",
        perf_fees_1_escrow
      );

      const investorStrategyPositionAccount =
        await program.account.investorStrategyPosition.fetch(
          investorStrategyPositionPda
        );
      expect(
        investorStrategyPositionAccount.vaultStrategyKey.toString()
      ).to.equal(vaultStrategyPda.toString());
      expect(investorStrategyPositionAccount.shares.toNumber()).to.equal(0);
      expect(investorStrategyPositionAccount.assets.toNumber()).to.equal(0);

      const vaultStrategyAccount =
        await program.account.vaultStrategy.fetch(vaultStrategyPda);

      expect(vaultStrategyAccount.totalAssets.toNumber()).to.equal(184561723);
      expect(vaultStrategyAccount.totalShares.toNumber()).to.equal(184561723);
    } catch (error) {
      console.error("Error adding liquidity:", error);
      throw error;
    }
  });
});
