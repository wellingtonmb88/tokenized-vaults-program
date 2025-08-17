import { PublicKey } from "@solana/web3.js";
import { u8ToBytes } from "./utils";
import { getProgramId } from "./web/program";

export const protocolPDAs = ({
  strategyCreator,
  investor,
  strategyConfigName,
  strategyId,
  mint0,
  mint1,
}: {
  strategyCreator: PublicKey;
  investor: PublicKey;
  strategyConfigName: string;
  strategyId: number;
  mint0: PublicKey;
  mint1: PublicKey;
}) => {
  const tokenArray = [mint0, mint1];
  tokenArray.sort((a, b) => {
    const bufferA = a.toBuffer();
    const bufferB = b.toBuffer();
    return Buffer.compare(bufferA, bufferB);
  });

  const sortedMint0 = tokenArray[0];
  const sortedMint1 = tokenArray[1];

  const programId = getProgramId();
  const [protocolConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol_config:")],
    programId
  );

  const [vaultStrategyConfigPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault_strategy_config:"),
      strategyCreator.toBuffer(),
      Buffer.from(strategyConfigName),
    ],
    programId
  );

  const [vaultStrategyPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vlt_strtg:"),
      vaultStrategyConfigPda.toBuffer(),
      sortedMint0.toBuffer(),
      sortedMint1.toBuffer(),
      u8ToBytes(strategyId),
    ],
    programId
  );

  const [investorStrategyPositionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("inv_strtg_pos:"),
      vaultStrategyPda.toBuffer(),
      investor.toBuffer(),
    ],
    programId
  );

  const [vaultStrategyCfgUsdcEscrow] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vlt_strategy_cfg_usdc_escrow:"),
      vaultStrategyConfigPda.toBuffer(),
    ],
    programId
  );

  const [vaultStrategyCfgMint0Escrow] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vlt_swap_ratio_0_escrow:"),
      vaultStrategyConfigPda.toBuffer(),
    ],
    programId
  );

  const [vaultStrategyCfgMint1Escrow] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vlt_swap_ratio_1_escrow:"),
      vaultStrategyConfigPda.toBuffer(),
    ],
    programId
  );

  const [vaultStrategyCfgMint0FeesEscrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("vlt_fees_0_escrow:"), vaultStrategyConfigPda.toBuffer()],
    programId
  );

  const [vaultStrategyCfgMint1FeesEscrow] = PublicKey.findProgramAddressSync(
    [Buffer.from("vlt_fees_1_escrow:"), vaultStrategyConfigPda.toBuffer()],
    programId
  );

  const [vaultStrategyCfgMint0PerfFeesEscrow] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("vlt_perf_fees_0_escrow:"),
        vaultStrategyConfigPda.toBuffer(),
      ],
      programId
    );

  const [vaultStrategyCfgMint1PerfFeesEscrow] =
    PublicKey.findProgramAddressSync(
      [
        Buffer.from("vlt_perf_fees_1_escrow:"),
        vaultStrategyConfigPda.toBuffer(),
      ],
      programId
    );

  const [investReserveVaultPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("invest_reserve_vault:"),
      investor.toBuffer(),
      vaultStrategyConfigPda.toBuffer(),
    ],
    programId
  );
  return {
    mint0: sortedMint0,
    mint1: sortedMint1,
    protocolConfigPda,
    vaultStrategyConfigPda,
    vaultStrategyPda,
    investReserveVaultPda,
    investorStrategyPositionPda,
    vaultStrategyCfgUsdcEscrow,
    vaultStrategyCfgMint0Escrow,
    vaultStrategyCfgMint1Escrow,
    vaultStrategyCfgMint0FeesEscrow,
    vaultStrategyCfgMint1FeesEscrow,
    vaultStrategyCfgMint0PerfFeesEscrow,
    vaultStrategyCfgMint1PerfFeesEscrow,
  };
};
