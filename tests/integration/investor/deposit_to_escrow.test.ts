import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenizedVaultsProgram } from "../../../target/types/tokenized_vaults_program";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";
import {
  _creatorWallet,
  _masterWallet,
  connection,
  setupDotEnv,
} from "../../../app/config";
import { airdrop } from "../../../app/utils";
import { depositToEscrowTx } from "../../../app/web/investor/deposit-to-escrow";
import { USDC } from "../../../app/constants";
import {
  createTransferInstruction,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { getProgramId } from "../../../app/web/program";

setupDotEnv();

describe("deposit-to-escrow", () => {
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

  // Airdrop SOL to admin account for pay transactions fees.
  before(async () => {
    console.log("Running tests on ", process.env.ENV);
    console.log("Admin address:", creator.publicKey.toString());

    // Check existing balance first
    const adminBalance = await connection.getBalance(creator.publicKey);
    console.log("Admin balance:", adminBalance / LAMPORTS_PER_SOL, "SOL");

    // Only airdrop if balance is insufficient
    if (adminBalance < LAMPORTS_PER_SOL) {
      await airdrop(
        connection as any,
        creator.publicKey,
        200 * LAMPORTS_PER_SOL
      );
    }
  });

  it("Deposit to Escrow", async () => {
    const amount = 100; // 100 USDC
    const programId = getProgramId();

    const [escrowVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("escrow_vault:"), creator.publicKey.toBuffer()],
      programId
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
      investorTokenAccount.amount.toString()
    );
    try {
      const escrowVaultPdaBalance =
        await connection.getTokenAccountBalance(escrowVaultPda);
      console.log(
        "Before escrowVaultPda Account Balance:",
        escrowVaultPdaBalance.value
      );
    } catch (error) {
      console.error("Error fetching escrowVaultPda balance:", error);
    }

    const _depositToEscrowTx = await depositToEscrowTx({
      provider,
      investor: creator.publicKey,
      amount,
    });

    let tx = new Transaction().add(
      createTransferInstruction(
        masterWalletUSDCATA.address,
        investorTokenAccount.address,
        _masterWallet.publicKey,
        100 * 1e6
      ),
      ..._depositToEscrowTx.instructions
    );

    const txSignature = await sendAndConfirmTransaction(
      connection as any,
      tx as any,
      [creator, _masterWallet],
      {
        skipPreflight: false,
        preflightCommitment: "finalized",
      }
    );

    console.log(`Transaction signature: ${txSignature}`);

    const balance = await connection.getTokenAccountBalance(escrowVaultPda);

    expect(balance.value.amount).to.equal(amount * 1e6);
  });
});
