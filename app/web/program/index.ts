// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

import TokenizedVaultsProgramDevnetIDL from "../idl/devnet/tokenized_vaults_program.json";
import type { TokenizedVaultsProgram as TokenizedVaultsProgramDevnet } from "../idl/devnet/tokenized_vaults_program";

import TokenizedVaultsProgramIDL from "../idl/localnet/tokenized_vaults_program.json";
import type { TokenizedVaultsProgram as TokenizedVaultsProgram } from "../idl/localnet/tokenized_vaults_program";

// Re-export the generated IDL and type
// export { TokenizedVaultsProgram, TokenizedVaultsProgramIDL };
// export { TokenizedVaultsProgramDevnet, TokenizedVaultsProgramDevnetIDL };

// The programId is imported from the program IDL.
export const getProgramId = () => {
  if (process.env.ENV == "devnet") {
    return new PublicKey(TokenizedVaultsProgramDevnetIDL.address);
  } else {
    return new PublicKey(TokenizedVaultsProgramIDL.address);
  }
};

// This is a helper function to get the Anchor program.
export const getProgram = (
  provider: AnchorProvider,
  address?: PublicKey
): Program<TokenizedVaultsProgramDevnet | TokenizedVaultsProgram> => {
  if (process.env.ENV == "devnet") {
    return new Program(
      {
        ...TokenizedVaultsProgramDevnetIDL,
        address: address
          ? address.toBase58()
          : TokenizedVaultsProgramDevnetIDL.address,
      } as TokenizedVaultsProgramDevnet,
      provider
    );
  } else {
    return new Program(
      {
        ...TokenizedVaultsProgramIDL,
        address: address
          ? address.toBase58()
          : TokenizedVaultsProgramIDL.address,
      } as TokenizedVaultsProgram,
      provider
    );
  }
};
