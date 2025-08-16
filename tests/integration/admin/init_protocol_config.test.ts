import * as anchor from "@coral-xyz/anchor";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { TokenizedVaultsProgram } from "../../../target/types/tokenized_vaults_program";
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { expect } from "chai";
import { _creatorWallet, connection, setupDotEnv } from "../../../app/config";
import { airdrop } from "../../../app/utils";

setupDotEnv();

describe("init-protocol-config", () => {
  // Configure the client to use devnet
  // const provider = anchor.AnchorProvider.env();
  // anchor.setProvider(provider);
  const creator = _creatorWallet;

  // Get the provider and connection objects
  const provider = new AnchorProvider(
    connection as any,
    new Wallet(creator as any),
    {
      commitment: "confirmed",
    }
  );
  anchor.setProvider(provider);

  const program = anchor.workspace
    .tokenizedVaultsProgram as Program<TokenizedVaultsProgram>;
  const programId = program.programId;

  // Derive the protocol config PDA with seeds
  const [protocolConfigPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_config:")],
    programId
  );

  // Airdrop SOL to admin account for pay transactions fees.
  before(async () => {
    console.log("Running tests on ", process.env.ENV);
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
      await airdrop(
        connection as any,
        creator.publicKey,
        200 * LAMPORTS_PER_SOL
      );
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
      connection as any,
      tx as any,
      [creator],
      {
        commitment: "finalized",
      }
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
