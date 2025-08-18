import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getProgram } from "../program";
import { getTokens } from "../tokens";

export enum VaultStrategyType {
  Conservative = "conservative",
  Balanced = "balanced",
  Aggressive = "aggressive",
}

export type CreateVaultStrategyConfigParams = {
  provider: anchor.AnchorProvider;
  creator: PublicKey;
  vaultStrategyName: string;
  performanceFee: number; // ex.: 100_000; 10% basis points
  vaultStrategyType: VaultStrategyType;
};

export const createVaultStrategyConfigTx = async ({
  provider,
  creator,
  vaultStrategyName,
  performanceFee,
  vaultStrategyType,
}: CreateVaultStrategyConfigParams) => {
  let strategyType: any;
  switch (vaultStrategyType) {
    case "conservative":
      strategyType = { conservative: {} };
      break;
    case "balanced":
      strategyType = { balanced: {} };
      break;
    case "aggressive":
      strategyType = { aggressive: {} };
      break;
    default:
      throw new Error("Invalid strategy type");
  }

  const program = getProgram(provider);

  const { USDC } = getTokens();

  const tx = await program.methods
    .initVaultStrategyConfig(vaultStrategyName, performanceFee, strategyType)
    .accounts({
      creator: creator,
      usdcMint: USDC,
    })
    .transaction();

  // console.log("Transaction raw size", tx.serialize().length);

  return tx;
};
