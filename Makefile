
sync-keys:
	anchor keys sync
	
build:
	anchor build -- --features localnet

build-devnet:
	anchor build -- --features devnet

deploy-devnet:
	anchor deploy --provider.cluster devnet

deploy-localnet:
	anchor build -- --features localnet
	anchor deploy --provider.cluster localnet

anchor-test-skip:
	anchor test --skip-local-validator

set-config-localnet:
	solana config set --url localhost 

set-config-devnet:
	solana config set --url devnet

start-test-validator-from-dump-mainnet:
	solana-test-validator \
	--account HahodTH8xKs75YGSmoRfafZgSFc8ETQrkJ4m2Riu5nh5 ./tests/fixtures/mocked_usdc.json \
	--account 3HuUDVWtrnREWQ4cJe73zQtzmGFcUvXoQ9muW9hUJYiy ./tests/fixtures/token_a.json \
	--account 38PUGotm6MA39BU3aVRNB5VufUa9ktmiXTbRWx1A7aQJ ./tests/fixtures/token_b.json \
	--account 7snxFvjJMkmjqSD95WrjwKQNYzuSdinTyTvnySEpun8a ./tests/fixtures/creator_wsol_ata.json \
	--account AsmswceAQpVHfQerEPKRNJ6WmmckS2mmFNy5LM6WV8Um ./tests/fixtures/master_wsol_ata.json \
	--account 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE ./tests/fixtures/pyth_sol_usd_mainnet.json \
	--account Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX ./tests/fixtures/pyth_usdc_usd_mainnet.json \
	--account 9iFER3bpjf1PTTCQCfTRu17EJgvsxo9pVyA9QWwEuX4x ./tests/fixtures/amm_config_mainnet.json \
	--bpf-program CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK ./tests/fixtures/clmm_mainnet.so \
	--bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s ./tests/fixtures/metadata_program_mainnet.so \
	--reset

######################### LOCALNET ########################################

setup-test-localnet:
	make set-config-localnet
	solana airdrop 1000 Fpyrsw2o2vCh73ggvJY9QdWfYouhzCs27TwTgxkHFA9n
	solana airdrop 1000 CrtNgYZaY74eqADuHxCYbQNsh33dBrAbkr71N7YSDoqE
	export ENV=localnet && ts-node ./app/setup.ts

generate-fees-localnet:
	make set-config-localnet
	export ENV=localnet && ts-node ./app/generateFees.ts

integration-localnet-create_protocol_config:
	make set-config-localnet
	export ENV=localnet && make integration-create_protocol_config

integration-localnet-create_vault_strategy_config:
	make set-config-localnet
	export ENV=localnet && make integration-create_vault_strategy_config

integration-localnet-create_raydium_vault_strategy:
	make set-config-localnet
	export ENV=localnet && make integration-create_raydium_vault_strategy

integration-localnet-deposit_to_escrow:
	make set-config-localnet
	export ENV=localnet && make integration-deposit_to_escrow

integration-localnet-add_liquidity_raydium_vault_strategy:
	make set-config-localnet
	export ENV=localnet && make integration-add_liquidity_raydium_vault_strategy

integration-localnet-remove_liquidity_raydium_vault_strategy:
	make set-config-localnet
	export ENV=localnet && make integration-remove_liquidity_raydium_vault_strategy
 

######################### - ################################################

######################### DEVNET ########################################

setup-test-env-devnet:
	make set-config-devnet
	export ENV=devnet && ts-node ./app/setup.ts

generate-fees-devnet:
	make set-config-devnet
	export ENV=devnet && ts-node ./app/generateFees.ts

integration-devnet-create_protocol_config:
	make set-config-devnet
	export ENV=devnet && make integration-create_protocol_config

integration-devnet-create_vault_strategy_config:
	make set-config-devnet
	export ENV=devnet && make integration-create_vault_strategy_config

integration-devnet-create_raydium_vault_strategy:
	make set-config-devnet
	export ENV=devnet && make integration-create_raydium_vault_strategy

integration-devnet-deposit_to_escrow:
	make set-config-devnet
	export ENV=devnet && make integration-deposit_to_escrow

integration-devnet-add_liquidity_raydium_vault_strategy:
	make set-config-devnet
	export ENV=devnet && make integration-add_liquidity_raydium_vault_strategy

integration-devnet-remove_liquidity_raydium_vault_strategy:
	make set-config-devnet
	export ENV=devnet && make integration-remove_liquidity_raydium_vault_strategy

######################### - ################################################

integration-create_protocol_config: 
	yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/integration/admin/init_protocol_config.test.ts 
# 	anchor test --skip-local-validator --run tests/integration/init_protocol_config.test.ts

integration-create_vault_strategy_config:  
	yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/integration/creator/init_vault_strategy_config.test.ts 

integration-create_raydium_vault_strategy:
	yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/integration/creator/create_raydium_vault_strategy.test.ts

integration-deposit_to_escrow:
	yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/integration/investor/deposit_to_escrow.test.ts

integration-add_liquidity_raydium_vault_strategy: 
	yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/integration/investor/add_liquidity_raydium_vault_strategy.test.ts

integration-remove_liquidity_raydium_vault_strategy: 
	yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/integration/investor/remove_liquidity_raydium_vault_strategy.test.ts


# 	solana program dump -u d DRayAUgENGQBKVaX8owNhgzkEDyoHTGVEGHVJT1E9pfH clmm_new_devnet.so 
# 	solana account -u l --output json-compact --output-file token_a.json 3HuUDVWtrnREWQ4cJe73zQtzmGFcUvXoQ9muW9hUJYiy
# 	 solana program extend YyUUJsRpeJ5fJEL6JBD7LKibaK43LXov4FzHs2w53J4 20000 
