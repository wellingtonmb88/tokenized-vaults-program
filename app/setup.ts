import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  Signer,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import dotenv from "dotenv";
import {
  _masterWallet,
  _creatorWallet,
  devConfigs,
  initSdk,
  txVersion,
} from "./config";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import {
  ACCOUNT_SIZE,
  createAssociatedTokenAccount,
  createCloseAccountInstruction,
  createInitializeAccountInstruction,
  createMint,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import Decimal from "decimal.js";
import { getSimulationComputeUnits } from "@solana-developers/helpers";
import { createPosition } from "./create-position";
import { airdrop, sleep } from "./utils";
import { USDC } from "./constants";

dotenv.config();

const CLMM_PROGRAM_ID = "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK";
const CLMM_PROGRAM_ID_DEVNET = "devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH";

let masterWallet: Keypair;
let creatorWallet: Keypair;
let raydium: Raydium;

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);

const connection = provider.connection;

const run = async () => {
  masterWallet = _masterWallet;
  creatorWallet = _creatorWallet;
  await airdrop(
    connection as any,
    creatorWallet.publicKey,
    50_001 * LAMPORTS_PER_SOL
  );
  await airdrop(
    connection as any,
    masterWallet.publicKey,
    50_001 * LAMPORTS_PER_SOL
  );
  await sleep(1000);
  provider.connection.getBalance(masterWallet.publicKey).then((balance) => {
    console.log(`After setup The lamport balance is ${balance}`);
    console.log();
  });

  raydium = await initSdk({ owner: masterWallet, loadToken: true });

  //  await _createMints({
  //   authority: masterWallet,
  //   to: masterWallet.publicKey,
  // });
  await _createWSOLMints({
    authority: masterWallet,
    to: masterWallet.publicKey,
  });
  await _createWSOLMints({
    authority: masterWallet,
    to: creatorWallet.publicKey,
  });

  let mintA = USDC;
  // let mintB = new PublicKey("w7SBDvWxBmBSJdwLKAMPC1nz3sXvALBGW1j7oCvFK35");

  console.log("Minting token A (USDC)");
  await _mintTo(
    provider.connection as any,
    masterWallet,
    masterWallet.publicKey,
    mintA,
    100_000
  );
  await _mintTo(
    provider.connection as any,
    masterWallet,
    creatorWallet.publicKey,
    mintA,
    100_000
  );

  console.log("Creating pool WSOL/USDC");
  const poolIdA = await createPool(
    raydium,
    NATIVE_MINT.toBase58(),
    mintA.toBase58(),
    true
  ); // WSOL - mintA => poolIdA J4XJekUt9aXzhrqWDpm5kujo1fTkkSmmtrHedixswks1

  // const poolIdB = await createPool(
  //   raydium,
  //   NATIVE_MINT.toBase58(),
  //   mintB.toBase58(),
  //   true
  // ); //// WSOL - mintB => poolIdB GhCPpMsZChcuPmmfxCMJrWz2CtL5xBzSTFQLPrMzpWsf

  // const poolIdC = await createPool(
  //   raydium,
  //   mintA.toBase58(),
  //   mintB.toBase58(),Azg24cVCSqusnejCLHYJe3toi1D38Y85MU1AJZyU6DVY
  //   true
  // ); //// mintA - mintB => poolIdC RHkbPaJvxRzLN6hvAgqHTQEU1qdqurHR7iYrGwJ11LD

  console.log("Creating position for Pool WSOL/USDC");
  await createPosition(raydium, poolIdA).catch(console.error);
  // await createPosition(raydium, poolIdB).catch(console.error);

  console.log("done");
  process.exit();
};

