import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Connection, 
  PublicKey, 
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  createMint, 
  getOrCreateAssociatedTokenAccount, 
  mintTo,
} from '@solana/spl-token';
import { 
  createMetadataAccountV3,
} from '@metaplex-foundation/mpl-token-metadata';
import { 
  KaminoMarket, 
  KaminoPool,
} from '@hubbleprotocol/kamino-sdk';
import { toast } from 'react-hot-toast';

// Connection setup
export const connection = new Connection(
  process.env.REACT_APP_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
  {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  }
);

// Constants and Configurations
export const getConstants = () => {
  try {
    return {
      METEORA_PROGRAM_ID: new PublicKey('PKMnc2wqBxKYLZcxFEwAyfhwXiXvn3qP8kKrufBNzrq8'),
      SOL_MINT: new PublicKey('So11111111111111111111111111111111111111112'),
      MIN_BALANCE: 0.05,
      DEFAULT_SLIPPAGE: 0.01,
      REFRESH_INTERVAL: 10000,
      DEFAULT_FEE_BPS: 30,
      DEFAULT_TICK_SPACING: 64,
      TOKEN_METADATA_PROGRAM_ID: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
    };
  } catch (error) {
    console.error('Error initializing constants:', error);
    throw new Error('Failed to initialize blockchain constants');
  }
};

// Custom Error Class
class WalletError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'WalletError';
    this.code = code;
  }

  static CODES = {
    WALLET_NOT_FOUND: 'WALLET_NOT_FOUND',
    WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    TOKEN_CREATION_FAILED: 'TOKEN_CREATION_FAILED',
    POOL_CREATION_FAILED: 'POOL_CREATION_FAILED',
    TRANSACTION_FAILED: 'TRANSACTION_FAILED',
  };
}

// Wallet Context
const WalletContext = createContext(null);

