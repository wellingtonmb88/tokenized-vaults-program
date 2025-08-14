import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
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
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";
import {
  ApiV3PoolInfoConcentratedItem,
  PoolUtils,
  Raydium,
} from "@raydium-io/raydium-sdk-v2";
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
  transferToken,
} from "../../../app/utils";
import { protocolPDAs } from "../../../app/protocol-pdas";
import { confirmTransaction } from "@solana-developers/helpers";
import { VAULT_STRATEGY_CONFIG_NAME } from "../constants";

setupDotEnv();

describe("swap-to-ratio-raydium-vault-strategy", () => {
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

  it("Swap to Ratio Raydium Vault Strategy", async () => {
    const strategyId = 1;
    const strategyConfigName = VAULT_STRATEGY_CONFIG_NAME;

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
      metadataAccount,
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

    // const vault_strategy_cfg_usdc_escrow = PublicKey.findProgramAddressSync(
    //   [
    //     Buffer.from("vt_swap_ratio_usdc_escrow:"),
    //     vaultStrategyConfigPda.toBuffer(),
    //   ],
    //   program.programId
    // );

    const vault_strategy_cfg_usdc_escrow =
      await getOrCreateAssociatedTokenAccount(
        connection as any,
        creator,
        USDC,
        vaultStrategyConfigPda,
        true,
        "finalized",
        { skipPreflight: false },
        TOKEN_PROGRAM_ID
      );

    const vault_strategy_cfg_mint_0_escrow = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vlt_swap_ratio_0_escrow:"),
        vaultStrategyConfigPda.toBuffer(),
      ],
      program.programId
    );

    const vault_strategy_cfg_mint_1_escrow = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vlt_swap_ratio_1_escrow:"),
        vaultStrategyConfigPda.toBuffer(),
      ],
      program.programId
    );

    // First, fetch vault strategy to access its properties
    const vaultStrategyAccount =
      await program.account.vaultStrategy.fetch(vaultStrategyPda);

    const [personalPosition] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), vaultStrategyAccount.dexNftMint.toBuffer()],
      new PublicKey(CLMM_PROGRAM_ID)
    );

    const { lookupTableAccount } = await createLookUpTable({
      connection: connection as any,
      payer: creator,
      authority: creator,
      reuseTable: new PublicKey("4dNnqCE11LsNAV1tf4qD3uBL4Adr8WYcw3ukB2orF1vw"),
      addresses: [
        poolStateMint0WithMint1,
        protocolPosition,
        new PublicKey(vault_strategy_cfg_usdc_escrow.address),
        new PublicKey(vault_strategy_cfg_mint_0_escrow),
        new PublicKey(vault_strategy_cfg_mint_1_escrow),
        openPositionTokenVault0,
        openPositionTokenVault1,
        mint0,
        mint1,
        metadataAccount,
      ],
    });

    await transferToken({
      connection: connection as any,
      owner: creator,
      mint: USDC,
      destination: new PublicKey(vault_strategy_cfg_usdc_escrow.address),
      amount: 10 * 1e6,
    });

    // First, we need to calculate the amounts that will actually be swapped
    // This matches the logic in the Rust program

    const totalReservedAmount = new anchor.BN(10000000); // From the test setup
    const percentage = vaultStrategyAccount.percentage; // Get the actual percentage from the strategy
    const MAX_PERCENTAGE = 10000;

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
      minAmountOut: minAmountOutA,
      remainingAccounts: remainingAccountsA,
    } = await PoolUtils.computeAmountOutFormat({
      poolInfo: dataA.computePoolInfo,
      tickArrayCache: dataA.tickData[poolIdA],
      amountIn: usdcForToken0Amount,
      tokenOut: tokenOutA, // Use the correct output token
      slippage: 0,
      epochInfo: await raydium.fetchEpochInfo(),
    });
    console.log("minAmountOutA:", minAmountOutA.amount.toSignificant(6));

    // Let's check the token ordering for poolStateUSDCWithMint1
    const isUsdcMintAInPoolB = poolInfoB.mintA.address === USDC.toString();
    const tokenOutB = isUsdcMintAInPoolB ? poolInfoB.mintB : poolInfoB.mintA;

    const {
      minAmountOut: minAmountOutB,
      remainingAccounts: remainingAccountsB,
    } = await PoolUtils.computeAmountOutFormat({
      poolInfo: dataB.computePoolInfo,
      tickArrayCache: dataB.tickData[poolIdB],
      amountIn: usdcForToken1Amount,
      tokenOut: tokenOutB, // Use the correct output token
      slippage: 0,
      epochInfo: await raydium.fetchEpochInfo(),
    });
    console.log("minAmountOutB:", minAmountOutB.amount.toSignificant(6));

    const minToken0Out = new BN(0);
    const minToken1Out = new BN(0);
    try {
      const createVaultStrategyIx = await program.methods
        .swapToRatioRaydiumVaultStrategy(strategyId, minToken0Out, minToken1Out)
        .accounts({
          investor: creator.publicKey,
          vaultStrategyConfig: vaultStrategyConfigPda,
          raydiumPoolState: poolStateMint0WithMint1,
          raydiumPersonalPosition: personalPosition,
          raydiumAmmConfigUsdcForToken0: AMM_CONFIG,
          raydiumPoolStateUsdcForToken0: poolStateUSDCWithMint0,
          raydiumAmmConfigUsdcForToken1: AMM_CONFIG,
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
        })
        .signers([creator])
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

      console.log(
        "\n Vault strategy created with Pyth integration:",
        txSignature
      );

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
