import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenizedVaultsProgram } from "../target/types/tokenized_vaults_program";
import { PublicKey, Keypair, SystemProgram,LAMPORTS_PER_SOL, } from "@solana/web3.js";
import { expect } from "chai";

describe("tokenized-vaults-program", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());
  // Get the provider and connection objects
  const provider = anchor.getProvider();
  const connection = provider.connection;

  const program = anchor.workspace.tokenizedVaultsProgram as Program<TokenizedVaultsProgram>;
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
  const accountInfo = await connection.getAccountInfo(protocolConfigPda);
  if (accountInfo) {
    console.log("ProtocolConfig account already exists. Consider resetting it.");
  }

    const airdropSignature = await connection.requestAirdrop(
      admin.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(airdropSignature);

    const balance = await connection.getBalance(admin.publicKey);
console.log(`Admin balance: ${balance / LAMPORTS_PER_SOL} SOL`);
  });


describe("init_protocol_config", () => {
    xit("Init ProtocolConfig", async () => {
      const protocolFees = new anchor.BN(5000); // 5% en ppm 

    const txSignature =  await program.methods
        .initProtocolConfig(protocolFees)
        .accountsPartial({
          adminAuthority: admin.publicKey,
          protocolConfig: protocolConfigPda,
          systemProgram: SystemProgram.programId,
          
        })
        .signers([admin])
        .rpc();
        console.log(`Transaction signature: ${txSignature}`);
      // Get state of account protocol config
      const protocolConfigAccount = await program.account.protocolConfig.fetch(protocolConfigPda);

      // Verify initialized account state
      expect(protocolConfigAccount.adminAuthority.toBase58()).to.equal(admin.publicKey.toBase58());
      expect(protocolConfigAccount.protocolFees.toNumber()).to.equal(protocolFees.toNumber());
      console.log("Status:", protocolConfigAccount.status);
      expect(protocolConfigAccount.status.active).to.not.be.undefined;
      expect(protocolConfigAccount.bump).to.equal(bump);
    });

    it("Fail if fees exceed the percent set", async () => {
      const invalidFees = new anchor.BN(150000); // 15% en ppm, mayor al límite permitido

      try {
        await program.methods
          .initProtocolConfig(invalidFees)
          .accountsPartial({
            adminAuthority: admin.publicKey,
            protocolConfig: protocolConfigPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin])
          .rpc();
        expect.fail("The transaction should have failed due to high fees");
      } catch (error) {
                expect(error.message).to.include("FeeTooHigh");
      }
    });

   xit("Falil if ProtocolConfig are initialized", async () => {
      // Try to initialize again with same account
      
      const protocolFees = new anchor.BN(5000); // 2% en ppm
      
      try {
        await program.methods
          .initProtocolConfig(protocolFees)
          .accountsPartial({
            adminAuthority: admin.publicKey,
            protocolConfig: protocolConfigPda,
            systemProgram: SystemProgram.programId,
          })
          .signers([admin])
          .rpc();
        expect.fail("Transaction should have failed due to already ProtocolConfigInitialized");
      } catch (error) {
        
        console.log("Status Message:", error.message);
        expect(error.message).to.include("ProtocolConfigInitialized");

      }
    });
  });
});
