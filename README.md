# Tokenized Multi-Strategy Vault

Tokenized Multi-Strategy Vault is a Solana program designed to engage a social layer of investors seeking maximum capital efficiency. It enables users to earn yield by providing liquidity to AMMs across various Web3 protocols. Investors can join the vaults using a single asset, such as stablecoins or SOL.

## Architecture Design

This document provides an overview of the architecture for the Tokenized Multi-Strategy Vault.

[Architecture Design](docs/Architecture-Design.pdf)

### End-to-End Diagram

![End-to-End Architecture](docs/end2end.png)

## Technologies

- **Solana** - Blockchain platform
- **Rust** - Program development
- **Typescript** - Testing instructions
- **Anchor** - Solana development framework
- **Raydium SDK** - AMM integration

## Prerequisites

Before running the project, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or higher)
- [Yarn](https://yarnpkg.com/) package manager
- [Rust](https://rustup.rs/) (latest stable version)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) (v1.18+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.31.1)

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd turbin3-tokenized-vaults-program
```

2. Install dependencies:

```bash
yarn install
```

3. Set up environment configuration:

```bash
# Edit .env.test.devnet with your configuration
```

## Configuration

The project supports two environments:

- **Localnet**: For local development and testing
- **Devnet**: For testnet deployment

## Quick Start

### 1. Build the Program

```bash
# For localnet development
make build

# For devnet deployment
make build-devnet
```

### 2. Start Local Test Validator (Localnet Only)

For localnet development, start a test validator with mainnet account dumps:

```bash
make start-test-validator-from-dump-mainnet
```

This command starts a Solana test validator with pre-configured accounts including:

- USDC token accounts
- Raydium AMM configurations
- Pyth price feeds
- Test tokens

### 3. Deploy the Program

```bash
# Deploy to localnet
make build && make deploy-localnet

# Deploy to devnet
make build-devnet && make deploy-devnet
```

### 4. Set Up Test Environment

```bash
# For localnet
make setup-test-localnet

# For devnet
make setup-test-env-devnet
```

This will:

- Configure Solana CLI to use the correct cluster
- Airdrop SOL to test wallets
- Set up initial token accounts

## Project Capabilities

The Tokenized Vaults Program provides the following core features:

### 1. Protocol Management (Admin)

- **Initialize Protocol**: Set up the main protocol configuration
- **Pause/Unpause Protocol**: Emergency controls for protocol operations
- **Fee Management**: Configure protocol fees

### 2. Vault Strategy Management (Creator)

- **Create Vault Strategy Config**: Define strategy parameters and fees
- **Create Raydium Vault Strategy**: Deploy strategies that interact with Raydium AMM
- **Activate Strategies**: Enable strategies for investor participation

### 3. Investor Operations

- **Deposit to Escrow**: Secure token deposits before investing
- **Invest in Reserves**: Chose the strategy and create the reserve to save the proper information
- **Add Liquidity**: Provide liquidity to the chosen strategies
- **Remove Liquidity**: Withdraw liquidity and collect rewards

## Running Tests

The project includes comprehensive integration tests for all major features:

### Run Specific Test Suites

**It's necessary to run the tests in order so the previous step prepares for the next. e.g. there's no way to invest in a strategy if you don't have funds in the escrow first**

#### Admin Operations

```bash
# Initialize protocol configuration
make integration-localnet-create_protocol_config
```

#### Creator Operations

```bash
# Create vault strategy configuration
make integration-localnet-create_vault_strategy_config

# Create Raydium vault strategy
make integration-localnet-create_raydium_vault_strategy

# Activate vault strategy
make integration-localnet-activate_vault_strategy_config
```

#### Investor Operations

```bash
# Deposit to escrow
make integration-localnet-deposit_to_escrow

# Add liquidity to Raydium strategy
make integration-localnet-add_liquidity_raydium_vault_strategy

# Remove liquidity from Raydium strategy
make integration-localnet-remove_liquidity_raydium_vault_strategy
```

## Development Workflow

### 1. Complete Local Development Flow

```bash
# Start test validator
make start-test-validator-from-dump-mainnet

# In another terminal:
# Build and deploy
make build && make deploy-localnet

# Set up test environment
make setup-test-localnet

# Run the complete test suite
make integration-localnet-create_protocol_config
make integration-localnet-create_vault_strategy_config
make integration-localnet-create_raydium_vault_strategy
make integration-localnet-activate_vault_strategy_config
make integration-localnet-deposit_to_escrow
make integration-localnet-add_liquidity_raydium_vault_strategy
make integration-localnet-remove_liquidity_raydium_vault_strategy
```

### 2. Generate Trading Fees (Testing)

```bash
# Generate fees for testing fee collection
make generate-fees-localnet
```

### 3. Code Formatting

```bash
# Check code formatting
yarn lint

# Fix formatting issues
yarn lint:fix
```

## Key Components

### Smart Contract Instructions

- `init_protocol_config` - Initialize protocol settings
- `init_vault_strategy_config` - Create strategy configurations
- `create_raydium_vault_strategy` - Deploy Raydium-specific strategies
- `deposit_to_escrow` - Secure token deposits
- `add_liquidity_raydium_vault_strategy` - Add liquidity to strategies
- `remove_liquidity_raydium_vault_strategy` - Remove liquidity and collect fees

### State Accounts

- `ProtocolConfig` - Global protocol settings
- `VaultStrategyConfig` - Strategy-specific configurations
- `VaultStrategy` - Individual strategy instances
- `InvestorEscrow` - Secure token storage
- `InvestorStrategyPosition` - Track investor positions

### Integration Features

- **Raydium CLMM Integration**: Concentrated liquidity market making
- **Pyth Price Feeds**: Real-time price data for strategies
- **Token2022 Support**: Enhanced token standard compatibility
- **Multi-token Support**: USDC, WSOL, and custom tokens

## Troubleshooting

### Common Issues

1. **Program Build Fails**

   ```bash
   # Clean and rebuild
   anchor clean
   make build
   ```

2. **Test Validator Won't Start**

   ```bash
   # Kill existing processes
   pkill -f solana-test-validator
   # Restart
   make start-test-validator-from-dump-mainnet
   ```

3. **Insufficient SOL for Transactions**

   ```bash
   # Airdrop more SOL
   solana airdrop 10
   ```

4. **Account Already Exists Errors**
   ```bash
   # Reset test validator
   make start-test-validator-from-dump-mainnet
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests to ensure everything works
5. Submit a pull request

## License

MIT License
