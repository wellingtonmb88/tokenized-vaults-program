import { PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { getProgram } from "../program";
import { getTokens } from "../tokens";
import { BN } from "@coral-xyz/anchor";

export type DepositToEscrowParams = {
  provider: anchor.AnchorProvider;
  investor: PublicKey;
  amount: number;
};

export const depositToEscrowTx = async ({
  provider,
  investor,
  amount,
}: DepositToEscrowParams) => {
  const program = getProgram(provider);
  const { USDC } = await getTokens();

  const tx = await program.methods
    .depositToEscrow(new BN(amount * 1e6))
    .accounts({
      investor,
      usdcMint: USDC,
    })
    .transaction();

  console.log("Transaction raw size", tx.serialize().length);

  return tx;
};
