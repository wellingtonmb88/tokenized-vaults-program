import { Keypair, PublicKey } from "@solana/web3.js";
import {
  ApiV3PoolInfoConcentratedItem,
  Raydium,
  TickUtils,
} from "@raydium-io/raydium-sdk-v2";

import {
  getNftMetadataAddress,
  getTickArrayBitmapAddress,
  i32ToBytes,
} from "./utils";
import { getTokens } from "./web/tokens";
import { CLMM_PROGRAM_ID } from "./constants";

export const raydiumAmmConfig = () => {
  if (process.env.ENV == "devnet") {
    return new PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG");
  } else {
    return new PublicKey("9iFER3bpjf1PTTCQCfTRu17EJgvsxo9pVyA9QWwEuX4x");
  }
};

export const raydiumPools = ({
  ammConfig,
  mint0,
  mint1,
}: {
  ammConfig: PublicKey;
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
  const [poolStateMint0WithMint1] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      ammConfig.toBuffer(),
      sortedMint0.toBuffer(),
      sortedMint1.toBuffer(),
    ],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  return {
    mint0: sortedMint0,
    mint1: sortedMint1,
    poolStateMint0WithMint1,
  };
};

export const raydiumTokenVaults = ({
  ammConfig,
  mint0: _mint0,
  mint1: _mint1,
}: {
  ammConfig: PublicKey;
  mint0: PublicKey;
  mint1: PublicKey;
}) => {
  const { USDC } = getTokens();

  const { mint0, mint1, poolStateMint0WithMint1 } = raydiumPools({
    ammConfig,
    mint0: _mint0,
    mint1: _mint1,
  });

  const { poolStateMint0WithMint1: poolStateUSDCWithMint0 } = raydiumPools({
    ammConfig,
    mint0: USDC,
    mint1: mint0,
  });

  const { poolStateMint0WithMint1: poolStateUSDCWithMint1 } = raydiumPools({
    ammConfig,
    mint0: USDC,
    mint1: mint1,
  });

  const [usdcWithMint0VaultInput] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_vault"),
      poolStateUSDCWithMint0.toBuffer(),
      USDC.toBuffer(),
    ],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [usdcWithMint1VaultInput] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_vault"),
      poolStateUSDCWithMint1.toBuffer(),
      USDC.toBuffer(),
    ],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [usdcWithMint0VaultOutput] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_vault"),
      poolStateUSDCWithMint0.toBuffer(),
      mint0.toBuffer(),
    ],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [usdcWithMint1VaultOutput] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_vault"),
      poolStateUSDCWithMint1.toBuffer(),
      mint1.toBuffer(),
    ],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [openPositionTokenVault0] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_vault"),
      poolStateMint0WithMint1.toBuffer(),
      mint0.toBuffer(),
    ],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [openPositionTokenVault1] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool_vault"),
      poolStateMint0WithMint1.toBuffer(),
      mint1.toBuffer(),
    ],
    new PublicKey(CLMM_PROGRAM_ID)
  );
  return {
    usdcWithMint0VaultInput,
    usdcWithMint1VaultInput,
    usdcWithMint0VaultOutput,
    usdcWithMint1VaultOutput,
    openPositionTokenVault0,
    openPositionTokenVault1,
  };
};

