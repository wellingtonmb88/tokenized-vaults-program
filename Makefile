
sync-keys:
	anchor keys sync
	
build:
	anchor build

deploy:
	anchor deploy

anchor-test-skip:
	anchor test --skip-local-validator


start-test-validator-from-dump-mainnet:
	solana-test-validator \
	--account HahodTH8xKs75YGSmoRfafZgSFc8ETQrkJ4m2Riu5nh5 ./tests/fixtures/mocked_usdc.json \
	--account 7snxFvjJMkmjqSD95WrjwKQNYzuSdinTyTvnySEpun8a ./tests/fixtures/creator_wsol_ata.json \
	--account AsmswceAQpVHfQerEPKRNJ6WmmckS2mmFNy5LM6WV8Um ./tests/fixtures/master_wsol_ata.json \
	--account 7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE ./tests/fixtures/pyth_sol_usd_mainnet.json \
	--account Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX ./tests/fixtures/pyth_usdc_usd_mainnet.json \
	--account 9iFER3bpjf1PTTCQCfTRu17EJgvsxo9pVyA9QWwEuX4x ./tests/fixtures/amm_config_mainnet.json \
	--bpf-program CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK ./tests/fixtures/clmm_mainnet.so \
	--bpf-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s ./tests/fixtures/metadata_program_mainnet.so \
	--reset

setup-test-env:
	ts-node ./app/setup.ts

integration-create_protocol_config_and_vault_strategy_config:
	yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/integration/init_protocol_config_test.ts
#	yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/integration/init_vault_strategy_config_test.ts
# 	anchor test --skip-local-validator --run tests/integration/init_protocol_config_test.ts
# 	anchor test --skip-local-validator --run tests/integration/init_vault_strategy_config_test.ts

integration-create_raydium_vault_strategy:
	make integration-create_protocol_config_and_vault_strategy_config
# 	anchor test --skip-local-validator --run tests/integration/create_raydium_vault_strategy_test.ts
	yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/integration/create_raydium_vault_strategy_test.ts
