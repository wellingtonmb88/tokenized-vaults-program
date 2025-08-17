import {
  CLMM_PROGRAM_ID,
  DEVNET_PROGRAM_ID,
  parseTokenAccountResp,
  POOL_TICK_ARRAY_BITMAP_SEED,
} from "@raydium-io/raydium-sdk-v2";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { web3 } from "@coral-xyz/anchor";
import { confirmTransaction } from "@solana-developers/helpers";
import { TOKEN_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/utils/token";
import {
  ACCOUNT_SIZE,
  createCloseAccountInstruction,
  createInitializeAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptAccount,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  NATIVE_MINT,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";

const VALID_PROGRAM_ID = new Set([
  CLMM_PROGRAM_ID.toBase58(),
  DEVNET_PROGRAM_ID.CLMM_PROGRAM_ID.toBase58(),
]);

export const isValidClmm = (id: string) => VALID_PROGRAM_ID.has(id);

export const printSimulateInfo = () => {
  console.log(
    "you can paste simulate tx string here: https://explorer.solana.com/tx/inspector and click simulate to check transaction status"
  );
  console.log(
    "if tx simulate successful but did not went through successfully after running execute(xxx), usually means your txs were expired, try set up higher priority fees"
  );
  console.log(
    "strongly suggest use paid rpcs would get you better performance"
  );
};

export const airdrop = async (
  connection: anchor.web3.Connection,
  address: PublicKey,
  amount = 100 /** max testnet/devnet 100 SOL */ * LAMPORTS_PER_SOL
) => {
  if (process.env.ENV === "devnet") {
    return;
  }
  const signature = await connection.requestAirdrop(address, amount);
  const latestBlockhash = await connection.getLatestBlockhash();
  await connection.confirmTransaction(
    {
      signature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    },
    "confirmed"
  );
  // await connection.confirmTransaction(
  //   await connection.requestAirdrop(address, amount),
  //   "confirmed"
  // );
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getNftMetadataAddress = async (
  nftMint: PublicKey
): Promise<[PublicKey, number]> => {
  const [address, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),
      nftMint.toBuffer(),
    ],
    new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
  );
  return [address, bump];
};

export const getTickArrayBitmapAddress = async (
  pool: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> => {
  const [address, bump] = await PublicKey.findProgramAddress(
    [POOL_TICK_ARRAY_BITMAP_SEED, pool.toBuffer()],
    programId
  );
  return [address, bump];
};

// @note raydium uses that way https://github.com/raydium-io/raydium-cpi-example/blob/master/cpmm-cpi/tests/utils/pda.ts
// https://github.com/raydium-io/raydium-sdk-V2/blob/master/src/raydium/clmm/utils/pda.ts
export const i32ToBytes = (num: number) => {
  const arr = new ArrayBuffer(4);
  const view = new DataView(arr);
  view.setInt32(0, num, false);
  return new Uint8Array(arr);
};

export const u8ToBytes = (num: number) => {
  const arr = new ArrayBuffer(1);
  const view = new DataView(arr);
  view.setUint8(0, num);
  return new Uint8Array(arr);
};

export const createLookUpTable = async ({
  connection,
  payer,
  authority,
  addresses,
  reuseTable,
}: {
  connection: anchor.web3.Connection;
  payer: Keypair;
  authority: Keypair;
  addresses: PublicKey[];
  reuseTable?: PublicKey;
}) => {
  if (!reuseTable) {
    console.log("Creating new lookup table...");
    const slot = await connection.getSlot();
    const [lookupTableInst, lookupTableAddress] =
      anchor.web3.AddressLookupTableProgram.createLookupTable({
        authority: authority.publicKey,
        payer: payer.publicKey,
        recentSlot: slot - 1,
      });

    let blockhash = await connection
      .getLatestBlockhash()
      .then((res) => res.blockhash);

    const extendInstruction =
      anchor.web3.AddressLookupTableProgram.extendLookupTable({
        payer: payer.publicKey,
        authority: authority.publicKey,
        lookupTable: lookupTableAddress,
        addresses,
      });

    const messageV0 = new web3.TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions: [lookupTableInst, extendInstruction],
    }).compileToV0Message();

    const transaction = new web3.VersionedTransaction(messageV0);

    //// sign your transaction with the required `Signers`
    transaction.sign([payer]);

    const txId = await connection.sendTransaction(transaction, {
      skipPreflight: false,
      preflightCommitment: "finalized",
      // maxRetries: 3,
    });

    await confirmTransaction(connection as any, txId, "finalized");
    console.log(
      "LookUpTable",
      `https://explorer.solana.com/tx/${txId}?cluster=custom&customUrl=http://localhost:8899`
    );
    console.log();

    console.log(
      "Created lookup table with address:",
      lookupTableAddress.toBase58()
    );
    console.log();
    await sleep(1000);
    const lookupTableAccount = (
      await connection.getAddressLookupTable(lookupTableAddress, {
        commitment: "confirmed",
      })
    ).value;

    if (!lookupTableAccount) {
      throw new Error("Failed to fetch lookup table account after creation");
    }

    return { lookupTableAddress, lookupTableAccount };
  } else {
    const lookupTableAccount = (
      await connection.getAddressLookupTable(reuseTable, {
        commitment: "confirmed",
      })
    ).value;

    return { reuseTable, lookupTableAccount };
  }
};

