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

dotenv.config();

describe("init-protocol-config", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Get the provider and connection objects
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");

  const program = anchor.workspace
    .tokenizedVaultsProgram as Program<TokenizedVaultsProgram>;
  const programId = program.programId;

  const creator = _creatorWallet;

  // Derive the protocol config PDA with seeds
  const [protocolConfigPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_config:")],
    programId
  );

  // Airdrop SOL to admin account for pay transactions fees.
  before(async () => {
    console.log("Running tests on devnet");
    console.log("Admin address:", creator.publicKey.toString());

    const accountInfo = await connection.getAccountInfo(protocolConfigPda);
    if (accountInfo) {
      console.log(
        "ProtocolConfig account already exists. Consider resetting it."
      );
    }

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

  it("Init Protocol Config", async () => {
    const protocolFees = 5000; // 5% en ppm

    const tx = await program.methods
      .initProtocolConfig(protocolFees)
      .accounts({
        adminAuthority: creator.publicKey,
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
    const protocolConfigAccount =
      await program.account.protocolConfig.fetch(protocolConfigPda);

    // Verify initialized account state
    expect(protocolConfigAccount.adminAuthority.toBase58()).to.equal(
      creator.publicKey.toBase58()
    );
    expect(protocolConfigAccount.protocolFees).to.equal(protocolFees);
    console.log("Status:", protocolConfigAccount.status);
    expect(protocolConfigAccount.status.active).to.not.be.undefined;
    expect(protocolConfigAccount.bump).to.equal(bump);
  });
});
