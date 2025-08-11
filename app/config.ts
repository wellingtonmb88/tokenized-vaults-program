import { Raydium, TxVersion } from "@raydium-io/raydium-sdk-v2";
import { Connection, Keypair, clusterApiUrl } from "@solana/web3.js";
import bs58 from "bs58";
import fs from "fs";
import path from "path";

const secretKeyPath = path.resolve(
  __dirname,
  "../tests/fixtures/wallet/Fpyrsw2o2vCh73ggvJY9QdWfYouhzCs27TwTgxkHFA9n.json"
);
const secretKey = JSON.parse(fs.readFileSync(secretKeyPath, "utf-8"));

export const _masterWallet: Keypair = Keypair.fromSecretKey(
  Uint8Array.from(secretKey)
);

const _secretKeyPath = path.resolve(
  __dirname,
  "../tests/fixtures/wallet/CrtNgYZaY74eqADuHxCYbQNsh33dBrAbkr71N7YSDoqE.json"
);
const _secretKey = JSON.parse(fs.readFileSync(_secretKeyPath, "utf-8"));

export const _creatorWallet: Keypair = Keypair.fromSecretKey(
  Uint8Array.from(_secretKey)
);

// export const connection = new Connection(clusterApiUrl("devnet")); //<YOUR_RPC_URL>
export const connection = new Connection("http://0.0.0.0:8899"); //<YOUR_RPC_URL>
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
  if (params?.owner) {
    owner = params.owner;
  }
  console.log(
    `connect to rpc ${
      connection.rpcEndpoint
    } in ${cluster} : owner ${bs58.encode(owner.publicKey.toBuffer())}`
  );
  raydium = await Raydium.load({
    owner: owner as any,
    connection: connection as any,
    cluster,
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
    disableFeatureCheck: true,
    disableLoadToken: !params?.loadToken,
    blockhashCommitment: "finalized",
  });
  return raydium;
};

export const grpcUrl = "<YOUR_GRPC_URL>";
export const grpcToken = "<YOUR_GRPC_TOKEN>";

export const devConfigs = [
  {
    id: "CQYbhr6amxUER4p5SC44C63R4qw4NFc9Z4Db9vF4tZwG",
    index: 0,
    protocolFeeRate: 120000,
    tradeFeeRate: 100,
    tickSpacing: 10,
    fundFeeRate: 40000,
    description: "Best for very stable pairs",
    defaultRange: 0.005,
    defaultRangePoint: [0.001, 0.003, 0.005, 0.008, 0.01],
  },
  {
    id: "B9H7TR8PSjJT7nuW2tuPkFC63z7drtMZ4LoCtD7PrCN1",
    index: 1,
    protocolFeeRate: 120000,
    tradeFeeRate: 2500,
    tickSpacing: 60,
    fundFeeRate: 40000,
    description: "Best for most pairs",
    defaultRange: 0.1,
    defaultRangePoint: [0.01, 0.05, 0.1, 0.2, 0.5],
  },
  {
    id: "GjLEiquek1Nc2YjcBhufUGFRkaqW1JhaGjsdFd8mys38",
    index: 3,
    protocolFeeRate: 120000,
    tradeFeeRate: 10000,
    tickSpacing: 120,
    fundFeeRate: 40000,
    description: "Best for exotic pairs",
    defaultRange: 0.1,
    defaultRangePoint: [0.01, 0.05, 0.1, 0.2, 0.5],
  },
  {
    id: "GVSwm4smQBYcgAJU7qjFHLQBHTc4AdB3F2HbZp6KqKof",
    index: 2,
    protocolFeeRate: 120000,
    tradeFeeRate: 500,
    tickSpacing: 10,
    fundFeeRate: 40000,
    description: "Best for tighter ranges",
    defaultRange: 0.1,
    defaultRangePoint: [0.01, 0.05, 0.1, 0.2, 0.5],
  },
];
