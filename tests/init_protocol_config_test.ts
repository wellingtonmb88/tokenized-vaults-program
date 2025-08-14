import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenizedVaultsProgram } from "../target/types/tokenized_vaults_program";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { expect } from "chai";
import { setupDotEnv } from "../app/config";

//auxiliary function to get error logs
function getErrorLogs(error: any): string[] {
  return error?.logs || [];
}
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
    [Buffer.from("protocol_config:")],
    programId
  );

  // Airdrop SOL to admin account for pay transactions fees.
  before(async () => {
    console.log("Running tests on devnet");
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
        200 * anchor.web3.LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(airdropSignature);
    }
  });

  describe("Initialization", () => {
    it("Fail if fees exceed the percent set", async () => {
      const invalidFees = 100_001; // Exceeds the maximum allowed
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

    it("Fail if fees is set zero", async () => {
      const zeroFees = 0; // 0 fees, which is not allowed
      try {
        await program.methods
          .initProtocolConfig(zeroFees)
          .accounts({
            adminAuthority: admin.publicKey,
          })
          .signers([admin])
          .rpc({ commitment: "confirmed" });
        expect.fail("The transaction should have failed due FeeTooLow");
      } catch (error) {
        expect(error.message).to.include("FeeTooLow");
      }
    });

    it("Should initializeProtocolConfig", async () => {
      const protocolFees = 5000; // 5% en ppm

      // Check if the protocol config PDA already exists
      const accountBefore = await connection.getAccountInfo(protocolConfigPda);
      expect(accountBefore).to.be.null;

      const tx = await program.methods
        .initProtocolConfig(protocolFees)
        .accounts({
          adminAuthority: admin.publicKey,
        })
        .transaction();

      const txSignature = await sendAndConfirmTransaction(
        provider.connection as any,
        tx as any,
        [admin]
      );
      // Get state of account protocol config
      const protocolConfigAccount =
        await program.account.protocolConfig.fetch(protocolConfigPda);
      // Verify initialized account state
      expect(protocolConfigAccount.adminAuthority.toBase58()).to.equal(
        admin.publicKey.toBase58()
      );
      expect(protocolConfigAccount.protocolFees).to.equal(protocolFees);
      //console.log("Status:", protocolConfigAccount.status);
      expect(protocolConfigAccount.status.active).to.not.be.undefined;
      expect(protocolConfigAccount.bump).to.equal(bump);
    });

    it("Should fail if ProtocolConfig is already initialized", async () => {
      // Try to initialize again with same account
      const protocolFees = 5000; // 5% en ppm
      try {
        await program.methods
          .initProtocolConfig(protocolFees)
          .accounts({
            adminAuthority: admin.publicKey,
          })
          .signers([admin])
          .rpc({ commitment: "confirmed" });
        expect.fail("Expected transaction to fail ProtocolConfigInitialized");
      } catch (error: any) {
        const logs = error.logs || [];
        expect(logs.some((log: string) => log.includes("already in use"))).to.be
          .true;
      }
    });
  });
  describe("Pause/Unpause", () => {
    it("Should fail if wrong PDA is provided", async () => {
      const fakePda = Keypair.generate().publicKey;
      try {
        await program.methods
          .pauseProtocol()
          .accounts({
            adminAuthority: admin.publicKey,
            protocolConfig: fakePda,
          })
          .rpc();
        expect.fail("Should not accept fake PDA");
      } catch (error: any) {
        expect(error.toString()).to.include("Signature verification failed");
        //console.log("Error logs:", getErrorLogs(error));
      }
    });

    it("Pause Protocol", async () => {
      const txSignature = await program.methods
        .pauseProtocol()
        .accounts({
          adminAuthority: admin.publicKey,
        })
        .signers([admin])
        .rpc({ commitment: "confirmed" });
      //console.log(`Transaction signature: ${txSignature}`);
      // Get state of account protocol config
      const protocolConfigAccount =
        await program.account.protocolConfig.fetch(protocolConfigPda);
      // Verify initialized account state
      //console.log("Status:", protocolConfigAccount.status);
      expect(protocolConfigAccount.status.paused).to.not.be.undefined;
      expect(protocolConfigAccount.adminAuthority.toBase58()).to.equal(
        admin.publicKey.toBase58()
      );
    });

    it("Should Fail if ProtocolConfig Already Paused", async () => {
      try {
        await program.methods
          .pauseProtocol()
          .accounts({
            adminAuthority: admin.publicKey,
          })
          .signers([admin])
          .rpc({ commitment: "confirmed" });

        expect.fail("Expected error: ProtocolAlreadyPaused");
      } catch (error) {
        expect(error.toString()).to.include("ProtocolAlreadyPaused");
      }
    });

    it("Should fail if non-admin tries to pause protocol", async () => {
      const nonAdmin = Keypair.generate();
      await provider.connection.requestAirdrop(
        nonAdmin.publicKey,
        LAMPORTS_PER_SOL
      );

      try {
        await program.methods
          .pauseProtocol()
          .accountsPartial({
            adminAuthority: nonAdmin.publicKey,
          })
          .signers([nonAdmin])
          .rpc({ commitment: "confirmed" });
        expect.fail("Expected error: Unauthorized");
      } catch (error) {
        expect(error.toString()).to.include("ConstraintHasOne");
      }
    });

    it("Should fail if non-admin tries to Unpause protocol", async () => {
      const nonAdmin = Keypair.generate();
      await provider.connection.requestAirdrop(
        nonAdmin.publicKey,
        LAMPORTS_PER_SOL
      );

      try {
        await program.methods
          .unpauseProtocol()
          .accountsPartial({
            adminAuthority: nonAdmin.publicKey,
          })
          .signers([nonAdmin])
          .rpc({ commitment: "confirmed" });
        expect.fail("Expected error: Unauthorized");
      } catch (error) {
        expect(error.toString()).to.include("ConstraintHasOne");
      }
    });

    it("Should Unpause Protocol", async () => {
      const txSignature = await program.methods
        .unpauseProtocol()
        .accounts({
          adminAuthority: admin.publicKey,
        })
        .signers([admin])
        .rpc({ commitment: "confirmed" });
      const protocolConfigAccount =
        await program.account.protocolConfig.fetch(protocolConfigPda);
      expect(protocolConfigAccount.status.active).to.not.be.undefined;
      expect(protocolConfigAccount.bump).to.equal(bump);
    });

    it("Should fail if trying to unpause when already active", async () => {
      try {
        await program.methods
          .unpauseProtocol()
          .accountsPartial({
            adminAuthority: admin.publicKey,
          })
          .signers([admin])
          .rpc({ commitment: "confirmed" });
        expect.fail("Expected error: ProtocolNotPaused");
      } catch (error) {
        expect(error.toString()).to.include("ProtocolNotPaused");
      }
    });
  });
});
