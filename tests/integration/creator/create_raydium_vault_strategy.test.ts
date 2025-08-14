import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenizedVaultsProgram } from "../../../target/types/tokenized_vaults_program";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
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
import {
  airdrop,
  createLookUpTable,
  getTokenBalanceForOwner,
  sleep,
  transferToken,
} from "../../../app/utils";
import { protocolPDAs } from "../../../app/protocol-pdas";
import { confirmTransaction } from "@solana-developers/helpers";
import { VAULT_STRATEGY_CONFIG_NAME } from "../constants";

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
    const percentage = 25 * 10_000; // 25% allocation
    const amount_0_max = new anchor.BN(1_000_000_000);
    const amount_1_max = new anchor.BN(3051827671);
    const strategyId = 1;
    const strategyConfigName = VAULT_STRATEGY_CONFIG_NAME;

    // Raydium tick parameters (example values)
    // // TickSpacing 1
    let tickLower = -194221;
    let tickUpper = 7940;
    if (process.env.ENV === "devnet") {
      // TickSpacing 10
      tickLower = -128160;
      tickUpper = 75020;
    }

    console.log("Fetching Raydium PDAs...");
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
      metadataAccount,
    } = await raydiumPDAs({
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
      program,
      creator: creator.publicKey,
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

    const positionNftAccount = getAssociatedTokenAddressSync(
      RAYDIUM_POSITION_NFT.publicKey,
      vaultStrategyPda,
      true, // allowOwnerOffCurve
      TOKEN_2022_PROGRAM_ID // Only using if using OpenPositionWithToken22Nft
    );
    console.log("Position NFT:", RAYDIUM_POSITION_NFT.publicKey.toBase58());
    console.log("Position NFT Account:", positionNftAccount.toBase58());

    const creatorTokenAccount0 = await getOrCreateAssociatedTokenAccount(
      provider.connection as any,
      creator,
      mint0,
      creator.publicKey,
      false,
      "confirmed",
      { skipPreflight: false },
      TOKEN_PROGRAM_ID
    );

    const creatorTokenAccount1 = await getOrCreateAssociatedTokenAccount(
      provider.connection as any,
      creator,
      mint1,
      creator.publicKey,
      false,
      "confirmed",
      { skipPreflight: false },
      TOKEN_PROGRAM_ID
    );

    const { lookupTableAccount } = await createLookUpTable({
      connection: connection as any,
      payer: creator,
      authority: creator,
      // reuseTable: new PublicKey("HGPxXUNLcotXyAxzmEaALx1RbVAFgSHQjJZA2b5fuz1b"),
      addresses: [
        RAYDIUM_POSITION_NFT.publicKey,
        positionNftAccount,
        poolStateMint0WithMint1,
        protocolPosition,
        tickLowerArrayAddress,
        tickUpperArrayAddress,
        personalPosition,
        creatorTokenAccount0.address,
        creatorTokenAccount1.address,
        openPositionTokenVault0,
        openPositionTokenVault1,
        mint0,
        mint1,
        metadataAccount,
        PYTH_SOL_USD_FEED_ACCOUNT,
        PYTH_USDC_USD_FEED_ACCOUNT,
      ],
    });

    ////// Create vault strategy with Pyth integration
    try {
      const createVaultStrategyIx = await program.methods
        .createRaydiumVaultStrategy(
          strategyConfigName,
          strategyId,
          percentage,
          amount_0_max,
          amount_1_max,
          tickLower,
          tickUpper,
          tickArrayLowerStartIndex,
          tickArrayUpperStartIndex,
          PYTH_SOL_USD_FEED_ID,
          PYTH_USDC_USD_FEED_ID
        )
        .accounts({
          creator: creator.publicKey,
          raydiumPositionNftMint: RAYDIUM_POSITION_NFT.publicKey,
          raydiumPositionNftAccount: positionNftAccount,
          raydiumPoolState: poolStateMint0WithMint1,
          raydiumProtocolPosition: protocolPosition,
          raydiumTickArrayLower: tickLowerArrayAddress.toBase58(),
          raydiumTickArrayUpper: tickUpperArrayAddress.toBase58(),
          raydiumPersonalPosition: personalPosition,
          raydiumTokenAccount0: creatorTokenAccount0.address,
          raydiumTokenAccount1: creatorTokenAccount1.address,
          raydiumTokenVault0: openPositionTokenVault0,
          raydiumTokenVault1: openPositionTokenVault1,
          raydiumVault0Mint: mint0,
          raydiumVault1Mint: mint1,
          pythToken0PriceUpdate: PYTH_SOL_USD_FEED_ACCOUNT,
          pythToken1PriceUpdate: PYTH_USDC_USD_FEED_ACCOUNT,
        })
        .signers([creator, RAYDIUM_POSITION_NFT])
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
        payerKey: creator.publicKey,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: [
          ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100 }),
          ComputeBudgetProgram.setComputeUnitLimit({ units: 700_000 }),
          createVaultStrategyIx,
        ],
      }).compileToV0Message([lookupTableAccount]);

      const tx = new anchor.web3.VersionedTransaction(txMessage);

      tx.sign([creator, RAYDIUM_POSITION_NFT]);

      console.log("Transaction raw size", tx.serialize().length);

      const txSignature = await connection.sendTransaction(tx as any, {
        skipPreflight: false,
        preflightCommitment: "finalized",
      });
      await confirmTransaction(connection as any, txSignature, "finalized");

      console.log(
        "\n Vault strategy created with Pyth integration:",
        txSignature
      );

      await sleep(1000);

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
        RAYDIUM_POSITION_NFT.publicKey.toBase58()
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
