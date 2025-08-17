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
import {
  _masterWallet,
  _creatorWallet,
  devConfigs,
  initSdk,
  txVersion,
  connection,
  setupDotEnv,
} from "./config";
import { ClmmConfigInfo, Raydium } from "@raydium-io/raydium-sdk-v2";
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
import { airdrop, customMintToWithATA, sleep } from "./utils";
import { CLMM_PROGRAM_ID, TokenA, TokenB, USDC } from "./constants";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";

setupDotEnv();

let masterWallet: Keypair;
let creatorWallet: Keypair;
let raydium: Raydium;

let provider;

const run = async () => {
  masterWallet = _masterWallet;
  creatorWallet = _creatorWallet;

  provider = new AnchorProvider(
    connection as any,
    new Wallet(masterWallet as any),
    {
      commitment: "confirmed",
    }
  );
  anchor.setProvider(provider);

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

  // const { mintA, mintB } = await _createMints({
  //   authority: masterWallet,
  //   to: masterWallet.publicKey,
  // });

  // await _createWSOLMints({
  //   authority: masterWallet,
  //   to: masterWallet.publicKey,
  // });
  // await _createWSOLMints({
  //   authority: masterWallet,
  //   to: creatorWallet.publicKey,
  // });

  console.log("\nMinting token A", TokenA.toBase58());
  await customMintToWithATA(
    provider.connection as any,
    masterWallet,
    masterWallet.publicKey,
    TokenA,
    1000_000
  );
  await customMintToWithATA(
    provider.connection as any,
    masterWallet,
    creatorWallet.publicKey,
    TokenA,
    1000_000
  );

  console.log("\nMinting token B", TokenB.toBase58());
  await customMintToWithATA(
    provider.connection as any,
    masterWallet,
    masterWallet.publicKey,
    TokenB,
    1000_000
  );
  await customMintToWithATA(
    provider.connection as any,
    masterWallet,
    creatorWallet.publicKey,
    TokenB,
    1000_000
  );

  const tokenArray = [TokenA, TokenB];
  tokenArray.sort((a, b) => {
    const bufferA = a.toBuffer();
    const bufferB = b.toBuffer();
    return Buffer.compare(bufferA, bufferB);
  });

  const sortedMint0 = tokenArray[0];
  const sortedMint1 = tokenArray[1];

  if (process.env.ENV !== "devnet") {
    // console.log("\nMinting token USDC", USDC.toBase58());
    await customMintToWithATA(
      provider.connection as any,
      masterWallet,
      masterWallet.publicKey,
      USDC,
      100_000
    );
    await customMintToWithATA(
      provider.connection as any,
      masterWallet,
      creatorWallet.publicKey,
      USDC,
      100_000
    );

    const poolIdA = await createPool(
      raydium,
      USDC.toBase58(),
      sortedMint0.toBase58()
    ); // USDC - mintA

    const poolIdB = await createPool(
      raydium,
      USDC.toBase58(),
      sortedMint1.toBase58()
    ); //// USDC - mintB

    const poolIdC = await createPool(
      raydium,
      sortedMint0.toBase58(),
      sortedMint1.toBase58()
    ); //// mintA - mintB

    console.log("Creating position for Pool ");
    const inputAmount = 50000; // MintA amount
    await createPosition(raydium, poolIdA, inputAmount).catch(console.error);
    await createPosition(raydium, poolIdB, inputAmount).catch(console.error);
    await createPosition(raydium, poolIdC, inputAmount).catch(console.error);
    // await createPosition(raydium, "CTBsu4QkD6XpCfQMbkTXfYRXu6tmT8K1J9nUFbHdsL4c", inputAmount).catch(console.error);
    // await createPosition(raydium, "BYsxZtgTDuq3ACvQSoDwVXzoCc4NEyc6JZYc4PMLEGrC", inputAmount).catch(console.error);
    // await createPosition(
    //   raydium,
    //   "6WZxvb9wgVGWf8QqT5mYErvB5wR2Kz17JLn45WCMTm5P",
    //   inputAmount
    // ).catch(console.error);
  } else {
    const inputAmount = 5; // MintA amount
    await createPosition(
      raydium,
      "Fm4ByxNKoPcVbm37hKzVcNfuDpfMzcsjt58KstSc6vdU",
      inputAmount
    ).catch(console.error);
    await createPosition(
      raydium,
      "71XkvPSrY4g4gQU2afowkbEkAFLKeicDTr5hXAA9h8Dh",
      inputAmount
    ).catch(console.error);
  }
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

  let amount = 10 * LAMPORTS_PER_SOL; /* Wrapped SOL's decimals is 9 */

  console.log(`Creating WSOL mint for ${to.toBase58()}`);
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

const createPool = async (raydium: Raydium, mintA: string, mintB: string) => {
  // const raydium = await initSdk({ loadToken: true });
  // you can call sdk api to get mint info or paste mint info from api: https://api-v3.raydium.io/mint/list

  const tokenArray = [new PublicKey(mintA), new PublicKey(mintB)];
  tokenArray.sort((a, b) => {
    const bufferA = a.toBuffer();
    const bufferB = b.toBuffer();
    return Buffer.compare(bufferA, bufferB);
  });

  const sortedMint0 = tokenArray[0];
  const sortedMint1 = tokenArray[1];
  const mint1 = await raydium.token.getTokenInfo(sortedMint0);
  const mint2 = await raydium.token.getTokenInfo(sortedMint1);

  let clmmConfigs;
  const programId = new PublicKey(CLMM_PROGRAM_ID);
  if (process.env.ENV !== "devnet") {
    clmmConfigs = await raydium.api.getClmmConfigs();
  } else {
    clmmConfigs = devConfigs; // devnet configs
  }
  // console.log("clmmConfigs", clmmConfigs);
  const createPoolTx = await raydium.clmm.createPool({
    programId,
    mint1,
    mint2,
    ammConfig: {
      ...clmmConfigs[0],
      id: new PublicKey(clmmConfigs[0].id),
      fundOwner: "",
      description: "",
    } as ClmmConfigInfo,
    initialPrice: new Decimal(1),
    txVersion,
  });
  // don't want to wait confirm, set sendAndConfirm to false or don't pass any params to execute
  const poolId = createPoolTx.extInfo.address.id;
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
