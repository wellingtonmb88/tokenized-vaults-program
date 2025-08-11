import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import dotenv from "dotenv";
import { TokenizedVaultsProgram } from "../../target/types/tokenized_vaults_program";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Connection,
} from "@solana/web3.js";
import { expect } from "chai";
import { _creatorWallet } from "../../app/config";
import { VAULT_STRATEGY_CONFIG_NAME } from "./constants";

dotenv.config();

describe("init-vault-strategy-config", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Get the provider and connection objects
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  const program = anchor.workspace
    .tokenizedVaultsProgram as Program<TokenizedVaultsProgram>;
  const programId = program.programId;

  const creator = _creatorWallet;

  // Derive the vault strategy config PDA with seeds
  const [vaultStrategyConfigPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault_strategy_config:"),
      creator.publicKey.toBuffer(),
      Buffer.from(VAULT_STRATEGY_CONFIG_NAME),
    ],
    programId
  );

  // Airdrop SOL to admin account for pay transactions fees.
  before(async () => {
    console.log("Running tests on devnet");
    console.log("Admin address:", creator.publicKey.toString());

    // Check existing balance first
    const adminBalance = await connection.getBalance(creator.publicKey);
    console.log("Admin balance:", adminBalance / LAMPORTS_PER_SOL, "SOL");

    // Only airdrop if balance is insufficient
    if (adminBalance < LAMPORTS_PER_SOL) {
      console.log("Requesting airdrop for admin...");
      const airdropSignature = await connection.requestAirdrop(
        creator.publicKey,
        200 * anchor.web3.LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignature);
    }
  });

  it("Init Vault Strategy Config", async () => {
    const performanceFee = 100_000; // 10% basis points

    const tx = await program.methods
      .initVaultStrategyConfig(VAULT_STRATEGY_CONFIG_NAME, performanceFee, {
        conservative: {},
      })
      .accounts({
        creator: creator.publicKey,
      })
      .signers([creator])
      .transaction();

    const txSignature = await sendAndConfirmTransaction(
      provider.connection as any,
      tx as any,
      [creator]
    );

    console.log(`Transaction signature: ${txSignature}`);
    // Get state of account protocol config
    const vaultStrategyConfigAccount =
      await program.account.vaultStrategyConfig.fetch(vaultStrategyConfigPda);

    expect(vaultStrategyConfigAccount.creator.toBase58()).to.equal(
      creator.publicKey.toBase58()
    );
    expect(vaultStrategyConfigAccount.name).to.equal(
      VAULT_STRATEGY_CONFIG_NAME
    );
    expect(vaultStrategyConfigAccount.performanceFee).to.equal(performanceFee);
    console.log("Status:", vaultStrategyConfigAccount.status);
    expect(vaultStrategyConfigAccount.status.draft).to.not.be.undefined;
    console.log(
      "Vault Strategy Type:",
      vaultStrategyConfigAccount.vaultStrategyType
    );
    expect(vaultStrategyConfigAccount.vaultStrategyType.conservative).to.not.be
      .undefined;
  });
});
