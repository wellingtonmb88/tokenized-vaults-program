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
} from "../../../app/utils";
import { protocolPDAs } from "../../../app/protocol-pdas";
import { confirmTransaction } from "@solana-developers/helpers";
import { VAULT_STRATEGY_CONFIG_NAME } from "../constants";

setupDotEnv();

describe("add-liquidity-raydium-vault-strategy", () => {
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

  it("Add Liquidity to Raydium Vault Strategy", async () => {
    const strategyId = 1;
    const strategyConfigName = VAULT_STRATEGY_CONFIG_NAME;

    const {
      mint0,
      mint1,
      poolStateMint0WithMint1,
      protocolPosition,
      bitmapExtMint0WithMint1,
      openPositionTokenVault0,
      openPositionTokenVault1,
      tickLowerArrayAddress,
      tickUpperArrayAddress,
    } = await raydiumPDAs({
      ammConfig: AMM_CONFIG,
      raydium,
      mint0: TokenA,
      mint1: TokenB,
    });

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
      "Vault Strategy Config PDA:",
      vaultStrategyConfigPda.toBase58()
    );
    console.log(
      "Investor Strategy Position PDA:",
      investorStrategyPositionPda.toBase58()
    );

    // First, fetch vault strategy to access its properties
    const vaultStrategyAccount =
      await program.account.vaultStrategy.fetch(vaultStrategyPda);

    const positionNftAccount = getAssociatedTokenAddressSync(
      vaultStrategyAccount.dexNftMint,
      vaultStrategyConfigPda,
      true, // allowOwnerOffCurve
      TOKEN_2022_PROGRAM_ID // Only using if using OpenPositionWithToken22Nft
    );
    console.log("Position NFT:", vaultStrategyAccount.dexNftMint.toBase58());
    console.log("Position NFT Account:", positionNftAccount.toBase58());

    const [personalPosition] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), vaultStrategyAccount.dexNftMint.toBuffer()],
      new PublicKey(CLMM_PROGRAM_ID)
    );

    const { lookupTableAccount } = await createLookUpTable({
      connection: connection as any,
      payer: creator,
      authority: creator,
      reuseTable: new PublicKey("CQcgpse3FLjmGUvDKCWYPwb7Kdpyj9c36Z4dWaGQEZov"),
      addresses: [
        poolStateMint0WithMint1,
        protocolPosition,
        bitmapExtMint0WithMint1,
        positionNftAccount,
        personalPosition,
        tickLowerArrayAddress,
        tickUpperArrayAddress,
        openPositionTokenVault0,
        openPositionTokenVault1,
        mint0,
        mint1,
      ],
    });

    try {
      const createVaultStrategyIx = await program.methods
        .addLiquidityRaydiumVaultStrategy(strategyId)
        .accounts({
          investor: creator.publicKey,
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
        .signers([creator])
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

      tx.sign([creator]);

      console.log("Transaction raw size", tx.serialize().length);

      const txSignature = await connection.sendTransaction(tx as any, {
        skipPreflight: false,
        preflightCommitment: "finalized",
      });
      await confirmTransaction(connection as any, txSignature, "finalized");

      console.log("\n  Transaction signature:", txSignature);

      const [investReserveVaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("invest_reserve_vault:"),
          creator.publicKey.toBuffer(),
          vaultStrategyConfigPda.toBuffer(),
        ],
        program.programId
      );

      const investReserveVaultAccount =
        await program.account.investReserveVault.fetch(investReserveVaultPda);

      expect(
        investReserveVaultAccount.vaultStrategyConfigKey.toBase58()
      ).to.equal(vaultStrategyConfigPda.toBase58());
      expect(investReserveVaultAccount.reservedAmount.toNumber()).to.equal(
        10000000
      );
      expect(investReserveVaultAccount.swapToRatioVaults.length).to.equal(1);

      expect(
        investReserveVaultAccount.swapToRatioVaults[0].vaultStrategyKey.toBase58()
      ).to.equal(vaultStrategyPda.toBase58());
      expect(
        investReserveVaultAccount.swapToRatioVaults[0].amountIn.toNumber()
      ).to.equal(2500000);
      expect(
        investReserveVaultAccount.swapToRatioVaults[0].token0Amount.toNumber()
      ).to.greaterThan(1);
      expect(
        investReserveVaultAccount.swapToRatioVaults[0].token1Amount.toNumber()
      ).to.greaterThan(1);
    } catch (error) {
      console.error("Error creating vault strategy:", error);
      throw error;
    }
  });
});
