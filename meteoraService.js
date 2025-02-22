import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { KaminoMarket, KaminoPool } from '@hubbleprotocol/kamino-sdk';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import { createV1, TokenStandard } from '@metaplex-foundation/mpl-token-metadata';

// Constants
export const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
export const connection = new Connection(SOLANA_RPC, 'confirmed');
export const METEORA_PROGRAM_ID = new PublicKey('PKMnc2wqBxKYLZcxFEwAyfhwXiXvn3qP8kKrufBNzrq8');
export const SOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// Error handling
class MeteoraError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'MeteoraError';
    this.code = code;
  }
}

// Utility functions
const validateMint = (mintAddress) => {
  try {
    return new PublicKey(mintAddress);
  } catch {
    throw new MeteoraError('Invalid mint address', 'INVALID_MINT');
  }
};

const calculateMinimumLiquidity = (supply, price) => {
  const minLiquidityPercentage = 0.1; // 10%
  return {
    tokenAmount: supply * minLiquidityPercentage,
    solAmount: (supply * minLiquidityPercentage) * price
  };
};

// Token Creation
export const createToken = async (wallet, tokenData) => {
  if (!wallet || !wallet.publicKey) {
    throw new MeteoraError('Wallet not connected', 'WALLET_NOT_CONNECTED');
  }

  try {
    // Validate balance
    const balance = await connection.getBalance(wallet.publicKey);
    const requiredBalance = 0.1; // SOL
    if (balance < requiredBalance * LAMPORTS_PER_SOL) {
      throw new MeteoraError(`Insufficient balance. Required: ${requiredBalance} SOL`, 'INSUFFICIENT_BALANCE');
    }

    // Create token mint
    const mint = await createMint(
      connection,
      wallet,
      wallet.publicKey,
      wallet.publicKey,
      tokenData.decimals || 9
    );

    // Create token account
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet,
      mint,
      wallet.publicKey
    );

    // Create metadata
    await createV1(connection, {
      mint,
      authority: wallet.publicKey,
      name: tokenData.name,
      symbol: tokenData.symbol,
      uri: tokenData.metadataUri || '',
      sellerFeeBasisPoints: 0,
      tokenStandard: TokenStandard.Fungible,
    }).sendAndConfirm(connection);

    // Mint initial supply
    const supplyBN = BigInt(Math.floor(tokenData.supply * Math.pow(10, tokenData.decimals || 9)));
    await mintTo(
      connection,
      wallet,
      mint,
      tokenAccount.address,
      wallet.publicKey,
      supplyBN
    );

    return {
      mint: mint.toString(),
      tokenAccount: tokenAccount.address.toString(),
      supply: supplyBN.toString()
    };
  } catch (error) {
    throw new MeteoraError(
      `Failed to create token: ${error.message}`,
      'TOKEN_CREATION_FAILED'
    );
  }
};

// Pool Creation and Management
export const createPool = async (wallet, {
  tokenMint,
  initialPrice,
  initialTokenAmount,
  initialSolAmount
}) => {
  try {
    const market = await KaminoMarket.load(
      connection,
      METEORA_PROGRAM_ID
    );

    const poolConfig = {
      tokenMintA: validateMint(tokenMint),
      tokenMintB: SOL_MINT,
      fee: 0.003, // 0.3% fee
    };

    const pool = await market.createPool(poolConfig);

    if (initialTokenAmount > 0 && initialSolAmount > 0) {
      await pool.addLiquidity(
        wallet.publicKey,
        initialTokenAmount,
        initialSolAmount
      );
    }

    return pool;
  } catch (error) {
    throw new MeteoraError(
      `Failed to create pool: ${error.message}`,
      'POOL_CREATION_FAILED'
    );
  }
};

export const getPool = async (poolAddress) => {
  try {
    return await KaminoPool.load(
      connection,
      new PublicKey(poolAddress)
    );
  } catch (error) {
    throw new MeteoraError(
      `Failed to load pool: ${error.message}`,
      'POOL_LOAD_FAILED'
    );
  }
};

