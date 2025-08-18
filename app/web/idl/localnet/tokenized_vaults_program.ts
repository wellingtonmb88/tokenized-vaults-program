/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/tokenized_vaults_program.json`.
 */
export type TokenizedVaultsProgram = {
  "address": "9Vkq9WYEQVocQuPb4yuAQSfgxPwcmx9vsTmcbFcitz7X",
  "metadata": {
    "name": "tokenizedVaultsProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addLiquidityRaydiumVaultStrategy",
      "discriminator": [
        11
      ],
      "accounts": [
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultStrategyConfig",
          "writable": true
        },
        {
          "name": "vaultStrategy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  116,
                  114,
                  116,
                  103,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              },
              {
                "kind": "account",
                "path": "raydiumVault0Mint"
              },
              {
                "kind": "account",
                "path": "raydiumVault1Mint"
              },
              {
                "kind": "arg",
                "path": "strategyId"
              }
            ]
          }
        },
        {
          "name": "investReserveVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  95,
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "investorStrategyPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  95,
                  115,
                  116,
                  114,
                  116,
                  103,
                  95,
                  112,
                  111,
                  115,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategy"
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint0Escrow",
          "docs": [
            "The escrow account for the token 0",
            "Vault strategy Config receives token 0 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  119,
                  97,
                  112,
                  95,
                  114,
                  97,
                  116,
                  105,
                  111,
                  95,
                  48,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint1Escrow",
          "docs": [
            "The escrow account for the token 1",
            "Vault strategy Config receives token 1 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  119,
                  97,
                  112,
                  95,
                  114,
                  97,
                  116,
                  105,
                  111,
                  95,
                  49,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "raydiumClmmProgram",
          "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
        },
        {
          "name": "raydiumPositionNftAccount",
          "docs": [
            "This account created in the contract by cpi to avoid large stack variables"
          ],
          "writable": true
        },
        {
          "name": "raydiumPoolState",
          "docs": [
            "The program account of the pool in which the swap will be performed",
            "Represents the state of the pool Token 0 / Token 1"
          ],
          "writable": true
        },
        {
          "name": "raydiumPersonalPosition",
          "docs": [
            "Increase liquidity for this position",
            "Represents the position in the pool Token 0 / Token 1"
          ],
          "writable": true
        },
        {
          "name": "raydiumProtocolPosition",
          "writable": true
        },
        {
          "name": "raydiumTickArrayLower",
          "writable": true
        },
        {
          "name": "raydiumTickArrayUpper",
          "writable": true
        },
        {
          "name": "raydiumTokenVault0",
          "docs": [
            "The address that holds raydium pool tokens for token_0"
          ],
          "writable": true
        },
        {
          "name": "raydiumTokenVault1",
          "docs": [
            "The address that holds raydium pool tokens for token_1"
          ],
          "writable": true
        },
        {
          "name": "raydiumVault0Mint",
          "docs": [
            "The mint of token 0"
          ]
        },
        {
          "name": "raydiumVault1Mint",
          "docs": [
            "The mint of token 1"
          ]
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL program for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "tokenProgram2022",
          "docs": [
            "SPL program 2022 for token transfers"
          ],
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "memoProgram",
          "docs": [
            "memo program"
          ],
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "strategyId",
          "type": "u8"
        }
      ]
    },
    {
      "name": "createRaydiumVaultStrategy",
      "discriminator": [
        4
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultStrategyConfig",
          "writable": true
        },
        {
          "name": "vaultStrategy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  116,
                  114,
                  116,
                  103,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              },
              {
                "kind": "account",
                "path": "raydiumVault0Mint"
              },
              {
                "kind": "account",
                "path": "raydiumVault1Mint"
              },
              {
                "kind": "arg",
                "path": "strategyId"
              }
            ]
          }
        },
        {
          "name": "investorStrategyPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  95,
                  115,
                  116,
                  114,
                  116,
                  103,
                  95,
                  112,
                  111,
                  115,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategy"
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint0Escrow",
          "docs": [
            "The escrow account for the token 0",
            "Vault strategy Config receives token 0 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  119,
                  97,
                  112,
                  95,
                  114,
                  97,
                  116,
                  105,
                  111,
                  95,
                  48,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint1Escrow",
          "docs": [
            "The escrow account for the token 1",
            "Vault strategy Config receives token 1 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  119,
                  97,
                  112,
                  95,
                  114,
                  97,
                  116,
                  105,
                  111,
                  95,
                  49,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint0FeesEscrow",
          "docs": [
            "The escrow account for the token 0",
            "Vault strategy Config receives token 0 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  102,
                  101,
                  101,
                  115,
                  95,
                  48,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint1FeesEscrow",
          "docs": [
            "The escrow account for the token 1",
            "Vault strategy Config receives token 1 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  102,
                  101,
                  101,
                  115,
                  95,
                  49,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint0PerfFeesEscrow",
          "docs": [
            "The escrow account for the token 0",
            "Vault strategy Config receives token 0 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  112,
                  101,
                  114,
                  102,
                  95,
                  102,
                  101,
                  101,
                  115,
                  95,
                  48,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint1PerfFeesEscrow",
          "docs": [
            "The escrow account for the token 1",
            "Vault strategy Config receives token 1 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  112,
                  101,
                  114,
                  102,
                  95,
                  102,
                  101,
                  101,
                  115,
                  95,
                  49,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "pythToken0PriceUpdate"
        },
        {
          "name": "pythToken1PriceUpdate"
        },
        {
          "name": "raydiumClmmProgram",
          "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
        },
        {
          "name": "raydiumPositionNftMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "raydiumPositionNftAccount",
          "docs": [
            "This account created in the contract by cpi to avoid large stack variables"
          ],
          "writable": true
        },
        {
          "name": "raydiumPoolState",
          "writable": true
        },
        {
          "name": "raydiumProtocolPosition",
          "writable": true
        },
        {
          "name": "raydiumTickArrayLower",
          "writable": true
        },
        {
          "name": "raydiumTickArrayUpper",
          "writable": true
        },
        {
          "name": "raydiumPersonalPosition",
          "writable": true
        },
        {
          "name": "raydiumTokenAccount0",
          "docs": [
            "The token_0 account that will deposit tokens to the raydium pool"
          ],
          "writable": true
        },
        {
          "name": "raydiumTokenAccount1",
          "docs": [
            "The token_1 account that will deposit tokens to the raydium pool"
          ],
          "writable": true
        },
        {
          "name": "raydiumTokenVault0",
          "docs": [
            "The address that holds raydium pool tokens for token_0"
          ],
          "writable": true
        },
        {
          "name": "raydiumTokenVault1",
          "docs": [
            "The address that holds raydium pool tokens for token_1"
          ],
          "writable": true
        },
        {
          "name": "raydiumVault0Mint",
          "docs": [
            "The mint of raydium token vault 0"
          ]
        },
        {
          "name": "raydiumVault1Mint",
          "docs": [
            "The mint of raydium token vault 1"
          ]
        },
        {
          "name": "rent",
          "docs": [
            "Sysvar for token mint and ATA creation"
          ],
          "address": "SysvarRent111111111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "docs": [
            "Program to create the position manager state account"
          ],
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Program to create mint account and mint tokens"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "docs": [
            "Program to create an ATA for receiving position NFT"
          ],
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "tokenProgram2022",
          "docs": [
            "Program to create mint account and mint tokens"
          ],
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        }
      ],
      "args": [
        {
          "name": "strategyId",
          "type": "u8"
        },
        {
          "name": "percentage",
          "type": "u32"
        },
        {
          "name": "amount0Max",
          "type": "u64"
        },
        {
          "name": "amount1Max",
          "type": "u64"
        },
        {
          "name": "tickLowerIndex",
          "type": "i32"
        },
        {
          "name": "tickUpperIndex",
          "type": "i32"
        },
        {
          "name": "tickArrayLowerStartIndex",
          "type": "i32"
        },
        {
          "name": "tickArrayUpperStartIndex",
          "type": "i32"
        },
        {
          "name": "token0FeedId",
          "type": "string"
        },
        {
          "name": "token1FeedId",
          "type": "string"
        },
        {
          "name": "lookUpTable",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "depositToEscrow",
      "discriminator": [
        5
      ],
      "accounts": [
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "investorTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initProtocolConfig",
      "discriminator": [
        0
      ],
      "accounts": [
        {
          "name": "adminAuthority",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  58
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "protocolFees",
          "type": "u32"
        }
      ]
    },
    {
      "name": "initVaultStrategyConfig",
      "discriminator": [
        3
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "protocolConfig",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  58
                ]
              }
            ]
          }
        },
        {
          "name": "vaultStrategyConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              },
              {
                "kind": "arg",
                "path": "name"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgUsdcEscrow",
          "docs": [
            "The escrow account for the USDC",
            "Vault strategy Config receives USDC in this account from User's escrow vault"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121,
                  95,
                  99,
                  102,
                  103,
                  95,
                  117,
                  115,
                  100,
                  99,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "docs": [
            "Program to create mint account and mint tokens"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "performanceFee",
          "type": "u32"
        },
        {
          "name": "vaultStrategyType",
          "type": {
            "defined": {
              "name": "vaultStrategyType"
            }
          }
        }
      ]
    },
    {
      "name": "investReserve",
      "discriminator": [
        9
      ],
      "accounts": [
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultStrategyConfig"
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgUsdcEscrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121,
                  95,
                  99,
                  102,
                  103,
                  95,
                  117,
                  115,
                  100,
                  99,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "investReserveVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  95,
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "pauseProtocol",
      "discriminator": [
        1
      ],
      "accounts": [
        {
          "name": "adminAuthority",
          "writable": true,
          "signer": true,
          "relations": [
            "protocolConfig"
          ]
        },
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  58
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "pauseVault",
      "discriminator": [
        7
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "vaultStrategyConfig"
          ]
        },
        {
          "name": "vaultStrategyConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  58
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "removeLiquidityRaydiumVaultStrategy",
      "discriminator": [
        12
      ],
      "accounts": [
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultStrategyConfig",
          "writable": true
        },
        {
          "name": "vaultStrategy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  116,
                  114,
                  116,
                  103,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              },
              {
                "kind": "account",
                "path": "raydiumVault0Mint"
              },
              {
                "kind": "account",
                "path": "raydiumVault1Mint"
              },
              {
                "kind": "arg",
                "path": "strategyId"
              }
            ]
          }
        },
        {
          "name": "investorStrategyPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  95,
                  115,
                  116,
                  114,
                  116,
                  103,
                  95,
                  112,
                  111,
                  115,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategy"
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "investorMint0Account",
          "docs": [
            "The investor escrow account for the token 0",
            "Vault strategy Config receives token 0 in this account from Raydium LP"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "raydiumVault0Mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "investorMint1Account",
          "docs": [
            "The investor escrow account for the token 1",
            "Vault strategy Config receives token 1 in this account from Raydium LP"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "raydiumVault1Mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vaultStrategyCfgMint0FeesEscrow",
          "docs": [
            "The escrow account for the token 0",
            "Vault strategy Config receives token 0 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  102,
                  101,
                  101,
                  115,
                  95,
                  48,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint1FeesEscrow",
          "docs": [
            "The escrow account for the token 1",
            "Vault strategy Config receives token 1 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  102,
                  101,
                  101,
                  115,
                  95,
                  49,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint0PerfFeesEscrow",
          "docs": [
            "The escrow account for the token 0",
            "Vault strategy Config receives token 0 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  112,
                  101,
                  114,
                  102,
                  95,
                  102,
                  101,
                  101,
                  115,
                  95,
                  48,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint1PerfFeesEscrow",
          "docs": [
            "The escrow account for the token 1",
            "Vault strategy Config receives token 1 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  112,
                  101,
                  114,
                  102,
                  95,
                  102,
                  101,
                  101,
                  115,
                  95,
                  49,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "raydiumClmmProgram",
          "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
        },
        {
          "name": "raydiumPositionNftAccount",
          "docs": [
            "This account created in the contract by cpi to avoid large stack variables"
          ],
          "writable": true
        },
        {
          "name": "raydiumPoolState",
          "docs": [
            "The program account of the pool in which the swap will be performed",
            "Represents the state of the pool Token 0 / Token 1"
          ],
          "writable": true
        },
        {
          "name": "raydiumPersonalPosition",
          "docs": [
            "Increase liquidity for this position",
            "Represents the position in the pool Token 0 / Token 1"
          ],
          "writable": true
        },
        {
          "name": "raydiumProtocolPosition",
          "writable": true
        },
        {
          "name": "raydiumTickArrayLower",
          "writable": true
        },
        {
          "name": "raydiumTickArrayUpper",
          "writable": true
        },
        {
          "name": "raydiumTokenVault0",
          "docs": [
            "The address that holds raydium pool tokens for token_0"
          ],
          "writable": true
        },
        {
          "name": "raydiumTokenVault1",
          "docs": [
            "The address that holds raydium pool tokens for token_1"
          ],
          "writable": true
        },
        {
          "name": "raydiumVault0Mint",
          "docs": [
            "The mint of token 0"
          ]
        },
        {
          "name": "raydiumVault1Mint",
          "docs": [
            "The mint of token 1"
          ]
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL program for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "tokenProgram2022",
          "docs": [
            "SPL program 2022 for token transfers"
          ],
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "memoProgram",
          "docs": [
            "memo program"
          ],
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "strategyId",
          "type": "u8"
        },
        {
          "name": "percentage",
          "type": "u64"
        },
        {
          "name": "amount0Min",
          "type": "u64"
        },
        {
          "name": "amount1Min",
          "type": "u64"
        }
      ]
    },
    {
      "name": "swapToRatioRaydiumVaultStrategy",
      "discriminator": [
        10
      ],
      "accounts": [
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "vaultStrategyConfig",
          "writable": true
        },
        {
          "name": "vaultStrategy",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  116,
                  114,
                  116,
                  103,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              },
              {
                "kind": "account",
                "path": "raydiumVault0Mint"
              },
              {
                "kind": "account",
                "path": "raydiumVault1Mint"
              },
              {
                "kind": "arg",
                "path": "strategyId"
              }
            ]
          }
        },
        {
          "name": "investReserveVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  118,
                  101,
                  115,
                  116,
                  95,
                  114,
                  101,
                  115,
                  101,
                  114,
                  118,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgUsdcEscrow",
          "docs": [
            "The escrow account for the USDC",
            "Vault strategy Config receives USDC in this account from User's escrow vault"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121,
                  95,
                  99,
                  102,
                  103,
                  95,
                  117,
                  115,
                  100,
                  99,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint0Escrow",
          "docs": [
            "The escrow account for the token 0",
            "Vault strategy Config receives token 0 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  119,
                  97,
                  112,
                  95,
                  114,
                  97,
                  116,
                  105,
                  111,
                  95,
                  48,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "vaultStrategyCfgMint1Escrow",
          "docs": [
            "The escrow account for the token 1",
            "Vault strategy Config receives token 1 in this account from Raydium Swap"
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  108,
                  116,
                  95,
                  115,
                  119,
                  97,
                  112,
                  95,
                  114,
                  97,
                  116,
                  105,
                  111,
                  95,
                  49,
                  95,
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "vaultStrategyConfig"
              }
            ]
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "raydiumClmmProgram",
          "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
        },
        {
          "name": "raydiumPoolState",
          "docs": [
            "The program account of the pool in which the swap will be performed",
            "Represents the state of the pool Token 0 / Token 1"
          ],
          "writable": true
        },
        {
          "name": "raydiumPersonalPosition",
          "docs": [
            "Increase liquidity for this position",
            "Represents the position in the pool Token 0 / Token 1"
          ]
        },
        {
          "name": "raydiumAmmConfigUsdcForToken0",
          "docs": [
            "The factory state to read protocol fees"
          ],
          "writable": true
        },
        {
          "name": "raydiumPoolStateUsdcForToken0",
          "docs": [
            "The program account of the pool in which the swap will be performed"
          ],
          "writable": true
        },
        {
          "name": "raydiumAmmConfigUsdcForToken1",
          "docs": [
            "The factory state to read protocol fees"
          ],
          "writable": true
        },
        {
          "name": "raydiumPoolStateUsdcForToken1",
          "docs": [
            "The program account of the pool in which the swap will be performed"
          ],
          "writable": true
        },
        {
          "name": "raydiumVault0Input",
          "docs": [
            "The vault token account for input token",
            "User sends USDC to this account to swap to token 0",
            "Pool: USDC / Token 0"
          ],
          "writable": true
        },
        {
          "name": "raydiumVault1Input",
          "docs": [
            "The vault token account for input token",
            "User sends USDC to this account to swap to token 1",
            "Pool: USDC / Token 1"
          ],
          "writable": true
        },
        {
          "name": "raydiumVault0Output",
          "docs": [
            "The vault token account for output token",
            "User receives token 0 from this account",
            "Pool: USDC / Token 0"
          ],
          "writable": true
        },
        {
          "name": "raydiumVault1Output",
          "docs": [
            "The vault token account for output token",
            "User receives token 1 from this account",
            "Pool: USDC / Token 1"
          ],
          "writable": true
        },
        {
          "name": "raydiumVault0Mint",
          "docs": [
            "The mint of token 0"
          ]
        },
        {
          "name": "raydiumVault1Mint",
          "docs": [
            "The mint of token 1"
          ]
        },
        {
          "name": "raydiumObservationState0",
          "docs": [
            "The program account for the most recent oracle observation",
            "USDC/Token 0"
          ],
          "writable": true
        },
        {
          "name": "raydiumObservationState1",
          "docs": [
            "The program account for the most recent oracle observation",
            "USDC/Token 1"
          ],
          "writable": true
        },
        {
          "name": "raydiumTokenVault0",
          "docs": [
            "The address that holds raydium pool tokens for token_0"
          ],
          "writable": true
        },
        {
          "name": "raydiumTokenVault1",
          "docs": [
            "The address that holds raydium pool tokens for token_1"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL program for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "tokenProgram2022",
          "docs": [
            "SPL program 2022 for token transfers"
          ],
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "memoProgram",
          "docs": [
            "memo program"
          ],
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "systemProgram",
          "docs": [
            "System program"
          ],
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "strategyId",
          "type": "u8"
        },
        {
          "name": "token0AmountOutMin",
          "type": "u64"
        },
        {
          "name": "token1AmountOutMin",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unpauseProtocol",
      "discriminator": [
        2
      ],
      "accounts": [
        {
          "name": "adminAuthority",
          "writable": true,
          "signer": true,
          "relations": [
            "protocolConfig"
          ]
        },
        {
          "name": "protocolConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  58
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "unpauseVault",
      "discriminator": [
        8
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true,
          "relations": [
            "vaultStrategyConfig"
          ]
        },
        {
          "name": "vaultStrategyConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116,
                  95,
                  115,
                  116,
                  114,
                  97,
                  116,
                  101,
                  103,
                  121,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103,
                  58
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "withdrawFromEscrow",
      "discriminator": [
        6
      ],
      "accounts": [
        {
          "name": "investor",
          "writable": true,
          "signer": true
        },
        {
          "name": "escrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  101,
                  115,
                  99,
                  114,
                  111,
                  119,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116,
                  58
                ]
              },
              {
                "kind": "account",
                "path": "investor"
              }
            ]
          }
        },
        {
          "name": "investorTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "investor"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "usdcMint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "usdcMint"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "ammConfig",
      "discriminator": [
        218,
        244,
        33,
        104,
        203,
        203,
        43,
        111
      ]
    },
    {
      "name": "investReserveVault",
      "discriminator": [
        6
      ]
    },
    {
      "name": "investorStrategyPosition",
      "discriminator": [
        4
      ]
    },
    {
      "name": "observationState",
      "discriminator": [
        122,
        174,
        197,
        53,
        129,
        9,
        165,
        132
      ]
    },
    {
      "name": "personalPositionState",
      "discriminator": [
        70,
        111,
        150,
        126,
        230,
        15,
        25,
        117
      ]
    },
    {
      "name": "poolState",
      "discriminator": [
        247,
        237,
        227,
        245,
        215,
        195,
        222,
        70
      ]
    },
    {
      "name": "priceUpdateV2",
      "discriminator": [
        34,
        241,
        35,
        99,
        157,
        126,
        244,
        205
      ]
    },
    {
      "name": "protocolConfig",
      "discriminator": [
        1
      ]
    },
    {
      "name": "tickArrayState",
      "discriminator": [
        192,
        155,
        85,
        205,
        49,
        249,
        129,
        42
      ]
    },
    {
      "name": "vaultStrategy",
      "discriminator": [
        3
      ]
    },
    {
      "name": "vaultStrategyConfig",
      "discriminator": [
        2
      ]
    }
  ],
  "events": [
    {
      "name": "investorEscrowDepositEvent",
      "discriminator": [
        177,
        125,
        152,
        66,
        64,
        53,
        248,
        133
      ]
    },
    {
      "name": "investorEscrowEvent",
      "discriminator": [
        151,
        12,
        98,
        224,
        123,
        39,
        143,
        245
      ]
    },
    {
      "name": "investorEscrowWithdrawEvent",
      "discriminator": [
        6,
        163,
        41,
        54,
        203,
        79,
        209,
        208
      ]
    },
    {
      "name": "investorStrategyPositionEvent",
      "discriminator": [
        218,
        62,
        22,
        58,
        160,
        0,
        52,
        235
      ]
    },
    {
      "name": "protocolConfigEvent",
      "discriminator": [
        192,
        130,
        47,
        255,
        184,
        59,
        76,
        189
      ]
    },
    {
      "name": "vaultStrategyConfigEvent",
      "discriminator": [
        153,
        79,
        39,
        86,
        254,
        205,
        160,
        66
      ]
    },
    {
      "name": "vaultStrategyInitializeEvent",
      "discriminator": [
        210,
        56,
        78,
        205,
        141,
        182,
        57,
        173
      ]
    },
    {
      "name": "vaultStrategyUpdateAssetsEvent",
      "discriminator": [
        68,
        212,
        240,
        247,
        232,
        232,
        175,
        136
      ]
    },
    {
      "name": "vaultStrategyUpdateShareEvent",
      "discriminator": [
        196,
        164,
        155,
        241,
        176,
        218,
        130,
        221
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "notApproved",
      "msg": "Not approved"
    },
    {
      "code": 6001,
      "name": "feeTooHigh",
      "msg": "Fee cannot exceed 10% (100_000)"
    },
    {
      "code": 6002,
      "name": "feeTooLow",
      "msg": "Fee cannot be 0 or less (0)"
    },
    {
      "code": 6003,
      "name": "protocolConfigInitialized",
      "msg": "ProtocolConfig already initialized"
    },
    {
      "code": 6004,
      "name": "protocolConfigNotInitialized",
      "msg": "ProtocolConfig not initialized"
    },
    {
      "code": 6005,
      "name": "protocolConfigNotActive",
      "msg": "ProtocolConfig not active"
    },
    {
      "code": 6006,
      "name": "protocolAlreadyPaused",
      "msg": "Protocol is already paused"
    },
    {
      "code": 6007,
      "name": "protocolNotPaused",
      "msg": "Protocol is not paused"
    },
    {
      "code": 6008,
      "name": "vaultStrategyConfigInitialized",
      "msg": "VaultStrategyConfig is already initialized"
    },
    {
      "code": 6009,
      "name": "vaultStrategyConfigNotActive",
      "msg": "VaultStrategyConfig is not in active status"
    },
    {
      "code": 6010,
      "name": "vaultStrategyConfigNotDraft",
      "msg": "VaultStrategyConfig is not in draft status"
    },
    {
      "code": 6011,
      "name": "vaultStrategyConfigNotPaused",
      "msg": "VaultStrategyConfig is not in paused status"
    },
    {
      "code": 6012,
      "name": "vaultStrategyConfigMaxStrategiesReached",
      "msg": "VaultStrategyConfig max strategies reached"
    },
    {
      "code": 6013,
      "name": "invalidVaultStrategyType",
      "msg": "Invalid vault strategy type"
    },
    {
      "code": 6014,
      "name": "invalidVaultStrategyName",
      "msg": "Invalid vault strategy name"
    },
    {
      "code": 6015,
      "name": "invalidVaultStrategyPercentage",
      "msg": "Invalid vault strategy percentage"
    },
    {
      "code": 6016,
      "name": "performanceFeeTooHigh",
      "msg": "Performance fee cannot exceed 100% (1_000_000)"
    },
    {
      "code": 6017,
      "name": "performanceFeeTooLow",
      "msg": "Performance fee cannot be less than 10% (100_000)"
    },
    {
      "code": 6018,
      "name": "investorEscrowAlreadyInitialized",
      "msg": "Investor escrow already initialized"
    },
    {
      "code": 6019,
      "name": "insufficientFunds",
      "msg": "Insufficient funds in escrow"
    },
    {
      "code": 6020,
      "name": "invalidPrice",
      "msg": "Invalid Pyth price feed"
    },
    {
      "code": 6021,
      "name": "pythPriceFeedNotFound",
      "msg": "Pyth price feed not found"
    },
    {
      "code": 6022,
      "name": "invalidPythFeedId",
      "msg": "Invalid Pyth feed ID"
    },
    {
      "code": 6023,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6024,
      "name": "invalidMint",
      "msg": "Invalid mint"
    },
    {
      "code": 6025,
      "name": "invalidAmount",
      "msg": "Invalid amount"
    },
    {
      "code": 6026,
      "name": "percentageTooHigh",
      "msg": "Percentage cannot exceed 100% (1_000_000)"
    },
    {
      "code": 6027,
      "name": "percentageTooLow",
      "msg": "Percentage cannot be less than 10% (100_000)"
    },
    {
      "code": 6028,
      "name": "sharesCalculatedToZero",
      "msg": "Shares calculated to zero"
    },
    {
      "code": 6029,
      "name": "assetsCalculatedToZero",
      "msg": "Assets calculated to zero"
    },
    {
      "code": 6030,
      "name": "insufficientShares",
      "msg": "Insufficient shares"
    },
    {
      "code": 6031,
      "name": "invalidTickRange",
      "msg": "Invalid tick range"
    },
    {
      "code": 6032,
      "name": "sqrtPriceX64",
      "msg": "sqrt_price_x64 out of range"
    },
    {
      "code": 6033,
      "name": "tickUpperOverflow",
      "msg": "The tick must be lesser than, or equal to the maximum tick(443636)"
    },
    {
      "code": 6034,
      "name": "invalidTickArray",
      "msg": "Invalid tick array"
    },
    {
      "code": 6035,
      "name": "insufficientRemainingAccounts",
      "msg": "Insufficient remaining accounts"
    },
    {
      "code": 6036,
      "name": "invalidRemainingAccountsForSwapToRatio",
      "msg": "Invalid remaining accounts for swap to ratio"
    },
    {
      "code": 6037,
      "name": "maxSwapToRatioVaultsReached",
      "msg": "Max 3 swap to ratio vaults allowed"
    },
    {
      "code": 6038,
      "name": "swapToRatioVaultAlreadyExists",
      "msg": "SwapToRatioVault already exists"
    },
    {
      "code": 6039,
      "name": "noSwapToRatioVaultsToClear",
      "msg": "No SwapToRatioVaults to clear"
    },
    {
      "code": 6040,
      "name": "transferFailed",
      "msg": "Transfer failed"
    },
    {
      "code": 6041,
      "name": "invalidStrategyIndex",
      "msg": "Invalid strategy index"
    },
    {
      "code": 6042,
      "name": "invalidAllocation",
      "msg": "Invalid allocation - total does not match reserved amount"
    },
    {
      "code": 6043,
      "name": "swapToRatioVaultNotFound",
      "msg": "SwapToRatioVault not found"
    },
    {
      "code": 6044,
      "name": "investReserveVaultAlreadyInitialized",
      "msg": "InvestReserveVault already initialized"
    },
    {
      "code": 6045,
      "name": "vaultStrategyInitialized",
      "msg": "VaultStrategy is already initialized"
    },
    {
      "code": 6046,
      "name": "noReservedAmount",
      "msg": "No reserved amount"
    },
    {
      "code": 6047,
      "name": "invalidRemovePercentage",
      "msg": "Invalid remove percentage"
    }
  ],
  "types": [
    {
      "name": "ammConfig",
      "docs": [
        "Holds the current owner of the factory"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "Bump to identify PDA"
            ],
            "type": "u8"
          },
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "owner",
            "docs": [
              "Address of the protocol owner"
            ],
            "type": "pubkey"
          },
          {
            "name": "protocolFeeRate",
            "docs": [
              "The protocol fee"
            ],
            "type": "u32"
          },
          {
            "name": "tradeFeeRate",
            "docs": [
              "The trade fee, denominated in hundredths of a bip (10^-6)"
            ],
            "type": "u32"
          },
          {
            "name": "tickSpacing",
            "docs": [
              "The tick spacing"
            ],
            "type": "u16"
          },
          {
            "name": "fundFeeRate",
            "docs": [
              "The fund fee, denominated in hundredths of a bip (10^-6)"
            ],
            "type": "u32"
          },
          {
            "name": "paddingU32",
            "type": "u32"
          },
          {
            "name": "fundOwner",
            "type": "pubkey"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                3
              ]
            }
          }
        ]
      }
    },
    {
      "name": "investReserveVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vaultStrategyConfigKey",
            "type": "pubkey"
          },
          {
            "name": "reservedAmount",
            "type": "u64"
          },
          {
            "name": "swapToRatioVaults",
            "type": {
              "vec": {
                "defined": {
                  "name": "swapToRatioVault"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "investorEscrowDepositEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "investorEscrowEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "investorEscrowWithdrawEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "investorStrategyPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "vaultStrategyKey",
            "type": "pubkey"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "assets",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "investorStrategyPositionEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "vaultStrategyKey",
            "type": "pubkey"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "assets",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "observation",
      "docs": [
        "The element of observations in ObservationState"
      ],
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "blockTimestamp",
            "docs": [
              "The block timestamp of the observation"
            ],
            "type": "u32"
          },
          {
            "name": "sqrtPriceX64",
            "docs": [
              "the price of the observation timestamp, Q64.64"
            ],
            "type": "u128"
          },
          {
            "name": "cumulativeTimePriceX64",
            "docs": [
              "the cumulative of price during the duration time, Q64.64"
            ],
            "type": "u128"
          },
          {
            "name": "padding",
            "docs": [
              "padding for feature update"
            ],
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "observationState",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "initialized",
            "docs": [
              "Whether the ObservationState is initialized"
            ],
            "type": "bool"
          },
          {
            "name": "poolId",
            "type": "pubkey"
          },
          {
            "name": "observations",
            "docs": [
              "observation array"
            ],
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "observation"
                  }
                },
                1000
              ]
            }
          },
          {
            "name": "padding",
            "docs": [
              "padding for feature update"
            ],
            "type": {
              "array": [
                "u128",
                5
              ]
            }
          }
        ]
      }
    },
    {
      "name": "personalPositionState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "Bump to identify PDA"
            ],
            "type": "u8"
          },
          {
            "name": "nftMint",
            "docs": [
              "Mint address of the tokenized position"
            ],
            "type": "pubkey"
          },
          {
            "name": "poolId",
            "docs": [
              "The ID of the pool with which this token is connected"
            ],
            "type": "pubkey"
          },
          {
            "name": "tickLowerIndex",
            "docs": [
              "The lower bound tick of the position"
            ],
            "type": "i32"
          },
          {
            "name": "tickUpperIndex",
            "docs": [
              "The upper bound tick of the position"
            ],
            "type": "i32"
          },
          {
            "name": "liquidity",
            "docs": [
              "The amount of liquidity owned by this position"
            ],
            "type": "u128"
          },
          {
            "name": "feeGrowthInside0LastX64",
            "docs": [
              "The token_0 fee growth of the aggregate position as of the last action on the individual position"
            ],
            "type": "u128"
          },
          {
            "name": "feeGrowthInside1LastX64",
            "docs": [
              "The token_1 fee growth of the aggregate position as of the last action on the individual position"
            ],
            "type": "u128"
          },
          {
            "name": "tokenFeesOwed0",
            "docs": [
              "The fees owed to the position owner in token_0, as of the last computation"
            ],
            "type": "u64"
          },
          {
            "name": "tokenFeesOwed1",
            "docs": [
              "The fees owed to the position owner in token_1, as of the last computation"
            ],
            "type": "u64"
          },
          {
            "name": "rewardInfos",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "positionRewardInfo"
                  }
                },
                3
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                8
              ]
            }
          }
        ]
      }
    },
    {
      "name": "poolState",
      "docs": [
        "The pool state",
        "",
        "PDA of `[POOL_SEED, config, token_mint_0, token_mint_1]`",
        ""
      ],
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "Bump to identify PDA"
            ],
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "ammConfig",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "tokenMint0",
            "docs": [
              "Token pair of the pool, where token_mint_0 address < token_mint_1 address"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMint1",
            "type": "pubkey"
          },
          {
            "name": "tokenVault0",
            "docs": [
              "Token pair vault"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenVault1",
            "type": "pubkey"
          },
          {
            "name": "observationKey",
            "docs": [
              "observation account key"
            ],
            "type": "pubkey"
          },
          {
            "name": "mintDecimals0",
            "docs": [
              "mint0 and mint1 decimals"
            ],
            "type": "u8"
          },
          {
            "name": "mintDecimals1",
            "type": "u8"
          },
          {
            "name": "tickSpacing",
            "docs": [
              "The minimum number of ticks between initialized ticks"
            ],
            "type": "u16"
          },
          {
            "name": "liquidity",
            "docs": [
              "The currently in range liquidity available to the pool."
            ],
            "type": "u128"
          },
          {
            "name": "sqrtPriceX64",
            "docs": [
              "The current price of the pool as a sqrt(token_1/token_0) Q64.64 value"
            ],
            "type": "u128"
          },
          {
            "name": "tickCurrent",
            "docs": [
              "The current tick of the pool, i.e. according to the last tick transition that was run."
            ],
            "type": "i32"
          },
          {
            "name": "observationIndex",
            "docs": [
              "the most-recently updated index of the observations array"
            ],
            "type": "u16"
          },
          {
            "name": "observationUpdateDuration",
            "type": "u16"
          },
          {
            "name": "feeGrowthGlobal0X64",
            "docs": [
              "The fee growth as a Q64.64 number, i.e. fees of token_0 and token_1 collected per",
              "unit of liquidity for the entire life of the pool."
            ],
            "type": "u128"
          },
          {
            "name": "feeGrowthGlobal1X64",
            "type": "u128"
          },
          {
            "name": "protocolFeesToken0",
            "docs": [
              "The amounts of token_0 and token_1 that are owed to the protocol."
            ],
            "type": "u64"
          },
          {
            "name": "protocolFeesToken1",
            "type": "u64"
          },
          {
            "name": "swapInAmountToken0",
            "docs": [
              "The amounts in and out of swap token_0 and token_1"
            ],
            "type": "u128"
          },
          {
            "name": "swapOutAmountToken1",
            "type": "u128"
          },
          {
            "name": "swapInAmountToken1",
            "type": "u128"
          },
          {
            "name": "swapOutAmountToken0",
            "type": "u128"
          },
          {
            "name": "status",
            "docs": [
              "Bitwise representation of the state of the pool",
              "bit0, 1: disable open position and increase liquidity, 0: normal",
              "bit1, 1: disable decrease liquidity, 0: normal",
              "bit2, 1: disable collect fee, 0: normal",
              "bit3, 1: disable collect reward, 0: normal",
              "bit4, 1: disable swap, 0: normal"
            ],
            "type": "u8"
          },
          {
            "name": "padding",
            "docs": [
              "Leave blank for future use"
            ],
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "rewardInfos",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "rewardInfo"
                  }
                },
                3
              ]
            }
          },
          {
            "name": "tickArrayBitmap",
            "docs": [
              "Packed initialized tick array state"
            ],
            "type": {
              "array": [
                "u64",
                16
              ]
            }
          },
          {
            "name": "totalFeesToken0",
            "docs": [
              "except protocol_fee and fund_fee"
            ],
            "type": "u64"
          },
          {
            "name": "totalFeesClaimedToken0",
            "docs": [
              "except protocol_fee and fund_fee"
            ],
            "type": "u64"
          },
          {
            "name": "totalFeesToken1",
            "type": "u64"
          },
          {
            "name": "totalFeesClaimedToken1",
            "type": "u64"
          },
          {
            "name": "fundFeesToken0",
            "type": "u64"
          },
          {
            "name": "fundFeesToken1",
            "type": "u64"
          },
          {
            "name": "openTime",
            "type": "u64"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u64",
                25
              ]
            }
          },
          {
            "name": "padding2",
            "type": {
              "array": [
                "u64",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "positionRewardInfo",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "growthInsideLastX64",
            "type": "u128"
          },
          {
            "name": "rewardAmountOwed",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "priceFeedMessage",
      "repr": {
        "kind": "c"
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "feedId",
            "docs": [
              "`FeedId` but avoid the type alias because of compatibility issues with Anchor's `idl-build` feature."
            ],
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "price",
            "type": "i64"
          },
          {
            "name": "conf",
            "type": "u64"
          },
          {
            "name": "exponent",
            "type": "i32"
          },
          {
            "name": "publishTime",
            "docs": [
              "The timestamp of this price update in seconds"
            ],
            "type": "i64"
          },
          {
            "name": "prevPublishTime",
            "docs": [
              "The timestamp of the previous price update. This field is intended to allow users to",
              "identify the single unique price update for any moment in time:",
              "for any time t, the unique update is the one such that prev_publish_time < t <= publish_time.",
              "",
              "Note that there may not be such an update while we are migrating to the new message-sending logic,",
              "as some price updates on pythnet may not be sent to other chains (because the message-sending",
              "logic may not have triggered). We can solve this problem by making the message-sending mandatory",
              "(which we can do once publishers have migrated over).",
              "",
              "Additionally, this field may be equal to publish_time if the message is sent on a slot where",
              "where the aggregation was unsuccesful. This problem will go away once all publishers have",
              "migrated over to a recent version of pyth-agent."
            ],
            "type": "i64"
          },
          {
            "name": "emaPrice",
            "type": "i64"
          },
          {
            "name": "emaConf",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "priceUpdateV2",
      "docs": [
        "A price update account. This account is used by the Pyth Receiver program to store a verified price update from a Pyth price feed.",
        "It contains:",
        "- `write_authority`: The write authority for this account. This authority can close this account to reclaim rent or update the account to contain a different price update.",
        "- `verification_level`: The [`VerificationLevel`] of this price update. This represents how many Wormhole guardian signatures have been verified for this price update.",
        "- `price_message`: The actual price update.",
        "- `posted_slot`: The slot at which this price update was posted."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "writeAuthority",
            "type": "pubkey"
          },
          {
            "name": "verificationLevel",
            "type": {
              "defined": {
                "name": "verificationLevel"
              }
            }
          },
          {
            "name": "priceMessage",
            "type": {
              "defined": {
                "name": "priceFeedMessage"
              }
            }
          },
          {
            "name": "postedSlot",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "protocolConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "adminAuthority",
            "type": "pubkey"
          },
          {
            "name": "protocolFees",
            "type": "u32"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "protocolStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "protocolConfigEvent",
      "docs": [
        "Emitted when update status of Protocolconfig"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "adminAuthority",
            "type": "pubkey"
          },
          {
            "name": "protocolFees",
            "type": "u32"
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "protocolStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "protocolStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "unknown"
          },
          {
            "name": "active"
          },
          {
            "name": "paused"
          }
        ]
      }
    },
    {
      "name": "rewardInfo",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rewardState",
            "docs": [
              "Reward state"
            ],
            "type": "u8"
          },
          {
            "name": "openTime",
            "docs": [
              "Reward open time"
            ],
            "type": "u64"
          },
          {
            "name": "endTime",
            "docs": [
              "Reward end time"
            ],
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "docs": [
              "Reward last update time"
            ],
            "type": "u64"
          },
          {
            "name": "emissionsPerSecondX64",
            "docs": [
              "Q64.64 number indicates how many tokens per second are earned per unit of liquidity."
            ],
            "type": "u128"
          },
          {
            "name": "rewardTotalEmissioned",
            "docs": [
              "The total amount of reward emissioned"
            ],
            "type": "u64"
          },
          {
            "name": "rewardClaimed",
            "docs": [
              "The total amount of claimed reward"
            ],
            "type": "u64"
          },
          {
            "name": "tokenMint",
            "docs": [
              "Reward token mint."
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenVault",
            "docs": [
              "Reward vault token account."
            ],
            "type": "pubkey"
          },
          {
            "name": "authority",
            "docs": [
              "The owner that has permission to set reward param"
            ],
            "type": "pubkey"
          },
          {
            "name": "rewardGrowthGlobalX64",
            "docs": [
              "Q64.64 number that tracks the total tokens earned per unit of liquidity since the reward",
              "emissions were turned on."
            ],
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "swapToRatioVault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "vaultStrategyKey",
            "type": "pubkey"
          },
          {
            "name": "amountIn",
            "type": "u64"
          },
          {
            "name": "token0Amount",
            "type": "u64"
          },
          {
            "name": "token1Amount",
            "type": "u64"
          },
          {
            "name": "executed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "tickArrayState",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "poolId",
            "type": "pubkey"
          },
          {
            "name": "startTickIndex",
            "type": "i32"
          },
          {
            "name": "ticks",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "tickState"
                  }
                },
                60
              ]
            }
          },
          {
            "name": "initializedTickCount",
            "type": "u8"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u8",
                115
              ]
            }
          }
        ]
      }
    },
    {
      "name": "tickState",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "tick",
            "type": "i32"
          },
          {
            "name": "liquidityNet",
            "docs": [
              "Amount of net liquidity added (subtracted) when tick is crossed from left to right (right to left)"
            ],
            "type": "i128"
          },
          {
            "name": "liquidityGross",
            "docs": [
              "The total position liquidity that references this tick"
            ],
            "type": "u128"
          },
          {
            "name": "feeGrowthOutside0X64",
            "docs": [
              "Fee growth per unit of liquidity on the _other_ side of this tick (relative to the current tick)",
              "only has relative meaning, not absolute — the value depends on when the tick is initialized"
            ],
            "type": "u128"
          },
          {
            "name": "feeGrowthOutside1X64",
            "type": "u128"
          },
          {
            "name": "rewardGrowthsOutsideX64",
            "type": {
              "array": [
                "u128",
                3
              ]
            }
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u32",
                13
              ]
            }
          }
        ]
      }
    },
    {
      "name": "vaultStrategy",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "lookUpTable",
            "type": "pubkey"
          },
          {
            "name": "vaultStrategyConfigKey",
            "type": "pubkey"
          },
          {
            "name": "dexNftMint",
            "type": "pubkey"
          },
          {
            "name": "mint0",
            "type": "pubkey"
          },
          {
            "name": "mint1",
            "type": "pubkey"
          },
          {
            "name": "totalAssets",
            "type": "u64"
          },
          {
            "name": "totalShares",
            "type": "u64"
          },
          {
            "name": "percentage",
            "type": "u32"
          },
          {
            "name": "strategyId",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultStrategyConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "performanceFee",
            "type": "u32"
          },
          {
            "name": "vaultStrategyType",
            "type": {
              "defined": {
                "name": "vaultStrategyType"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "vaultStrategyStatus"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "strategies",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "percentages",
            "type": {
              "vec": "u32"
            }
          },
          {
            "name": "name",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "vaultStrategyConfigEvent",
      "docs": [
        "Emitted when update status of VaultStrategyConfig"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "performanceFee",
            "type": "u32"
          },
          {
            "name": "vaultStrategyType",
            "type": {
              "defined": {
                "name": "vaultStrategyType"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "vaultStrategyStatus"
              }
            }
          }
        ]
      }
    },
    {
      "name": "vaultStrategyInitializeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "vaultStrategyConfigKey",
            "type": "pubkey"
          },
          {
            "name": "dexNftMint",
            "type": "pubkey"
          },
          {
            "name": "mint0",
            "type": "pubkey"
          },
          {
            "name": "mint1",
            "type": "pubkey"
          },
          {
            "name": "assets",
            "type": "u64"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "percentage",
            "type": "u32"
          },
          {
            "name": "strategyId",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultStrategyStatus",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "unknown"
          },
          {
            "name": "draft"
          },
          {
            "name": "active"
          },
          {
            "name": "paused"
          },
          {
            "name": "closed"
          }
        ]
      }
    },
    {
      "name": "vaultStrategyType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "unknown"
          },
          {
            "name": "conservative"
          },
          {
            "name": "balanced"
          },
          {
            "name": "aggressive"
          }
        ]
      }
    },
    {
      "name": "vaultStrategyUpdateAssetsEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "vaultStrategyConfigKey",
            "type": "pubkey"
          },
          {
            "name": "assets",
            "type": "u64"
          },
          {
            "name": "strategyId",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultStrategyUpdateShareEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "vaultStrategyConfigKey",
            "type": "pubkey"
          },
          {
            "name": "shares",
            "type": "u64"
          },
          {
            "name": "strategyId",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "verificationLevel",
      "docs": [
        "Pyth price updates are bridged to all blockchains via Wormhole.",
        "Using the price updates on another chain requires verifying the signatures of the Wormhole guardians.",
        "The usual process is to check the signatures for two thirds of the total number of guardians, but this can be cumbersome on Solana because of the transaction size limits,",
        "so we also allow for partial verification.",
        "",
        "This enum represents how much a price update has been verified:",
        "- If `Full`, we have verified the signatures for two thirds of the current guardians.",
        "- If `Partial`, only `num_signatures` guardian signatures have been checked.",
        "",
        "# Warning",
        "Using partially verified price updates is dangerous, as it lowers the threshold of guardians that need to collude to produce a malicious price update."
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "partial",
            "fields": [
              {
                "name": "numSignatures",
                "type": "u8"
              }
            ]
          },
          {
            "name": "full"
          }
        ]
      }
    }
  ]
};
