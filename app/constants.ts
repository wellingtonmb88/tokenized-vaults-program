import { PublicKey } from "@solana/web3.js";
import { setupDotEnv } from "./config";

setupDotEnv();

export const CLMM_PROGRAM_ID = process.env.CLMM_PROGRAM_ID;

export const AMM_CONFIG = new PublicKey(process.env.AMM_CONFIG);

export const WSOL = new PublicKey(
  "So11111111111111111111111111111111111111112"
);

export const USDC = new PublicKey(process.env.USDC);

export const TokenA = new PublicKey(process.env.TOKEN_A);

export const TokenB = new PublicKey(process.env.TOKEN_B);