export const createLookUpTableIx = async ({
  connection,
  payer,
  authority,
  addresses,
  reuseTable,
}: {
  connection: anchor.web3.Connection;
  payer: PublicKey;
  authority: PublicKey;
  addresses: PublicKey[];
  reuseTable?: PublicKey;
}) => {
  if (!reuseTable) {
    const slot = await connection.getSlot();
    const [lookupTableInst, lookupTableAddress] =
      anchor.web3.AddressLookupTableProgram.createLookupTable({
        authority: authority,
        payer: payer,
        recentSlot: slot - 1,
      });

    console.log(
      "\n Created lookup table with address:",
      lookupTableAddress.toBase58()
    );
    console.log();

    // let blockhash = await connection
    //   .getLatestBlockhash()
    //   .then((res) => res.blockhash);

    const extendInstruction =
      anchor.web3.AddressLookupTableProgram.extendLookupTable({
        payer: payer,
        authority: authority,
        lookupTable: lookupTableAddress,
        addresses,
      });

    // const messageV0 = new web3.TransactionMessage({
    //   payerKey: payer.publicKey,
    //   recentBlockhash: blockhash,
    //   instructions: [lookupTableInst, extendInstruction],
    // }).compileToV0Message();

    // const transaction = new web3.VersionedTransaction(messageV0);

    // //// sign your transaction with the required `Signers`
    // transaction.sign([payer]);

    // const txId = await connection.sendTransaction(transaction, {
    //   skipPreflight: false,
    //   preflightCommitment: "finalized",
    // });

    // await confirmTransaction(connection as any, txId, "finalized");
    // await sleep(1000);
    // console.log();
    // console.log(
    //   "LookUpTable",
    //   `https://explorer.solana.com/tx/${txId}?cluster=custom&customUrl=http://localhost:8899`
    // );
    // console.log();

    // const lookupTableAccount = (
    //   await connection.getAddressLookupTable(lookupTableAddress, {
    //     commitment: "confirmed",
    //   })
    // ).value;

    return {
      lookupTableAddress,
      instructions: [lookupTableInst, extendInstruction],
    };
  } else {
    const lookupTableAccount = (
      await connection.getAddressLookupTable(reuseTable, {
        commitment: "confirmed",
      })
    ).value;

    return { reuseTable, lookupTableAccount };
  }
};

export const wrapSol = async ({
  connection,
  payer,
  owner,
  amount,
}: {
  connection: anchor.web3.Connection;
  payer: Keypair;
  owner: Keypair;
  amount: number;
}): Promise<PublicKey> => {
  const ata = await getOrCreateAssociatedTokenAccount(
    connection as any,
    owner,
    NATIVE_MINT,
    owner.publicKey,
    false,
    "processed"
  );
  let auxAccount = Keypair.generate();
  const rent = await getMinimumBalanceForRentExemptAccount(connection as any);
  const amountLamports = amount * 1e9;
  console.log(`\n Rent: ${rent} / Amount: ${amountLamports} \n`);

  let tx = new Transaction().add(
    // create token account
    SystemProgram.createAccount({
      fromPubkey: owner.publicKey,
      newAccountPubkey: auxAccount.publicKey,
      space: ACCOUNT_SIZE,
      lamports: rent + amountLamports, // rent + amount
      programId: TOKEN_PROGRAM_ID,
    }),
    // init token account
    createInitializeAccountInstruction(
      auxAccount.publicKey,
      NATIVE_MINT,
      owner.publicKey
    ),
    // transfer WSOL
    createTransferInstruction(
      auxAccount.publicKey,
      ata.address,
      owner.publicKey,
      amountLamports
    ),
    // close aux account
    createCloseAccountInstruction(
      auxAccount.publicKey,
      owner.publicKey,
      owner.publicKey
    )
  );
  console.log(
    `\n Token: ${NATIVE_MINT.toBase58()} / ATA: ${ata.address.toBase58()}`
  );

  console.log(
    `SOL -> WSOL txhash: ${await sendAndConfirmTransaction(
      connection as any,
      tx,
      [owner, auxAccount, owner]
    )}`
  );
  return ata.address;
};

