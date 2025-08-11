import { PublicKey } from "@solana/web3.js";
import {
  ApiV3PoolInfoConcentratedItem,
  Raydium,
  TickUtils,
} from "@raydium-io/raydium-sdk-v2";

import { NATIVE_MINT } from "@solana/spl-token";

import {
  getNftMetadataAddress,
  getTickArrayBitmapAddress,
  i32ToBytes,
} from "./utils";
import { CLMM_PROGRAM_ID } from "./constants";

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
  // tokenArray.sort(function (x, y) {
  //   const buffer1 = x.toBuffer();
  //   const buffer2 = y.toBuffer();

  //   for (let i = 0; i < buffer1.length && i < buffer2.length; i++) {
  //     if (buffer1[i] < buffer2[i]) {
  //       return -1;
  //     }
  //     if (buffer1[i] > buffer2[i]) {
  //       return 1;
  //     }
  //   }

  //   if (buffer1.length < buffer2.length) {
  //     return -1;
  //   }
  //   if (buffer1.length > buffer2.length) {
  //     return 1;
  //   }

  //   return 0;
  // });

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

  const [poolStateWSolWithMint0] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      ammConfig.toBuffer(),
      NATIVE_MINT.toBuffer(),
      sortedMint0.toBuffer(),
    ],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [poolStateWSolWithMint1] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("pool"),
      ammConfig.toBuffer(),
      NATIVE_MINT.toBuffer(),
      sortedMint1.toBuffer(),
    ],
    new PublicKey(CLMM_PROGRAM_ID)
  );

  return {
    mint0: sortedMint0,
    mint1: sortedMint1,
    poolStateMint0WithMint1,
    poolStateWSolWithMint0,
    poolStateWSolWithMint1,
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
  const {
    mint0,
    mint1,
    poolStateMint0WithMint1,
    poolStateWSolWithMint0,
    poolStateWSolWithMint1,
  } = raydiumPools({
    ammConfig,
    mint0: _mint0,
    mint1: _mint1,
  });

  // const [tokenVaultInput0] = PublicKey.findProgramAddressSync(
  //   [
  //     Buffer.from("pool_vault"),
  //     poolStateWSolWithMint0.toBuffer(),
  //     NATIVE_MINT.toBuffer(),
  //   ],
  //   new PublicKey(CLMM_PROGRAM_ID)
  // );

  // const [tokenVaultInput1] = PublicKey.findProgramAddressSync(
  //   [
  //     Buffer.from("pool_vault"),
  //     poolStateWSolWithMint1.toBuffer(),
  //     NATIVE_MINT.toBuffer(),
  //   ],
  //   new PublicKey(CLMM_PROGRAM_ID)
  // );

  // const [depositTokenVault0] = PublicKey.findProgramAddressSync(
  //   [Buffer.from("pool_vault"), poolWSolWithMint0.toBuffer(), mint0.toBuffer()],
  //   new PublicKey(CLMM_PROGRAM_ID)
  // );

  // const [depositTokenVault1] = PublicKey.findProgramAddressSync(
  //   [Buffer.from("pool_vault"), poolWSolWithMint1.toBuffer(), mint1.toBuffer()],
  //   new PublicKey(CLMM_PROGRAM_ID)
  // );

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
    // tokenVaultInput0,
    // tokenVaultInput1,
    // depositTokenVault0,
    // depositTokenVault1,
    openPositionTokenVault0,
    openPositionTokenVault1,
  };
};

export const raydiumPDAs = async ({
  ammConfig,
  raydium,
  nft,
  tickLower,
  tickUpper,
  mint0: _mint0,
  mint1: _mint1,
}: {
  ammConfig: PublicKey;
  raydium: Raydium;
  nft: PublicKey;
  tickLower: number;
  tickUpper: number;
  mint0: PublicKey;
  mint1: PublicKey;
}) => {
  const {
    mint0,
    mint1,
    poolStateWSolWithMint0,
    poolStateWSolWithMint1,
    poolStateMint0WithMint1,
  } = raydiumPools({
    ammConfig,
    mint0: _mint0,
    mint1: _mint1,
  });

  const { openPositionTokenVault0, openPositionTokenVault1 } =
    raydiumTokenVaults({
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

  const [bitmapExtension, _bump111] = await getTickArrayBitmapAddress(
    poolStateMint0WithMint1,
    new PublicKey(CLMM_PROGRAM_ID)
  );

  const [bitmapExtensionWSolWithMint0, _bump111A] =
    await getTickArrayBitmapAddress(
      poolStateWSolWithMint0,
      new PublicKey(CLMM_PROGRAM_ID)
    );

  const [bitmapExtensionWSolWithMint1, _bump111B] =
    await getTickArrayBitmapAddress(
      poolStateWSolWithMint1,
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
    poolStateWSolWithMint0,
    poolStateWSolWithMint1,
    poolStateMint0WithMint1,
    tickLowerArrayAddress,
    tickUpperArrayAddress,
    tickArrayLowerStartIndex,
    tickArrayUpperStartIndex,
    bitmapExtension,
    bitmapExtensionWSolWithMint0,
    bitmapExtensionWSolWithMint1,
    personalPosition,
    protocolPosition,
    openPositionTokenVault0,
    openPositionTokenVault1,
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
  const {
    poolStateMint0WithMint1,
    poolStateWSolWithMint0,
    poolStateWSolWithMint1,
  } = raydiumPools({
    ammConfig,
    mint0,
    mint1,
  });

  const data = await raydium.clmm.getPoolInfoFromRpc(
    poolStateMint0WithMint1.toBase58()
  );
  const observationIdMint0WithMint1 = data.computePoolInfo.observationId;

  const dataA = await raydium.clmm.getPoolInfoFromRpc(
    poolStateWSolWithMint0.toBase58()
  );
  const observationIdWSolWithMint0 = dataA.computePoolInfo.observationId;

  const dataB = await raydium.clmm.getPoolInfoFromRpc(
    poolStateWSolWithMint1.toBase58()
  );
  const observationIdWSolWithMint1 = dataB.computePoolInfo.observationId;

  return {
    observationIdMint0WithMint1,
    observationIdWSolWithMint0,
    observationIdWSolWithMint1,
  };
};