const _createMints = async ({
  authority,
  to,
}: {
  authority: Keypair;
  to: PublicKey;
}) => {
  const mintA = await _createMintTo(provider.connection as any, authority, to);
  console.log(mintA);
  const mintB = await _createMintTo(provider.connection as any, authority, to);
  console.log(mintB);

  const toAta = await getOrCreateAssociatedTokenAccount(
    provider.connection as any,
    authority,
    NATIVE_MINT,
    to,
    false,
    "confirmed"
  );

  let auxAccount = Keypair.generate();

  let amount = 5_000 * LAMPORTS_PER_SOL; /* Wrapped SOL's decimals is 9 */

  let tx = new Transaction().add(
    // create token account
    SystemProgram.createAccount({
      fromPubkey: authority.publicKey,
      newAccountPubkey: auxAccount.publicKey,
      space: ACCOUNT_SIZE,
      lamports:
        (await getMinimumBalanceForRentExemptAccount(provider.connection)) +
        amount, // rent + amount
      programId: TOKEN_PROGRAM_ID,
    }),
    // init token account
    createInitializeAccountInstruction(
      auxAccount.publicKey,
      NATIVE_MINT,
      authority.publicKey
    ),
    // transfer WSOL
    createTransferInstruction(
      auxAccount.publicKey,
      toAta.address,
      authority.publicKey,
      amount
    ),
    // close aux account
    createCloseAccountInstruction(
      auxAccount.publicKey,
      authority.publicKey,
      authority.publicKey
    )
  );

  console.log(
    `SOL -> WSOL txhash: ${await sendAndConfirmTransaction(
      provider.connection as any,
      tx,
      [authority, auxAccount, authority]
    )}`
  );

  // _mintTo(provider.connection, feePayer, mintA, 100000 * LAMPORTS_PER_SOL);
  // _mintTo(provider.connection, feePayer, mintB, 100000 * LAMPORTS_PER_SOL);

  const tokenArray = [mintA, mintB];
  tokenArray.sort((a, b) => {
    const bufferA = a.toBuffer();
    const bufferB = b.toBuffer();
    return Buffer.compare(bufferA, bufferB);
  });

  await sleep(1000);

  return {
    mintA: new PublicKey(tokenArray[0].toBase58()),
    mintB: new PublicKey(tokenArray[1].toBase58()),
  };
};

const _createWSOLMints = async ({
  authority,
  to,
}: {
  authority: Keypair;
  to: PublicKey;
}) => {
  const toAta = await getOrCreateAssociatedTokenAccount(
    provider.connection as any,
    authority,
    NATIVE_MINT,
    to,
    false,
    "confirmed"
  );

  await sleep(1000);
  let auxAccount = Keypair.generate();

  let amount = 5_000 * LAMPORTS_PER_SOL; /* Wrapped SOL's decimals is 9 */

  let tx = new Transaction().add(
    // create token account
    SystemProgram.createAccount({
      fromPubkey: authority.publicKey,
      newAccountPubkey: auxAccount.publicKey,
      space: ACCOUNT_SIZE,
      lamports:
        (await getMinimumBalanceForRentExemptAccount(provider.connection)) +
        amount, // rent + amount
      programId: TOKEN_PROGRAM_ID,
    }),
    // init token account
    createInitializeAccountInstruction(
      auxAccount.publicKey,
      NATIVE_MINT,
      authority.publicKey
    ),
    // transfer WSOL
    createTransferInstruction(
      auxAccount.publicKey,
      toAta.address,
      authority.publicKey,
      amount
    ),
    // close aux account
    createCloseAccountInstruction(
      auxAccount.publicKey,
      authority.publicKey,
      authority.publicKey
    )
  );

  console.log(
    `SOL -> WSOL txhash: ${await sendAndConfirmTransaction(
      provider.connection as any,
      tx,
      [authority, auxAccount, authority]
    )}`
  );
};

const _createMintTo = async (
  connection: Connection,
  authority: Keypair,
  to: PublicKey
): Promise<PublicKey> => {
  const mint = await createMint(
    connection,
    authority,
    authority.publicKey,
    null,
    9,
    undefined,
    {
      commitment: "confirmed",
    }
  );

  const toAta = await createAssociatedTokenAccount(
    connection,
    authority,
    mint,
    to,
    {
      commitment: "confirmed",
    }
  );

  const mintAmount = 1_000_000 * LAMPORTS_PER_SOL;
  await mintTo(
    connection,
    authority,
    mint,
    toAta,
    authority.publicKey,
    mintAmount,
    undefined,
    {
      commitment: "confirmed",
    }
  );

  return mint;
};

