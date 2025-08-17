import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenizedVaultsProgram } from "../../../target/types/tokenized_vaults_program";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { expect } from "chai";
import { _creatorWallet, connection, setupDotEnv } from "../../../app/config";
import { VAULT_STRATEGY_CONFIG_NAME } from "../constants";
import { airdrop } from "../../../app/utils";
import {
  createVaultStrategyConfigTx,
  VaultStrategyType,
} from "../../../app/web/creator/create-vault-strategy-config";

setupDotEnv();

describe("init-vault-strategy-config", () => {
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
  const programId = program.programId;

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

  it("Init Vault Strategy Config", async () => {
    const performanceFee = 100_000; // 10% basis points

    const tx = await createVaultStrategyConfigTx({
      provider,
      creator: creator.publicKey,
      vaultStrategyName: VAULT_STRATEGY_CONFIG_NAME,
      performanceFee,
      vaultStrategyType: VaultStrategyType.Conservative,
    });

    const txSignature = await sendAndConfirmTransaction(
      connection as any,
      tx as any,
      [creator],
      {
        skipPreflight: false,
        preflightCommitment: "finalized",
      }
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
