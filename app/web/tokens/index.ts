import {
  Commitment,
  ConfirmOptions,
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import {
  Account,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  TokenAccountNotFoundError,
  TokenInvalidAccountOwnerError,
  TokenInvalidMintError,
  TokenInvalidOwnerError,
  createAssociatedTokenAccountInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

export const getTokens = () => {
  if (process.env.ENV == "devnet") {
    return {
      USDC: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
      token0: new PublicKey("6f6oRyiWZygx1Acs5N5UNjz4gxeVuHecPvkYaerJM4XP"),
      token1: new PublicKey("8jPySmXB3Yt41AkTyLQW3JDvu2uL7GSX2sfsofTkHwvp"),
    };
  } else {
    return {
      USDC: new PublicKey("HahodTH8xKs75YGSmoRfafZgSFc8ETQrkJ4m2Riu5nh5"),
      token0: new PublicKey("3HuUDVWtrnREWQ4cJe73zQtzmGFcUvXoQ9muW9hUJYiy"),
      token1: new PublicKey("38PUGotm6MA39BU3aVRNB5VufUa9ktmiXTbRWx1A7aQJ"),
    };
  }
};

export async function getAccountOrCreateAssociatedTokenAccountTx(
  connection: Connection,
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  commitment?: Commitment,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<{ account?: Account; transaction?: Transaction }> {
  const associatedToken = getAssociatedTokenAddressSync(
    mint,
    owner,
    allowOwnerOffCurve,
    programId,
    associatedTokenProgramId
  );

  // This is the optimal logic, considering TX fee, client-side computation, RPC roundtrips and guaranteed idempotent.
  // Sadly we can't do this atomically.
  let account: Account;
  let transaction: Transaction;
  try {
    account = await getAccount(
      connection,
      associatedToken,
      commitment,
      programId
    );
  } catch (error: unknown) {
    // TokenAccountNotFoundError can be possible if the associated address has already received some lamports,
    // becoming a system account. Assuming program derived addressing is safe, this is the only case for the
    // TokenInvalidAccountOwnerError in this code path.
    if (
      error instanceof TokenAccountNotFoundError ||
      error instanceof TokenInvalidAccountOwnerError
    ) {
      // As this isn't atomic, it's possible others can create associated accounts meanwhile.
      try {
        transaction = new Transaction().add(
          createAssociatedTokenAccountInstruction(
            owner,
            associatedToken,
            owner,
            mint,
            programId,
            associatedTokenProgramId
          )
        );
      } catch (error: unknown) {
        // Ignore all errors; for now there is no API-compatible way to selectively ignore the expected
        // instruction error if the associated account exists already.
      }

      // Now this should always succeed
      account = await getAccount(
        connection,
        associatedToken,
        commitment,
        programId
      );
    } else {
      throw error;
    }
  }

  if (!account.mint.equals(mint)) throw new TokenInvalidMintError();
  if (!account.owner.equals(owner)) throw new TokenInvalidOwnerError();

  return { account, transaction };
}
