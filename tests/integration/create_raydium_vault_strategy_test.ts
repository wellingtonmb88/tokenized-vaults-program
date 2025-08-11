import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import dotenv from "dotenv";
import { TokenizedVaultsProgram } from "../../target/types/tokenized_vaults_program";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  ComputeBudgetProgram,
  Connection,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import { _creatorWallet, initSdk } from "../../app/config";
import { raydiumPDAs } from "../../app/raydium-helpers";
import { AMM_CONFIG, USDC, WSOL } from "../../app/constants";
import {
  createLookUpTable,
  getTokenBalanceForOwner,
  transferToken,
} from "../../app/utils";
import { protocolPDAs } from "../../app/protocol-pdas";
import { confirmTransaction } from "@solana-developers/helpers";
import { VAULT_STRATEGY_CONFIG_NAME } from "./constants";

dotenv.config();

describe("create-raydium-vault-strategy", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const connection = new Connection("http://127.0.0.1:8899", "confirmed"); //provider.connection;
  const program = anchor.workspace
    .tokenizedVaultsProgram as Program<TokenizedVaultsProgram>;

  const creator = _creatorWallet;
  const feePayer = Keypair.generate();

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
    // Check if we're on devnet and have sufficient balance
    console.log("Running tests on devnet");
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
      console.log("Requesting airdrop for creator...");
      const airdropSignature1 = await connection.requestAirdrop(
        creator.publicKey,
        200 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignature1);
    }

    if (feePayerBalance < LAMPORTS_PER_SOL) {
      console.log("Requesting airdrop for fee payer...");
      const airdropSignature3 = await connection.requestAirdrop(
        feePayer.publicKey,
        200 * LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignature3);
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
    const amount_0_max = new anchor.BN(1_000_000_000); // 1 SOL (9 decimals)
    const amount_1_max = new anchor.BN(3051827671); // 255.197741 USDC (6 decimals)

    // Raydium tick parameters (example values)
    const tickLower = -194221;
    const tickUpper = 7940;

    const {
      mint0,
      mint1,
      poolStateMint0WithMint1,
      tickLowerArrayAddress,
      tickUpperArrayAddress,
      tickArrayLowerStartIndex,
      tickArrayUpperStartIndex,
      bitmapExtension,
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
      mint0: WSOL,
      mint1: USDC,
    });

    const {
      vaultStrategyConfigPda,
      vaultStrategyPda,
      investorStrategyPositionPda,
    } = protocolPDAs({
      program,
      creator: creator.publicKey,
      strategyConfigName: VAULT_STRATEGY_CONFIG_NAME,
      strategyId: 1,
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

    await transferToken({
      connection: connection as any,
      owner: creator,
      mint: mint0,
      destination: creatorTokenAccount0.address,
      amount: 10 * LAMPORTS_PER_SOL,
    });

    await transferToken({
      connection: connection as any,
      owner: creator,
      mint: mint1,
      destination: creatorTokenAccount1.address,
      amount: 30 * 1e6,
    });

    ////// Create vault strategy with Pyth integration
    try {
      const createVaultStrategyIx = await program.methods
        .createRaydiumVaultStrategy(
          VAULT_STRATEGY_CONFIG_NAME,
          1,
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
          { pubkey: bitmapExtension, isSigner: false, isWritable: true },
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

      console.log("Transaction 0 signed", tx.serialize().length);

      const txSignature = await connection.sendTransaction(tx as any);
      await confirmTransaction(connection as any, txSignature);

      console.log(
        "\n Vault strategy created with Pyth integration:",
        txSignature
      );

      const vaultStrategyAccount =
        await program.account.vaultStrategy.fetch(vaultStrategyPda);

      expect(vaultStrategyAccount.creator.toString()).to.equal(
        creator.publicKey.toString()
      );
      expect(vaultStrategyAccount.vaultStrategyConfigKey.toString()).to.equal(
        vaultStrategyConfigPda.toString()
      );
      expect(vaultStrategyAccount.dexNftMint.toString()).to.equal(
        RAYDIUM_POSITION_NFT.publicKey.toString()
      );
      expect(vaultStrategyAccount.mint0.toString()).to.equal(WSOL.toString());
      expect(vaultStrategyAccount.mint1.toString()).to.equal(USDC.toString());
      expect(vaultStrategyAccount.totalAssets.toNumber()).to.equal(182061723);
      expect(vaultStrategyAccount.totalShares.toNumber()).to.equal(182061723);
      expect(vaultStrategyAccount.percentage).to.equal(percentage);
      expect(vaultStrategyAccount.strategyId).to.equal(1);

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
