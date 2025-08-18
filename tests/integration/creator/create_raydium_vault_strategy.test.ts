import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenizedVaultsProgram } from "../../../target/types/tokenized_vaults_program";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import {
  _creatorWallet,
  connection,
  initSdk,
  setupDotEnv,
} from "../../../app/config";
import { raydiumPDAs } from "../../../app/raydium-helpers";
import { AMM_CONFIG, TokenA, TokenB, USDC, WSOL } from "../../../app/constants";
import { airdrop, getTokenBalanceForOwner, sleep } from "../../../app/utils";
import { protocolPDAs } from "../../../app/protocol-pdas";
import { confirmTransaction } from "@solana-developers/helpers";
import { VAULT_STRATEGY_CONFIG_NAME } from "../constants";
import { createRaydiumStrategyTx } from "../../../app/web/creator/create-raydium-strategy";

setupDotEnv();

describe("create-raydium-vault-strategy", () => {
  const feePayer = Keypair.generate();
  const creator = _creatorWallet;

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

  it("Creates Raydium Vault strategy", async () => {
    // Strategy parameters
    const percentage = 100 * 10_000; // 25% allocation
    const amount_0_max = new anchor.BN(1000000000);
    const amount_1_max = new anchor.BN(3051827671);
    const strategyId = 1;
    const strategyConfigName = VAULT_STRATEGY_CONFIG_NAME;

    // // Raydium tick parameters (example values)
    // // // TickSpacing 1
    let tickLower = -194221;
    let tickUpper = 7940;
    if (process.env.ENV === "devnet") {
      // TickSpacing 10
      tickLower = -128160;
      tickUpper = 75020;
    }

    console.log("Fetching Raydium PDAs...");
    const { mint0, mint1 } = await raydiumPDAs({
      ammConfig: AMM_CONFIG,
      raydium,
      nft: RAYDIUM_POSITION_NFT.publicKey,
      tickLower,
      tickUpper,
      mint0: TokenA,
      mint1: TokenB,
    });

    console.log("Fetching Protocol PDAs...");
    const {
      vaultStrategyConfigPda,
      vaultStrategyPda,
      investorStrategyPositionPda,
    } = protocolPDAs({
      strategyCreator: creator.publicKey,
      investor: creator.publicKey,
      strategyConfigName,
      strategyId,
      mint0,
      mint1,
    });

    console.log("Vault Strategy PDA:", vaultStrategyPda.toBase58());
    console.log(
      "Investor Strategy Position PDA:",
      investorStrategyPositionPda.toBase58()
    );

    // ////// Create vault strategy with Pyth integration
    try {
      const { nft, signers, tx } = await createRaydiumStrategyTx({
        provider,
        creator: creator.publicKey,
        strategyId,
        strategyConfigName,
        percentage,
        tickLower,
        tickUpper,
        amount0Max: amount_0_max.toString(),
        amount1Max: amount_1_max.toString(),
      });

      tx.sign([creator, ...signers]);

      console.log("Transaction raw size", tx.serialize().length);

      const txSignature = await connection.sendTransaction(tx as any, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await confirmTransaction(connection as any, txSignature, "finalized");

      console.log("\n  Transaction signature:", txSignature);

      await sleep(1000);

      const positionNftAccount = getAssociatedTokenAddressSync(
        nft,
        vaultStrategyConfigPda,
        true, // allowOwnerOffCurve
        TOKEN_2022_PROGRAM_ID // Only using if using OpenPositionWithToken22Nft
      );
      console.log("Position NFT:", nft.toBase58());
      console.log("Position NFT Account:", positionNftAccount.toBase58());

      const vaultStrategyAccount =
        await program.account.vaultStrategy.fetch(vaultStrategyPda);

      expect(vaultStrategyAccount.creator.toString()).to.equal(
        creator.publicKey.toString()
      );
      expect(vaultStrategyAccount.vaultStrategyConfigKey.toString()).to.equal(
        vaultStrategyConfigPda.toString()
      );
      console.log(
        "\nVault NFT Mint:",
        vaultStrategyAccount.dexNftMint.toString(),
        "\n\n"
      );
      expect(vaultStrategyAccount.dexNftMint.toString()).to.equal(
        nft.toBase58()
      );
      expect(vaultStrategyAccount.mint0.toString()).to.equal(mint0.toString());
      expect(vaultStrategyAccount.mint1.toString()).to.equal(mint1.toString());
      expect(vaultStrategyAccount.totalAssets.toNumber()).to.equal(182061723);
      expect(vaultStrategyAccount.totalShares.toNumber()).to.equal(182061723);
      expect(vaultStrategyAccount.percentage).to.equal(percentage);
      expect(vaultStrategyAccount.strategyId).to.equal(strategyId);

      const investorStrategyPositionAccount =
        await program.account.investorStrategyPosition.fetch(
          investorStrategyPositionPda
        );
      expect(investorStrategyPositionAccount.authority.toString()).to.equal(
        creator.publicKey.toString()
      );
      expect(
        investorStrategyPositionAccount.vaultStrategyKey.toString()
      ).to.equal(vaultStrategyPda.toString());
      expect(investorStrategyPositionAccount.shares.toNumber()).to.equal(
        182061723
      );
      expect(investorStrategyPositionAccount.assets.toNumber()).to.equal(
        182061723
      );
    } catch (error) {
      console.error("Error creating vault strategy:", error);
      throw error;
    }
  });
});
