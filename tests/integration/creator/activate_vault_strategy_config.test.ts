import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { TokenizedVaultsProgram } from '../../../target/types/tokenized_vaults_program'
import {
  PublicKey,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js'
import { expect } from 'chai'
import { _creatorWallet, connection, setupDotEnv } from '../../../app/config'
import { VAULT_STRATEGY_CONFIG_NAME } from '../constants'
import { airdrop } from '../../../app/utils'

setupDotEnv()

describe('activate-vault-strategy-config', () => {
  const creator = _creatorWallet

  const provider = new anchor.AnchorProvider(
    connection as any,
    new anchor.Wallet(creator as any),
    {
      commitment: 'confirmed',
    }
  )
  anchor.setProvider(provider)

  const program = anchor.workspace
    .tokenizedVaultsProgram as Program<TokenizedVaultsProgram>
  const programId = program.programId

  const [vaultStrategyConfigPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('vault_strategy_config:'),
      creator.publicKey.toBuffer(),
      Buffer.from(VAULT_STRATEGY_CONFIG_NAME),
    ],
    programId
  )

  before(async () => {
    console.log('Running tests on ', process.env.ENV)
    console.log('Creator address:', creator.publicKey.toString())

    const creatorBalance = await connection.getBalance(creator.publicKey)
    console.log('Creator balance:', creatorBalance / LAMPORTS_PER_SOL, 'SOL')

    if (creatorBalance < LAMPORTS_PER_SOL) {
      await airdrop(
        connection as any,
        creator.publicKey,
        200 * LAMPORTS_PER_SOL
      )
    }
  })

  // it('Should fail to activate vault strategy config with insufficient percentage', async () => {
  //   const vaultStrategyConfigAccountBefore =
  //     await program.account.vaultStrategyConfig.fetch(vaultStrategyConfigPda)

  //   console.log('Status before:', vaultStrategyConfigAccountBefore.status)
  //   expect(vaultStrategyConfigAccountBefore.status.draft).to.not.be.undefined

  //   expect(
  //     vaultStrategyConfigAccountBefore.strategies.length
  //   ).to.be.greaterThan(0)

  //   const totalPercentage = vaultStrategyConfigAccountBefore.percentages.reduce(
  //     (sum: number, percentage: number) => sum + percentage,
  //     0
  //   )
  //   console.log('Current total percentage:', totalPercentage)
  //   expect(totalPercentage).to.not.equal(1_000_000)

  //   try {
  //     const tx = await program.methods
  //       .activateVaultStrategyConfig()
  //       .accounts({
  //         creator: creator.publicKey,
  //         vaultStrategyConfig: vaultStrategyConfigPda,
  //       })
  //       .signers([creator])
  //       .transaction()

  //     await sendAndConfirmTransaction(connection as any, tx as any, [creator], {
  //       skipPreflight: false,
  //       preflightCommitment: 'finalized',
  //     })

  //     expect.fail('Expected transaction to fail due to insufficient percentage')
  //   } catch (error: any) {
  //     expect(error.toString()).to.include('InvalidVaultStrategyPercentage')
  //   }
  // })

  it('Activate Vault Strategy Config (skip for now - needs 100% allocation)', async () => {
    const tx = await program.methods
      .activateVaultStrategyConfig()
      .accounts({
        creator: creator.publicKey,
        vaultStrategyConfig: vaultStrategyConfigPda,
      })
      .signers([creator])
      .transaction()

    const txSignature = await sendAndConfirmTransaction(
      connection as any,
      tx as any,
      [creator],
      {
        skipPreflight: false,
        preflightCommitment: 'finalized',
      }
    )

    console.log(`Transaction signature: ${txSignature}`)

    const vaultStrategyConfigAccountAfter =
      await program.account.vaultStrategyConfig.fetch(vaultStrategyConfigPda)

    console.log('Status after:', vaultStrategyConfigAccountAfter.status)
    expect(vaultStrategyConfigAccountAfter.status.active).to.not.be.undefined

    expect(vaultStrategyConfigAccountAfter.creator.toBase58()).to.equal(
      creator.publicKey.toBase58()
    )
    expect(vaultStrategyConfigAccountAfter.name).to.equal(
      VAULT_STRATEGY_CONFIG_NAME
    )
  })

  // it('Should fail to activate vault strategy config when already active (skipped)', async () => {
  //   return
  // })
})