// Wallet Provider Component
export const WalletProvider = ({ children }) => {
  const [wallet, setWallet] = useState(null);
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initializeWallet = async () => {
      const { solana } = window;
      
      if (solana?.isPhantom) {
        try {
          if (solana.isConnected) {
            const response = await solana.connect({ onlyIfTrusted: true });
            setWallet(solana);
            setConnected(true);
            setPublicKey(response.publicKey);
          }
        } catch (error) {
          console.error('Wallet auto-connect error:', error);
        }
      }
    };

    initializeWallet();
  }, []);

  const connectWallet = useCallback(async () => {
    try {
      setLoading(true);
      const { solana } = window;
      
      if (!solana?.isPhantom) {
        throw new WalletError(
          'Phantom wallet is not installed',
          WalletError.CODES.WALLET_NOT_FOUND
        );
      }

      const response = await solana.connect();
      setWallet(solana);
      setConnected(true);
      setPublicKey(response.publicKey);

      toast.success('Wallet connected successfully');
      return true;
    } catch (error) {
      console.error('Connect wallet error:', error);
      toast.error(error.message || 'Failed to connect wallet');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      if (wallet) {
        await wallet.disconnect();
      }
      setWallet(null);
      setConnected(false);
      setPublicKey(null);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect wallet error:', error);
      toast.error('Failed to disconnect wallet');
    }
  }, [wallet]);

  const signTransaction = useCallback(async (transaction) => {
    if (!wallet) {
      throw new WalletError(
        'Wallet not connected',
        WalletError.CODES.WALLET_NOT_CONNECTED
      );
    }

    try {
      return await wallet.signTransaction(transaction);
    } catch (error) {
      console.error('Sign transaction error:', error);
      throw new WalletError(
        'Failed to sign transaction',
        WalletError.CODES.TRANSACTION_FAILED
      );
    }
  }, [wallet]);

  const signAllTransactions = useCallback(async (transactions) => {
    if (!wallet) {
      throw new WalletError(
        'Wallet not connected',
        WalletError.CODES.WALLET_NOT_CONNECTED
      );
    }

    try {
      return await wallet.signAllTransactions(transactions);
    } catch (error) {
      console.error('Sign all transactions error:', error);
      throw new WalletError(
        'Failed to sign transactions',
        WalletError.CODES.TRANSACTION_FAILED
      );
    }
  }, [wallet]);

  const value = useMemo(() => ({
    wallet,
    connected,
    publicKey,
    loading,
    connectWallet,
    disconnectWallet,
    signTransaction,
    signAllTransactions
  }), [
    wallet,
    connected,
    publicKey,
    loading,
    connectWallet,
    disconnectWallet,
    signTransaction,
    signAllTransactions
  ]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

// Hook for accessing wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

// Token Creation
export const createToken = async (wallet, tokenData) => {
  if (!wallet || !wallet.publicKey) {
    throw new WalletError(
      'Wallet not connected',
      WalletError.CODES.WALLET_NOT_CONNECTED
    );
  }

  try {
    const constants = getConstants();
    if (!constants) {
      throw new WalletError(
        'Failed to initialize required constants',
        WalletError.CODES.TOKEN_CREATION_FAILED
      );
    }

    // Check wallet balance
    const balance = await connection.getBalance(wallet.publicKey);
    const requiredBalance = 0.1; // SOL
    if (balance < requiredBalance * LAMPORTS_PER_SOL) {
      throw new WalletError(
        `Insufficient balance. Required: ${requiredBalance} SOL`,
        WalletError.CODES.INSUFFICIENT_BALANCE
      );
    }

    // Create mint account
    const mint = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      wallet.publicKey,
      tokenData.decimals || 9,
      undefined,
      { commitment: 'confirmed' }
    );

    // Create token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mint,
      wallet.publicKey
    );

    // Create metadata
    const metadataData = {
      name: tokenData.name,
      symbol: tokenData.symbol,
      uri: tokenData.uri || '',
      sellerFeeBasisPoints: 0,
      creators: [{
        address: wallet.publicKey,
        verified: true,
        share: 100
      }],
      collection: null,
      uses: null,
    };

    // Create metadata account
    const metadataAccount = await createMetadataAccountV3(
      connection,
      wallet,
      mint,
      wallet.publicKey,
      wallet.publicKey,
      metadataData,
      { commitment: 'confirmed' }
    );

    // Mint initial supply
    const supplyBigInt = BigInt(tokenData.supply) * BigInt(10 ** (tokenData.decimals || 9));
    await mintTo(
      connection,
      wallet,
      mint,
      tokenAccount.address,
      wallet.publicKey,
      supplyBigInt,
      [],
      { commitment: 'confirmed' }
    );

    return {
      mint: mint.toString(),
      metadata: metadataAccount.toString(),
      tokenAccount: tokenAccount.address.toString(),
      initialSupply: supplyBigInt.toString(),
      decimals: tokenData.decimals || 9
    };
  } catch (error) {
    console.error('Create token error:', error);
    throw new WalletError(
      `Failed to create token: ${error.message}`,
      WalletError.CODES.TOKEN_CREATION_FAILED
    );
  }
};

// Meteora Pool Creation
export const createMeteoraPool = async (wallet, tokenMint, poolConfig) => {
  if (!wallet || !wallet.publicKey) {
    throw new WalletError(
      'Wallet not connected',
      WalletError.CODES.WALLET_NOT_CONNECTED
    );
  }

  try {
    const constants = getConstants();
    if (!constants) {
      throw new WalletError(
        'Failed to initialize constants',
        WalletError.CODES.POOL_CREATION_FAILED
      );
    }

    // Initialize Meteora market
    const market = await KaminoMarket.load(
      connection,
      constants.METEORA_PROGRAM_ID,
      { commitment: 'confirmed' }
    );

    // Validate initial price
    if (!poolConfig.initialPrice || poolConfig.initialPrice <= 0) {
      throw new Error('Initial price must be greater than 0');
    }

    // Configure pool parameters
    const poolParams = {
      tokenMintA: new PublicKey(tokenMint),
      tokenMintB: constants.SOL_MINT,
      feeBps: poolConfig.feeBps || constants.DEFAULT_FEE_BPS,
      tickSpacing: poolConfig.tickSpacing || constants.DEFAULT_TICK_SPACING,
      initialPrice: poolConfig.initialPrice,
    };

    // Create pool with retries
    const pool = await retryAsync(
      async () => await market.createPool(poolParams),
      3
    );

    // Wait for confirmation
    await connection.confirmTransaction(pool.createPoolTx, 'confirmed');

    return {
      poolAddress: pool.address.toString(),
      tokenMintA: tokenMint,
      tokenMintB: constants.SOL_MINT.toString(),
      initialPrice: poolConfig.initialPrice.toString(),
      feeBps: poolParams.feeBps,
      tickSpacing: poolParams.tickSpacing
    };
  } catch (error) {
    console.error('Create pool error:', error);
    throw new WalletError(
      `Failed to create pool: ${error.message}`,
      WalletError.CODES.POOL_CREATION_FAILED
    );
  }
};

