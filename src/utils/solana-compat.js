import { Connection, PublicKey} from '@solana/web3.js';

// Enhanced connection class that works with both versions
export class CompatibleConnection extends Connection {
  constructor(endpoint, commitmentOrConfig) {
    super(endpoint, commitmentOrConfig);
    
    // Store the original methods we need to wrap
    this._originalGetAccountInfo = this.getAccountInfo.bind(this);
    this._originalGetProgramAccounts = this.getProgramAccounts.bind(this);
  }

  // Override methods that might have version-specific behaviors
  async getAccountInfo(publicKey, commitment) {
    try {
      const result = await this._originalGetAccountInfo(publicKey, commitment);
      // Add compatibility transformations if needed
      return result;
    } catch (error) {
      console.error('Error in getAccountInfo:', error);
      throw error;
    }
  }

  // Helper method to create consistent public keys across versions
  static createPubkey(value) {
    if (typeof value === 'string') {
      return new PublicKey(value);
    }
    return value;
  }

  // Helper for consistent transaction processing
  async sendAndConfirmCompatible(transaction, signers, options = {}) {
    try {
      // Ensure consistent behavior across versions
      const latestBlockhash = await this.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = signers[0].publicKey;

      // Sign transaction
      signers.forEach((signer) => {
        transaction.partialSign(signer);
      });

      // Send and confirm with retry logic
      const signature = await this.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: options.skipPreflight || false,
          preflightCommitment: options.preflightCommitment || 'confirmed',
        }
      );

      await this.confirmTransaction(signature);
      return signature;
    } catch (error) {
      console.error('Error in sendAndConfirmCompatible:', error);
      throw error;
    }
  }
}

// Export utility functions that maintain compatibility
export const createCompatibleWallet = (keypair) => {
  return {
    publicKey: keypair.publicKey,
    signTransaction: async (tx) => {
      tx.partialSign(keypair);
      return tx;
    },
    signAllTransactions: async (txs) => {
      return txs.map((tx) => {
        tx.partialSign(keypair);
        return tx;
      });
    },
  };
};

// Helper for consistent program derived addresses
export const findProgramAddress = async (seeds, programId) => {
  try {
    return await PublicKey.findProgramAddress(seeds, programId);
  } catch (error) {
    console.error('Error in findProgramAddress:', error);
    throw error;
  }
};