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
    console.log("Position NFT Account:", positionNftAccount.toBase58());

    const [personalPosition] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), vaultStrategyAccount.dexNftMint.toBuffer()],
      new PublicKey(CLMM_PROGRAM_ID)
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

    const [vault_strategy_cfg_mint_0_fees_escrow] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("vlt_fees_0_escrow:"), vaultStrategyConfigPda.toBuffer()],
        program.programId
      );

    let mint_0_fees_escrow = await connection.getTokenAccountBalance(
      vault_strategy_cfg_mint_0_fees_escrow
    );
    console.log(
      "Before mint_0_fees_escrow Account Balance:",
      mint_0_fees_escrow
    );

    const [vault_strategy_cfg_mint_1_fees_escrow] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("vlt_fees_1_escrow:"), vaultStrategyConfigPda.toBuffer()],
        program.programId
      );

    let mint_1_fees_escrow = await connection.getTokenAccountBalance(
      vault_strategy_cfg_mint_1_fees_escrow
    );
    console.log(
      "Before mint_1_fees_escrow Account Balance:",
      mint_1_fees_escrow
    );

    const [vlt_perf_fees_0_escrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vlt_perf_fees_0_escrow:"),
        vaultStrategyConfigPda.toBuffer(),
      ],
      program.programId
    );

    let perf_fees_0_escrow = await connection.getTokenAccountBalance(
      vlt_perf_fees_0_escrow
    );
    console.log(
      "Before perf_fees_0_escrow Account Balance:",
      perf_fees_0_escrow
    );

    const [vlt_perf_fees_1_escrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vlt_perf_fees_1_escrow:"),
        vaultStrategyConfigPda.toBuffer(),
      ],
      program.programId
    );

    let perf_fees_1_escrow = await connection.getTokenAccountBalance(
      vlt_perf_fees_1_escrow
    );
    console.log(
      "Before perf_fees_1_escrow Account Balance:",
      perf_fees_1_escrow
    );

    // const { lookupTableAccount } = await createLookUpTable({
    //   connection: connection as any,
    //   payer: creator,
    //   authority: creator,
    //   // reuseTable: vaultStrategyAccount.lookUpTable,
    //   // reuseTable: new PublicKey("3okz33Qa9DhnyQRoHccgx7zvDs4acYXQarJVVw9kczag"),
    //   addresses: [
    //     investor_strategy_position,
    //     investor_mint_0_account,
    //     investor_mint_1_account,
    //   ],
    // });
    const { lookupTableAccount: vaultStrategyAccountLookUpTable } =
      await createLookUpTable({
        connection: connection as any,
        payer: creator,
        authority: creator,
        reuseTable: vaultStrategyAccount.lookUpTable,
        addresses: [],
      });

    const minToken0Out = new BN(0);
    const minToken1Out = new BN(0);
    const percentageToRemove = new BN(100 * 1e9);
    try {
      const removeLiquidityIx = await program.methods
        .removeLiquidityRaydiumVaultStrategy(
          strategyId,
          percentageToRemove,
          minToken0Out,
          minToken1Out
        )
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
          ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
          removeLiquidityIx,
        ],
      }).compileToV0Message([vaultStrategyAccountLookUpTable]);

      const tx = new anchor.web3.VersionedTransaction(txMessage);

      tx.sign([creator]);

      console.log("Transaction raw size", tx.serialize().length);

      const txSignature = await connection.sendTransaction(tx as any, {
        skipPreflight: false,
        preflightCommitment: "finalized",
      });
      await confirmTransaction(connection as any, txSignature, "finalized");

      console.log("\n Transaction signature:", txSignature);

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
        vault_strategy_cfg_mint_0_fees_escrow
      );
      console.log(
        "After mint_0_fees_escrow Account Balance:",
        mint_0_fees_escrow
      );
      let mint_1_fees_escrow = await connection.getTokenAccountBalance(
        vault_strategy_cfg_mint_1_fees_escrow
      );
      console.log(
        "After mint_1_fees_escrow Account Balance:",
        mint_1_fees_escrow
      );
      let perf_fees_0_escrow = await connection.getTokenAccountBalance(
        vlt_perf_fees_0_escrow
      );
      console.log(
        "After perf_fees_0_escrow Account Balance:",
        perf_fees_0_escrow
      );

      let perf_fees_1_escrow = await connection.getTokenAccountBalance(
        vlt_perf_fees_1_escrow
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