// Pool Liquidity Management
export const addPoolLiquidity = async (wallet, poolAddress, tokenAmount, solAmount) => {
  if (!wallet || !wallet.publicKey) {
    throw new WalletError(
      'Wallet not connected',
      WalletError.CODES.WALLET_NOT_CONNECTED
    );
  }

  try {
    // Load pool
    const pool = await retryAsync(
      async () => await KaminoPool.load(
        connection,
        new PublicKey(poolAddress),
        { commitment: 'confirmed' }
      ),
      3
    );

    // Check token balance
    const tokenMintA = pool.state.tokenMintA;
    const tokenAccountA = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      tokenMintA,
      wallet.publicKey
    );

    const tokenBalance = await connection.getTokenAccountBalance(tokenAccountA.address);
    if (BigInt(tokenBalance.value.amount) < BigInt(tokenAmount)) {
      throw new Error('Insufficient token balance');
    }

    // Check SOL balance
    const solBalance = await connection.getBalance(wallet.publicKey);
    const requiredSol = solAmount + 0.01 * LAMPORTS_PER_SOL; // Add buffer for fees
    if (solBalance < requiredSol) {
      throw new Error('Insufficient SOL balance');
    }

    // Add liquidity with retries
    const tx = await retryAsync(
      async () => await pool.addLiquidity(
        wallet.publicKey,
        BigInt(tokenAmount),
        BigInt(solAmount),
        { commitment: 'confirmed' }
      ),
      3
    );

    // Wait for confirmation
    await connection.confirmTransaction(tx, 'confirmed');

    return {
      success: true,
      transaction: tx,
      tokenAmount: tokenAmount.toString(),
      solAmount: solAmount.toString()
    };
  } catch (error) {
    console.error('Add liquidity error:', error);
    throw new WalletError(
      `Failed to add liquidity: ${error.message}`,
      WalletError.CODES.TRANSACTION_FAILED
    );
  }
};

export const removePoolLiquidity = async (wallet, poolAddress, lpTokenAmount) => {
  if (!wallet || !wallet.publicKey) {
    throw new WalletError(
      'Wallet not connected',
      WalletError.CODES.WALLET_NOT_CONNECTED
    );
  }

  try {
    const pool = await KaminoPool.load(
      connection,
      new PublicKey(poolAddress),
      { commitment: 'confirmed' }
    );

    // Check LP token balance
    const lpTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      pool.state.lpMint,
      wallet.publicKey
    );

    const lpBalance = await connection.getTokenAccountBalance(lpTokenAccount.address);
    if (BigInt(lpBalance.value.amount) < BigInt(lpTokenAmount)) {
      throw new Error('Insufficient LP token balance');
    }

    // Remove liquidity with retries
    const tx = await retryAsync(
      async () => await pool.removeLiquidity(
        wallet.publicKey,
        BigInt(lpTokenAmount),
        { commitment: 'confirmed' }
      ),
      3
    );

    // Wait for confirmation
    await connection.confirmTransaction(tx, 'confirmed');

    return {
      success: true,
      transaction: tx,
      lpTokenAmount: lpTokenAmount.toString()
    };
  } catch (error) {
    console.error('Remove liquidity error:', error);
    throw new WalletError(
      `Failed to remove liquidity: ${error.message}`,
      WalletError.CODES.TRANSACTION_FAILED
    );
  }
};