export const getPoolState = async (poolAddress) => {
  try {
    const pool = await getPool(poolAddress);
    const state = await pool.getPoolState();
    
    return {
      tokenMintA: state.tokenMintA.toString(),
      tokenMintB: state.tokenMintB.toString(),
      fee: state.fee,
      currentPrice: state.currentPrice,
      tokenABalance: state.tokenAAmount,
      tokenBBalance: state.tokenBAmount,
      tvl: state.tvl,
      volume24h: state.volume24h,
      rewardRate: state.rewardRate,
      lastUpdateTime: state.lastUpdateTime
    };
  } catch (error) {
    throw new MeteoraError(
      `Failed to get pool state: ${error.message}`,
      'POOL_STATE_FAILED'
    );
  }
};

// Liquidity Operations
export const addLiquidity = async (wallet, poolAddress, tokenAmount, solAmount) => {
  try {
    const pool = await getPool(poolAddress);
    const tx = await pool.addLiquidity(
      wallet.publicKey,
      tokenAmount,
      solAmount
    );
    return tx.signature;
  } catch (error) {
    throw new MeteoraError(
      `Failed to add liquidity: ${error.message}`,
      'ADD_LIQUIDITY_FAILED'
    );
  }
};

export const removeLiquidity = async (wallet, poolAddress, lpTokenAmount) => {
  try {
    const pool = await getPool(poolAddress);
    const tx = await pool.removeLiquidity(
      wallet.publicKey,
      lpTokenAmount
    );
    return tx.signature;
  } catch (error) {
    throw new MeteoraError(
      `Failed to remove liquidity: ${error.message}`,
      'REMOVE_LIQUIDITY_FAILED'
    );
  }
};

// Trading Operations
export const swap = async (wallet, poolAddress, inputMint, inputAmount, minOutputAmount) => {
  try {
    const pool = await getPool(poolAddress);
    const tx = await pool.swap(
      wallet.publicKey,
      validateMint(inputMint),
      inputAmount,
      minOutputAmount
    );
    return tx.signature;
  } catch (error) {
    throw new MeteoraError(
      `Failed to execute swap: ${error.message}`,
      'SWAP_FAILED'
    );
  }
};

// Position Management
export const getUserPosition = async (wallet, poolAddress) => {
  try {
    const pool = await getPool(poolAddress);
    const position = await pool.getUserPosition(wallet.publicKey);
    
    if (!position) {
      return null;
    }

    return {
      lpTokenBalance: position.lpTokenBalance,
      tokenAAmount: position.tokenAAmount,
      tokenBAmount: position.tokenBAmount,
      unclaimedRewards: position.unclaimedRewards
    };
  } catch (error) {
    throw new MeteoraError(
      `Failed to get user position: ${error.message}`,
      'GET_POSITION_FAILED'
    );
  }
};

export const claimRewards = async (wallet, poolAddress) => {
  try {
    const pool = await getPool(poolAddress);
    const tx = await pool.claimRewards(wallet.publicKey);
    return tx.signature;
  } catch (error) {
    throw new MeteoraError(
      `Failed to claim rewards: ${error.message}`,
      'CLAIM_REWARDS_FAILED'
    );
  }
};

// Market Data
export const getMarketStats = async () => {
  try {
    const market = await KaminoMarket.load(
      connection,
      METEORA_PROGRAM_ID
    );

    const pools = await market.getAllPools();
    const poolStats = await Promise.all(
      pools.map(async (pool) => {
        try {
          const state = await pool.getPoolState();
          return {
            address: pool.address.toString(),
            tokenMintA: state.tokenMintA.toString(),
            tokenMintB: state.tokenMintB.toString(),
            price: state.currentPrice,
            volume24h: state.volume24h,
            tvl: state.tvl,
            fee: state.fee,
            rewardRate: state.rewardRate
          };
        } catch {
          return null;
        }
      })
    );

    return poolStats.filter(stats => stats !== null);
  } catch (error) {
    throw new MeteoraError(
      `Failed to get market stats: ${error.message}`,
      'MARKET_STATS_FAILED'
    );
  }
};

// Trade History
export const getTradeHistory = async (poolAddress, startTime) => {
  try {
    const pool = await getPool(poolAddress);
    const trades = await pool.getTradeHistory(startTime);
    
    return trades.map(trade => ({
      timestamp: trade.timestamp,
      price: trade.price,
      amount: trade.amount,
      side: trade.side,
      fee: trade.fee
    }));
  } catch (error) {
    throw new MeteoraError(
      `Failed to get trade history: ${error.message}`,
      'TRADE_HISTORY_FAILED'
    );
  }
};

// Utility Exports
export const utils = {
  calculateMinimumLiquidity,
  validateMint
};