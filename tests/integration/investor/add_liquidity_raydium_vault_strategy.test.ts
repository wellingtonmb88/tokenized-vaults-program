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

  it("Add Liquidity Raydium Vault Strategy", async () => {
    const strategyId = 1;
    const strategyConfigName = VAULT_STRATEGY_CONFIG_NAME;
    const amountToAdd = 10 * 1e6;

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

    const [vaultStrategyCfgUsdcEscrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vlt_strategy_cfg_usdc_escrow:"),
        vaultStrategyConfigPda.toBuffer(),
      ],
      program.programId
    );

    const [vaultStrategyCfgMint0Escrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vlt_swap_ratio_0_escrow:"),
        vaultStrategyConfigPda.toBuffer(),
      ],
      program.programId
    );

    const [vaultStrategyCfgMint1Escrow] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vlt_swap_ratio_1_escrow:"),
        vaultStrategyConfigPda.toBuffer(),
      ],
      program.programId
    );

    const [personalPosition] = PublicKey.findProgramAddressSync(
      [Buffer.from("position"), vaultStrategyAccount.dexNftMint.toBuffer()],
      new PublicKey(CLMM_PROGRAM_ID)
    );

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

    const [investReserveVaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("invest_reserve_vault:"),
        creator.publicKey.toBuffer(),
        vaultStrategyConfigPda.toBuffer(),
      ],
      program.programId
    );

    const [escrowVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_vault:"), creator.publicKey.toBuffer()],
      program.programId
    );

    let investorTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection as any,
      creator,
      USDC,
      creator.publicKey,
      false,
      "finalized"
    );

    let masterWalletUSDCATA = await getOrCreateAssociatedTokenAccount(
      connection as any,
      _masterWallet,
      USDC,
      _masterWallet.publicKey,
      false,
      "finalized"
    );

    console.log(
      "investorTokenAccount:",
      investorTokenAccount.address.toBase58(),
      investorTokenAccount.amount.toString()
    );
    const balance0 = await connection.getTokenAccountBalance(escrowVaultPda);
    console.log("Before escrowVaultPda Account Balance:", balance0);

    const depositToEscrowIx = await program.methods
      .depositToEscrow(new BN(100 * 1e6))
      .accounts({
        investor: creator.publicKey,
        usdcMint: USDC,
      })
      .signers([creator])
      .remainingAccounts([])
      .instruction();

    let tx = new Transaction().add(
      createTransferInstruction(
        masterWalletUSDCATA.address,
        investorTokenAccount.address,
        _masterWallet.publicKey,
        100 * 1e6
      ),
      depositToEscrowIx
    );

    console.log(
      `Transfer Token ${USDC.toBase58()} txhash: ${await sendAndConfirmTransaction(
        connection as any,
        tx,
        [creator, _masterWallet],
        { commitment: "finalized" }
      )}\n`
    );

    const balance = await connection.getTokenAccountBalance(
      investorTokenAccount.address
    );
    console.log("investorTokenAccount Account Balance:", balance);
    const balance2 = await connection.getTokenAccountBalance(escrowVaultPda);
    console.log("escrowVaultPda Account Balance:", balance2);

    const { lookupTableAccount } = await createLookUpTable({
      connection: connection as any,
      payer: creator,
      authority: creator,
        // reuseTable: vaultStrategyAccount.lookUpTable,
      // reuseTable: new PublicKey("3okz33Qa9DhnyQRoHccgx7zvDs4acYXQarJVVw9kczag"),
      addresses: [
        investReserveVaultPda,
        vaultStrategyCfgUsdcEscrow,
        vaultStrategyCfgMint0Escrow,
        vaultStrategyCfgMint1Escrow,

        AMM_CONFIG,
        poolStateUSDCWithMint0,
        poolStateUSDCWithMint1,
        usdcWithMint0VaultInput,
        usdcWithMint1VaultInput,
        usdcWithMint0VaultOutput,
        usdcWithMint1VaultOutput,
        USDC,
        raydiumObservationState0,
        raydiumObservationState1,
        new PublicKey(tickLowerArrayAddress.toBase58()),
        new PublicKey(tickUpperArrayAddress.toBase58()),
        ...remainingAccountsA,
        ...remainingAccountsB,
      ],
    });
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
    try {
      const investReserveIx = await program.methods
        .investReserve(new BN(amountToAdd))
        .accounts({
          investor: creator.publicKey,
          vaultStrategyConfig: vaultStrategyConfigPda,
          usdcMint: USDC,
        })
        .signers([creator])
        .remainingAccounts([])
        .instruction();

      const swapToRatioIx = await program.methods
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
          raydiumTokenVault0: openPositionTokenVault0,
          raydiumTokenVault1: openPositionTokenVault1,
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

      const addLiquidityIx = await program.methods
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
          ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
          investReserveIx,
          swapToRatioIx,
          addLiquidityIx,
        ],
      }).compileToV0Message([
        vaultStrategyAccountLookUpTable,
        lookupTableAccount,
      ]);

      const tx = new anchor.web3.VersionedTransaction(txMessage);

      tx.sign([creator]);

      console.log("Transaction raw size", tx.serialize().length);

      const txSignature = await connection.sendTransaction(tx as any, {
        skipPreflight: false,
        preflightCommitment: "finalized",
      });
      await confirmTransaction(connection as any, txSignature, "finalized");

      console.log("\n Transaction signature:", txSignature);

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
      expect(investReserveVaultAccount.reservedAmount.toNumber()).to.equal(0);
      expect(investReserveVaultAccount.swapToRatioVaults.length).to.equal(0);

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
        184561723
      );
      expect(investorStrategyPositionAccount.assets.toNumber()).to.equal(
        184561723
      );

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