const _mintTo = async (
  connection: Connection,
  authority: Keypair,
  to: PublicKey,
  mint: PublicKey,
  amount: number
): Promise<PublicKey> => {
  const toAta = await getOrCreateAssociatedTokenAccount(
    connection,
    authority,
    mint,
    to,
    false,
    "confirmed"
  );
  await sleep(1000);

  const mintAmount = amount * LAMPORTS_PER_SOL;
  console.log("minting...", {
    mint: mint.toBase58(),
    amount: mintAmount,
    to: toAta.address.toBase58(),
  });
  await mintTo(
    connection,
    authority,
    mint,
    toAta.address,
    authority.publicKey,
    mintAmount,
    undefined,
    {
      commitment: "confirmed",
    }
  );
  return mint;
};

const _mintTo3 = async (
  connection: Connection,
  payer: Keypair,
  mint: PublicKey,
  amount: number
): Promise<PublicKey> => {
  const toAta = getAssociatedTokenAddressSync(mint, payer.publicKey);

  await mintTo(
    connection,
    payer,
    mint,
    toAta,
    payer.publicKey,
    amount,
    undefined,
    {
      commitment: "confirmed",
    }
  );

  return mint;
};

const createPool = async (
  raydium: Raydium,
  mintA: string,
  mintB: string,
  dumpMainnet: boolean = false
) => {
  // const raydium = await initSdk({ loadToken: true });
  // you can call sdk api to get mint info or paste mint info from api: https://api-v3.raydium.io/mint/list
  const mint1 = await raydium.token.getTokenInfo(mintA);
  const mint2 = await raydium.token.getTokenInfo(mintB);
  let clmmConfigs;
  let programId;
  if (dumpMainnet) {
    clmmConfigs = await raydium.api.getClmmConfigs();
    programId = new PublicKey(CLMM_PROGRAM_ID);
  } else {
    programId = new PublicKey(CLMM_PROGRAM_ID_DEVNET);
    clmmConfigs = devConfigs; // devnet configs
  }
  console.log("clmmConfigs", clmmConfigs[0]);
  const createPoolTx = await raydium.clmm.createPool({
    programId,
    mint1,
    mint2,
    ammConfig: {
      ...clmmConfigs[0],
      id: new PublicKey(clmmConfigs[0].id),
      fundOwner: "",
      description: "",
    },
    initialPrice: new Decimal(1),
    txVersion,
  });
  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const poolId = createPoolTx.extInfo.mockPoolInfo.id;
  console.log("poolId... ", poolId);

  try {
    const { txId } = await createPoolTx.execute({ sendAndConfirm: true });
    console.log("clmm pool created:", {
      txId: `https://explorer.solana.com/tx/${txId}`,
    });
    return poolId;
  } catch (e) {
    console.error("createPool error", e);
    return poolId;
  }
};

const getMinimumBalanceForRentExemptAccount = async (
  connection: anchor.web3.Connection
): Promise<number> => {
  return await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);
};

const buildOptimalTransaction = async (
  connection: Connection,
  instructions: Array<TransactionInstruction>,
  signer: Signer,
  lookupTables: Array<AddressLookupTableAccount>
) => {
  const [microLamports, units, recentBlockhash] = await Promise.all([
    100 /* Get optimal priority fees - https://solana.com/developers/guides/advanced/how-to-use-priority-fees*/,
    getSimulationComputeUnits(
      connection as any, // Cast to any to bypass type checking between different versions
      instructions,
      signer.publicKey,
      lookupTables
    ),
    connection.getLatestBlockhash(),
  ]);

  instructions.unshift(
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports })
  );
  if (units) {
    // probably should add some margin of error to units
    instructions.unshift(ComputeBudgetProgram.setComputeUnitLimit({ units }));
  }
  return {
    transaction: new VersionedTransaction(
      new TransactionMessage({
        instructions,
        recentBlockhash: recentBlockhash.blockhash,
        payerKey: signer.publicKey,
      }).compileToV0Message(lookupTables)
    ),
    recentBlockhash,
  };
};

run();
