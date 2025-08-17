import { Raydium, TxVersion } from "@raydium-io/raydium-sdk-v2";
import { Connection, Keypair, PublicKey, clusterApiUrl } from "@solana/web3.js";
import dotenv from "dotenv";
import bs58 from "bs58";
import fs from "fs";
import path from "path";

export const setupDotEnv = () => {
  dotenv.config({
    path: path.resolve(
      __dirname,
      process.env.ENV == "devnet"
        ? "../.env.test.devnet"
        : "../.env.test.localnet"
    ),
  });
};

setupDotEnv();

const secretKeyPath = path.resolve(__dirname, process.env.MASTER_WALLET);
const secretKey = JSON.parse(fs.readFileSync(secretKeyPath, "utf-8"));

export const _masterWallet: Keypair = Keypair.fromSecretKey(
  Uint8Array.from(secretKey)
);

const _secretKeyPath = path.resolve(__dirname, process.env.CREATOR_WALLET);
const _secretKey = JSON.parse(fs.readFileSync(_secretKeyPath, "utf-8"));

export const _creatorWallet: Keypair = Keypair.fromSecretKey(
  Uint8Array.from(_secretKey)
);

export const connection = new Connection(process.env.ANCHOR_PROVIDER_URL);
export const txVersion = TxVersion.V0; // or TxVersion.LEGACY
const cluster = "devnet"; // 'mainnet' | 'devnet'

let raydium: Raydium | undefined;
export const initSdk = async (params?: {
  owner?: Keypair;
  loadToken?: boolean;
}) => {
  if (raydium) return raydium;
  if (connection.rpcEndpoint === clusterApiUrl("mainnet-beta"))
    console.warn(
      "using free rpc node might cause unexpected error, strongly suggest uses paid rpc node"
    );

  let owner = _masterWallet;
  // if (params?.owner) {
  //   owner = params.owner;
  // }
  console.log(
    `connect to rpc ${
      connection.rpcEndpoint
    } in ${cluster} : owner ${bs58.encode(owner.publicKey.toBuffer())}`
  );
  raydium = await Raydium.load({
    owner: owner as any,
    connection: connection as any,
    cluster,
    urlConfigs: {
      BASE_HOST: process.env.RAYDIUM_API,
    },
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: "finalized",
  });
  return raydium;
};

export const initSdkWithoutOwner = async (params?: { loadToken?: boolean }) => {
  if (raydium) return raydium;
  if (connection.rpcEndpoint === clusterApiUrl("mainnet-beta")) {
    console.warn(
      "using free rpc node might cause unexpected error, strongly suggest uses paid rpc node"
    );
  }

  console.log(`connect to rpc ${connection.rpcEndpoint} in ${cluster} `);
  raydium = await Raydium.load({
    connection: connection as any,
    cluster,
    urlConfigs: {
      BASE_HOST: process.env.RAYDIUM_API,
    },
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: "finalized",
  });
  return raydium;
};

export const devConfigs = [
  {
    id: new PublicKey("CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG"),
    index: 0,
    protocolFeeRate: 120000,
    tradeFeeRate: 100,
    tickSpacing: 10,
    fundFeeRate: 40000,
    description: "Best for very stable pairs",
    defaultRange: 0.005,
    defaultRangePoint: [0.001, 0.003, 0.005, 0.008, 0.01],
  },
];
