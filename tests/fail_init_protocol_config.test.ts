import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenizedVaultsProgram } from "../target/types/tokenized_vaults_program";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { expect } from "chai";
import { setupDotEnv } from "../app/config";

setupDotEnv();

describe("tokenized-vaults-program", () => {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Get the provider and connection objects
  const connection = provider.connection;

  const program = anchor.workspace
    .tokenizedVaultsProgram as Program<TokenizedVaultsProgram>;
  const programId = program.programId;

  // Create admin keypair
  const admin = Keypair.generate();

  // Derive the protocol config PDA with seeds
  const [protocolConfigPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_config")],
    programId
  );

  // Airdrop SOL to admin account for pay transactions fees.
  before(async () => {
    console.log("Running tests on ", process.env.ENV);
    console.log("Admin address:", admin.publicKey.toString());

    const accountInfo = await connection.getAccountInfo(protocolConfigPda);
    if (accountInfo) {
      console.log(
        "ProtocolConfig account already exists. Consider resetting it."
      );
    }

    // Check existing balance first
    const adminBalance = await connection.getBalance(admin.publicKey);
    console.log("Admin balance:", adminBalance / LAMPORTS_PER_SOL, "SOL");

    // Only airdrop if balance is insufficient
    if (adminBalance < LAMPORTS_PER_SOL) {
      console.log("Requesting airdrop for admin...");
      const airdropSignature = await connection.requestAirdrop(
        admin.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignature);
    }
  });

  describe("invalid fees, protocol already initialized", () => {
    it("Fail if fees exceed the percent set", async () => {
      const invalidFees = 150000; // 15% en ppm, mayor al límite permitido

      try {
        await program.methods
          .initProtocolConfig(invalidFees)
          .accounts({
            adminAuthority: admin.publicKey,
          })
          .signers([admin])
          .rpc({ commitment: "confirmed" });
        expect.fail("The transaction should have failed due FeeTooHigh");
      } catch (error) {
        expect(error.message).to.include("FeeTooHigh");
      }
    });
  });
});
