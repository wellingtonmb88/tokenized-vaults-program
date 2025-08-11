import { PublicKey } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";

import { TokenizedVaultsProgram } from "../target/types/tokenized_vaults_program";
import { u8ToBytes } from "./utils";

export const protocolPDAs = ({
  program,
  creator,
  strategyConfigName,
  strategyId,
  mint0,
  mint1,
}: {
  program: Program<TokenizedVaultsProgram>;
  creator: PublicKey;
  strategyConfigName: string;
  strategyId: number;
  mint0: PublicKey;
  mint1: PublicKey;
}) => {
  const [protocolConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_config:")],
    program.programId
  );

  const [vaultStrategyConfigPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault_strategy_config:"),
      creator.toBuffer(),
      Buffer.from(strategyConfigName),
    ],
    program.programId
  );

  const [vaultStrategyPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vlt_sttg:"),
      vaultStrategyConfigPda.toBuffer(),
      mint0.toBuffer(),
      mint1.toBuffer(),
      u8ToBytes(strategyId),
    ],
    program.programId
  );

  const [investorStrategyPositionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("inv_strtg_pos:"),
      vaultStrategyPda.toBuffer(),
      creator.toBuffer(),
    ],
    program.programId
  );
  return {
    protocolConfigPda,
    vaultStrategyConfigPda,
    vaultStrategyPda,
    investorStrategyPositionPda,
  };
};