export const transferToTokenAccount = async ({
  connection,
  owner,
  mint,
  destination,
  amount,
}: {
  connection: anchor.web3.Connection;
  owner: Keypair;
  mint: PublicKey;
  destination: PublicKey;
  amount: number;
}) => {
  // Get the owner's associated token account for the mint (source)
  const sourceAta = await getAssociatedTokenAddress(mint, owner.publicKey);
  console.log(
    `\n Token: ${mint.toBase58()} / Source ATA: ${sourceAta.toBase58()}`
  );

  let tx = new Transaction().add(
    // transfer
    createTransferInstruction(sourceAta, destination, owner.publicKey, amount)
  );

  console.log(
    `Transfer Token ${mint.toBase58()} txhash: ${await sendAndConfirmTransaction(
      connection as any,
      tx,
      [owner]
    )}\n`
  );
};

export const transferToken = async ({
  connection,
  owner,
  mint,
  destination,
  amount,
}: {
  connection: anchor.web3.Connection;
  owner: Keypair;
  mint: PublicKey;
  destination: PublicKey;
  amount: number;
}) => {
  // Get the owner's associated token account for the mint (source)
  // const sourceAta = await getAssociatedTokenAddress(mint, owner.publicKey);
  const sourceAta = await getOrCreateAssociatedTokenAccount(
    connection as any,
    owner,
    mint,
    owner.publicKey,
    false,
    "confirmed",
    { skipPreflight: false },
    TOKEN_PROGRAM_ID
  );
  console.log(
    `\n Token: ${mint.toBase58()} / Source ATA: ${sourceAta.address.toBase58()}`
  );

  let tx = new Transaction().add(
    // transfer
    createTransferInstruction(
      sourceAta.address,
      destination,
      owner.publicKey,
      amount
    )
  );

  console.log(
    `Transfer Token ${mint.toBase58()} txhash: ${await sendAndConfirmTransaction(
      connection as any,
      tx,
      [owner]
    )}\n`
  );
};

export const getTokenBalanceForOwner = async (
  connection: anchor.web3.Connection,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve?: boolean
) => {
  try {
    // Get the associated token account address
    const ata = await getAssociatedTokenAddress(
      mint,
      owner,
      allowOwnerOffCurve
    );

    // Get the balance
    const balance = await connection.getTokenAccountBalance(owner);
    return {
      ata: owner.toBase58(),
      amount: balance.value.amount,
      decimals: balance.value.decimals,
      uiAmount: balance.value.uiAmount,
      uiAmountString: balance.value.uiAmountString,
    };
  } catch (error) {
    console.error("Error getting token balance:", error);
    return null;
  }
};

export const fetchTokenAccountData = async (
  connection: anchor.web3.Connection,
  owner: Keypair
) => {
  const solAccountResp = await connection.getAccountInfo(owner.publicKey);
  const tokenAccountResp = await connection.getTokenAccountsByOwner(
    owner.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );
  const token2022Req = await connection.getTokenAccountsByOwner(
    owner.publicKey,
    { programId: TOKEN_2022_PROGRAM_ID }
  );
  const tokenAccountData = parseTokenAccountResp({
    owner: owner.publicKey,
    solAccountResp,
    tokenAccountResp: {
      context: tokenAccountResp.context,
      value: [...tokenAccountResp.value, ...token2022Req.value],
    },
  });
  return tokenAccountData;
};

export const customMintToWithATA = async (
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
  const tx = await mintTo(
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
  console.log("mintTo tx:", tx);
  return mint;
};