// Market Data Functions
export const getPoolState = async (poolAddress) => {
  try {
    const pool = await KaminoPool.load(
      connection,
      new PublicKey(poolAddress),
      { commitment: 'confirmed' }
    );
    
    const state = await pool.getPoolState();
    
    return {
      tokenABalance: state.tokenAAmount.toString(),
      tokenBBalance: state.tokenBAmount.toString(),
      currentPrice: state.currentPrice.toString(),
      fee: state.fee.toString(),
      tvl: state.tvl.toString(),
      volume24h: state.volume24h.toString(),
      feeGrowthGlobalA: state.feeGrowthGlobalA.toString(),
      feeGrowthGlobalB: state.feeGrowthGlobalB.toString(),
      liquidity: state.liquidity.toString(),
      lastUpdateTime: state.lastUpdateTime.toString()
    };
  } catch (error) {
    console.error('Get pool state error:', error);
    throw error;
  }
};

// Utility Functions
export const formatAddress = (address, length = 4) => {
  if (!address) return '';
  return `${address.slice(0, length)}...${address.slice(-length)}`;
};

export const formatAmount = (amount, decimals = 6) => {
  if (!amount) return '0';
  return parseFloat(amount).toFixed(decimals);
};

export const calculatePriceImpact = (inputAmount, outputAmount, spotPrice) => {
  if (!inputAmount || !outputAmount || !spotPrice) return 0;
  const expectedOutput = inputAmount * spotPrice;
  return ((expectedOutput - outputAmount) / expectedOutput) * 100;
};

// Retry Mechanism
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const retryAsync = async (fn, maxAttempts = 3, delayMs = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.warn(`Attempt ${attempt} failed:`, error);
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(delayMs * attempt);
      }
    }
  }
  
  throw lastError;
};

// Transaction Utilities
export const sendAndConfirmTransaction = async (connection, transaction, signers) => {
  try {
    const latestBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = signers[0].publicKey;

    // Sign transaction
    for (const signer of signers) {
      transaction.partialSign(signer);
    }

    // Send and confirm with retry logic
    const signature = await retryAsync(async () => {
      const sig = await connection.sendRawTransaction(transaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });

      await connection.confirmTransaction({
        signature: sig,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });

      return sig;
    });

    return signature;
  } catch (error) {
    console.error('Transaction error:', error);
    throw new WalletError(
      `Transaction failed: ${error.message}`,
      WalletError.CODES.TRANSACTION_FAILED
    );
  }
};

// Validation Functions
export const validateTokenData = (tokenData) => {
  const errors = {};

  if (!tokenData.name?.trim()) {
    errors.name = 'Name is required';
  }

  if (!tokenData.symbol?.trim()) {
    errors.symbol = 'Symbol is required';
  } else if (tokenData.symbol.length > 10) {
    errors.symbol = 'Symbol must be 10 characters or less';
  }

  if (!tokenData.supply || isNaN(tokenData.supply) || tokenData.supply <= 0) {
    errors.supply = 'Supply must be a positive number';
  }

  if (!tokenData.decimals || isNaN(tokenData.decimals) || tokenData.decimals < 0 || tokenData.decimals > 9) {
    errors.decimals = 'Decimals must be between 0 and 9';
  }

  if (tokenData.initialPrice && (isNaN(tokenData.initialPrice) || tokenData.initialPrice <= 0)) {
    errors.initialPrice = 'Initial price must be a positive number';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

// Pool Calculation Functions
export const calculateTokenPrice = (poolState) => {
  if (!poolState || !poolState.tokenAAmount || !poolState.tokenBAmount) {
    return 0;
  }

  const tokenAAmount = BigInt(poolState.tokenAAmount);
  const tokenBAmount = BigInt(poolState.tokenBAmount);

  if (tokenAAmount === BigInt(0)) {
    return 0;
  }

  return Number(tokenBAmount) / Number(tokenAAmount);
};

export const calculateAPR = (poolState) => {
  if (!poolState || !poolState.volume24h || !poolState.tvl || poolState.tvl === 0) {
    return 0;
  }

  const dailyFees = (poolState.volume24h * poolState.fee);
  const annualFees = dailyFees * 365;
  return (annualFees / poolState.tvl) * 100;
};

// Number Formatting Functions
export const formatCurrency = (amount, decimals = 2) => {
  if (typeof amount !== 'number') return '0.00';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
};

export const formatPercentage = (value, decimals = 2) => {
  if (typeof value !== 'number') return '0.00%';
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    style: 'percent',
  }).format(value / 100);
};

// Date Formatting Functions
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const getTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  
  return 'just now';
};