export const raydiumPDAs = async ({
  ammConfig,
  raydium,
  nft = new Keypair().publicKey,
  tickLower = -194221,
  tickUpper = 7940,
  mint0: _mint0,
  mint1: _mint1,
}: {
  ammConfig: PublicKey;
  raydium: Raydium;
  nft?: PublicKey;
  tickLower?: number;
  tickUpper?: number;
  mint0: PublicKey;
  mint1: PublicKey;
}) => {
  const { USDC } = getTokens();

  const { mint0, mint1, poolStateMint0WithMint1 } = raydiumPools({
    ammConfig,
    mint0: _mint0,
    mint1: _mint1,
  });

  const { poolStateMint0WithMint1: poolStateUSDCWithMint0 } = raydiumPools({
    ammConfig,
    mint0: USDC,
    mint1: mint0,
  });

  const { poolStateMint0WithMint1: poolStateUSDCWithMint1 } = raydiumPools({
    ammConfig,
    mint0: USDC,
    mint1: mint1,
  });

  const {
    openPositionTokenVault0,
    openPositionTokenVault1,
    usdcWithMint0VaultInput,
    usdcWithMint1VaultInput,
    usdcWithMint0VaultOutput,
    usdcWithMint1VaultOutput,
  } = raydiumTokenVaults({
    ammConfig,
    mint0,
    mint1,
  });

  let poolInfo: ApiV3PoolInfoConcentratedItem;
  const data = await raydium.clmm.getPoolInfoFromRpc(
    poolStateMint0WithMint1.toBase58()
  );
  poolInfo = data.poolInfo;

  const [tickLowerArrayAddress, tickUpperArrayAddress] = [
    TickUtils.getTickArrayAddressByTick(
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
      tickLower,
      poolInfo.config.tickSpacing
    ),
    TickUtils.getTickArrayAddressByTick(
      new PublicKey(poolInfo.programId),
      new PublicKey(poolInfo.id),
      tickUpper,
      poolInfo.config.tickSpacing
    ),
  ];

  const tickArrayLowerStartIndex = TickUtils.getTickArrayStartIndexByTick(
    tickLower,
    poolInfo.config.tickSpacing
  );

  const tickArrayUpperStartIndex = TickUtils.getTickArrayStartIndexByTick(
    tickUpper,
    poolInfo.config.tickSpacing
  );

  const [bitmapExtMint0WithMint1, _bump111] = await getTickArrayBitmapAddress(
    poolStateMint0WithMint1,
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [bitmapExtUSDCWithMint0, _bump111A] = await getTickArrayBitmapAddress(
    poolStateUSDCWithMint0,
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [bitmapExtUSDCWithMint1, _bump111B] = await getTickArrayBitmapAddress(
    poolStateUSDCWithMint1,
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [personalPosition] = PublicKey.findProgramAddressSync(
    [Buffer.from("position"), nft.toBuffer()],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [protocolPosition] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("position"),
      poolStateMint0WithMint1.toBuffer(),
      i32ToBytes(tickLower),
      i32ToBytes(tickUpper),
    ],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const metadataAccount = (await getNftMetadataAddress(nft))[0];

  return {
    mint0,
    mint1,
    poolStateUSDCWithMint0,
    poolStateUSDCWithMint1,
    poolStateMint0WithMint1,
    tickLowerArrayAddress,
    tickUpperArrayAddress,
    tickArrayLowerStartIndex,
    tickArrayUpperStartIndex,
    bitmapExtMint0WithMint1,
    bitmapExtUSDCWithMint0,
    bitmapExtUSDCWithMint1,
    personalPosition,
    protocolPosition,
    openPositionTokenVault0,
    openPositionTokenVault1,
    usdcWithMint0VaultInput,
    usdcWithMint1VaultInput,
    usdcWithMint0VaultOutput,
    usdcWithMint1VaultOutput,
    metadataAccount,
  };
};

export const observationIds = async ({
  ammConfig,
  raydium,
  mint0,
  mint1,
}: {
  ammConfig: PublicKey;
  raydium: Raydium;
  mint0: PublicKey;
  mint1: PublicKey;
}) => {
  const { USDC } = getTokens();
  const { poolStateMint0WithMint1 } = raydiumPools({
    ammConfig,
    mint0,
    mint1,
  });

  const { poolStateMint0WithMint1: poolStateUSDCWithMint0 } = raydiumPools({
    ammConfig,
    mint0: USDC,
    mint1: mint0,
  });

  const { poolStateMint0WithMint1: poolStateUSDCWithMint1 } = raydiumPools({
    ammConfig,
    mint0: USDC,
    mint1: mint1,
  });

  const data = await raydium.clmm.getPoolInfoFromRpc(
    poolStateMint0WithMint1.toBase58()
  );
  const observationIdMint0WithMint1 = data.computePoolInfo.observationId;

  const dataA = await raydium.clmm.getPoolInfoFromRpc(
    poolStateUSDCWithMint0.toBase58()
  );
  const observationIdWSolWithMint0 = dataA.computePoolInfo.observationId;

  const dataB = await raydium.clmm.getPoolInfoFromRpc(
    poolStateUSDCWithMint1.toBase58()
  );
  const observationIdWSolWithMint1 = dataB.computePoolInfo.observationId;

  return {
    observationIdMint0WithMint1,
    observationIdWSolWithMint0,
    observationIdWSolWithMint1,
  };
};
