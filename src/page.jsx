import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Connection, PublicKey } from '@solana/web3.js';
import { KaminoMarket, KaminoPool } from '@hubbleprotocol/kamino-sdk';
import { createV1 } from '@metaplex-foundation/mpl-token-metadata';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TokenCard, 
  PriceChart, 
  TokenCreationForm,
  LiquidityForm,
  Card, 
  Button
} from './components';
import { 
  useWallet,
  createToken,
  createMeteoraPool,
  addPoolLiquidity,
  removePoolLiquidity,
  formatAddress,
  formatAmount,
  getConstants,
  validateTokenData
} from './utils';

// Custom hook for memoized connection
const useConnection = () => {
  return useMemo(() => 
    new Connection(
      process.env.REACT_APP_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    ),
    []
  );
};

// Home Page Component
export const Home = () => {
  const connection = useConnection();
  const navigate = useNavigate();
  const [tokens, setTokens] = useState([]);
  const [activeTab, setActiveTab] = useState('trending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        setLoading(true);
        setError(null);

        const constants = getConstants();
        if (!constants) {
          throw new Error('Failed to initialize constants');
        }

        // Load Meteora market and get all pools
        const market = await KaminoMarket.load(
          connection,
          constants.METEORA_PROGRAM_ID,
          { commitment: 'confirmed' }
        );

        const pools = await market.getAllPools();
        
        // Process each pool to get detailed data
        const poolsData = await Promise.all(
          pools.map(async (pool) => {
            try {
              const poolState = await pool.getPoolState();
              
              let tokenMetadata;
              try {
                const metadataPDA = await createV1.findMetadataPda(poolState.tokenMintA);
                tokenMetadata = await createV1.getMetadata(metadataPDA);
              } catch (e) {
                console.log('No metadata found for token:', poolState.tokenMintA.toString());
              }
              
              return {
                address: pool.address.toString(),
                mintA: poolState.tokenMintA.toString(),
                mintB: poolState.tokenMintB.toString(),
                price: poolState.currentPrice.toFixed(6),
                volume24h: poolState.volume24h?.toFixed(2) || '0',
                tvl: poolState.tvl?.toFixed(2) || '0',
                name: tokenMetadata?.name || `Token ${formatAddress(poolState.tokenMintA.toString())}`,
                symbol: tokenMetadata?.symbol || `TKN${formatAddress(poolState.tokenMintA.toString(), 4)}`,
                metadata: tokenMetadata,
                timestamp: poolState.lastUpdateTime.toNumber()
              };
            } catch (error) {
              console.error(`Error loading pool data:`, error);
              return null;
            }
          })
        );

        const validPools = poolsData.filter(pool => pool !== null);
        
        const sortedByVolume = [...validPools].sort((a, b) => 
          parseFloat(b.volume24h) - parseFloat(a.volume24h)
        );
        const sortedByTimestamp = [...validPools].sort((a, b) => 
          b.timestamp - a.timestamp
        );

        setTokens({
          trending: sortedByVolume.slice(0, 10),
          newest: sortedByTimestamp.slice(0, 10),
          all: validPools
        });
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setError(error.message);
        toast.error('Failed to load tokens');
      } finally {
        setLoading(false);
      }
    };

    fetchTokens();
  }, [connection]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-8"
    >
      <Card className="p-6">
        <h1 className="text-3xl font-bold text-orange-100 mb-8">Token Explorer</h1>

        <div className="flex gap-4 mb-8">
          <Button
            variant={activeTab === 'trending' ? 'default' : 'outline'}
            onClick={() => setActiveTab('trending')}
          >
            Trending
          </Button>
          <Button
            variant={activeTab === 'newest' ? 'default' : 'outline'}
            onClick={() => setActiveTab('newest')}
          >
            Newest
          </Button>
          <Button
            variant={activeTab === 'all' ? 'default' : 'outline'}
            onClick={() => setActiveTab('all')}
          >
            All Tokens
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="animate-pulse h-64" />
              ))}
            </div>
          ) : error ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center py-8"
            >
              <p className="text-red-400 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tokens[activeTab]?.map((token) => (
                <TokenCard 
                  key={token.address} 
                  token={token}
                  onClick={() => navigate(`/token/${token.address}`)}
                />
              ))}
            </div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// Create Token Page Component
export const CreateToken = () => {
  const connection = useConnection();
  const navigate = useNavigate();
  const { connected, wallet } = useWallet();
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState('create');
  const [tokenData, setTokenData] = useState(null);

  useEffect(() => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      navigate('/');
    }
  }, [connected, navigate]);

  const handleCreateToken = async (formData) => {
    try {
      setCreating(true);

      // Validate token data
      const validation = validateTokenData(formData);
      if (!validation.isValid) {
        const errors = Object.values(validation.errors);
        errors.forEach(error => toast.error(error));
        return;
      }

      // Create token
      const token = await createToken(wallet, formData);

      // Create Meteora pool
      const pool = await createMeteoraPool(wallet, token.mint, {
        initialPrice: parseFloat(formData.initialPrice),
      });

      setTokenData({
        ...token,
        pool_address: pool.poolAddress,
        initial_price: formData.initialPrice,
      });

      toast.success('Token created successfully!');
      setStep('liquidity');
    } catch (error) {
      console.error('Token creation error:', error);
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleAddLiquidity = async (liquidityData) => {
    if (!tokenData?.pool_address) {
      toast.error('Pool address not found');
      return;
    }

    try {
      setCreating(true);

      await addPoolLiquidity(
        wallet,
        tokenData.pool_address,
        liquidityData.tokenAmount,
        liquidityData.solAmount
      );

      toast.success('Liquidity added successfully!');
      navigate(`/token/${tokenData.mint}`);
    } catch (error) {
      console.error('Add liquidity error:', error);
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container max-w-2xl mx-auto px-4 py-8"
    >
      <Card className="p-6">
        <h1 className="text-3xl font-bold text-orange-100 mb-8">
          {step === 'create' ? 'Create New Token' : 'Add Initial Liquidity'}
        </h1>

        {step === 'create' ? (
          <TokenCreationForm 
            onSubmit={handleCreateToken}
            isCreating={creating}
          />
        ) : (
          <LiquidityForm
            token={tokenData}
            onSubmit={handleAddLiquidity}
            onCancel={() => setStep('create')}
            isLoading={creating}
            isAdding={true}
          />
        )}
      </Card>
    </motion.div>
  );
};

// Token Details Page Component
export const TokenDetails = () => {
  const connection = useConnection();
  const { tokenAddress } = useParams();
  const { connected, wallet, publicKey } = useWallet();
  const [tokenData, setTokenData] = useState(null);
  const [poolData, setPoolData] = useState(null);
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showLiquidityForm, setShowLiquidityForm] = useState(false);
  const [isAddingLiquidity, setIsAddingLiquidity] = useState(true);

  useEffect(() => {
    const fetchTokenDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const pool = await KaminoPool.load(
          connection,
          new PublicKey(tokenAddress),
          { commitment: 'confirmed' }
        );
        
        const poolState = await pool.getPoolState();
        
        let tokenMetadata;
        try {
          const metadataPDA = await createV1.findMetadataPda(poolState.tokenMintA);
          tokenMetadata = await createV1.getMetadata(metadataPDA);
        } catch (e) {
          console.log('No metadata found for token');
        }

        setTokenData({
          address: tokenAddress,
          name: tokenMetadata?.name || 'Unknown Token',
          symbol: tokenMetadata?.symbol || 'UNKNOWN',
          metadata: tokenMetadata
        });

        setPoolData({
          address: tokenAddress,
          price: poolState.currentPrice.toFixed(6),
          volume24h: poolState.volume24h.toFixed(2),
          tvl: poolState.tvl.toFixed(2),
          fee: (poolState.fee * 100).toFixed(2),
          rewardRate: poolState.rewardRate?.toFixed(6) || '0',
          tokenABalance: poolState.tokenAAmount.toFixed(6),
          tokenBBalance: poolState.tokenBAmount.toFixed(6)
        });

        if (connected && publicKey) {
          const userPositionData = await pool.getUserPosition(publicKey);
          if (userPositionData) {
            setUserPosition({
              lpTokenBalance: userPositionData.lpTokenBalance.toString(),
              tokenAAmount: userPositionData.tokenAAmount.toString(),
              tokenBAmount: userPositionData.tokenBAmount.toString(),
              unclaimedRewards: userPositionData.unclaimedRewards?.toString() || '0'
            });
          }
        }
      } catch (error) {
        console.error('Error fetching token details:', error);
        setError(error.message);
        toast.error('Failed to load token details');
      } finally {
        setLoading(false);
      }
    };

    fetchTokenDetails();
  }, [tokenAddress, connected, publicKey, connection]);

  const handleLiquidityAction = async (formData) => {
    try {
      setLoading(true);

      if (isAddingLiquidity) {
        await addPoolLiquidity(
          wallet,
          tokenAddress,
          formData.tokenAmount,
          formData.solAmount
        );
        toast.success('Liquidity added successfully!');
      } else {
        await removePoolLiquidity(
          wallet,
          tokenAddress,
          formData.lpTokenAmount
        );
        toast.success('Liquidity removed successfully!');
      }

      // Refresh pool data
      window.location.reload();
    } catch (error) {
      console.error('Liquidity action error:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
      setShowLiquidityForm(false);
    }
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto px-4 py-8"
      >
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-orange-500/10 rounded w-1/4" />
            <div className="h-6 bg-orange-500/10 rounded w-1/2" />
            <div className="h-64 bg-orange-500/10 rounded" />
          </div>
        </Card>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto px-4 py-8"
      >
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Token</h2>
            <p className="text-orange-200 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <h1 className="text-3xl font-bold text-orange-100 mb-6">
              {tokenData?.name || 'Token Details'}
            </h1>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 bg-black/20 rounded-xl border border-orange-500/20">
                <p className="text-sm text-orange-400">Price</p>
                <p className="text-lg font-semibold text-orange-100">{poolData?.price} SOL</p>
              </div>
              <div className="p-4 bg-black/20 rounded-xl border border-orange-500/20">
                <p className="text-sm text-orange-400">24h Volume</p>
                <p className="text-lg font-semibold text-orange-100">{poolData?.volume24h} SOL</p>
              </div>
              <div className="p-4 bg-black/20 rounded-xl border border-orange-500/20">
                <p className="text-sm text-orange-400">TVL</p>
                <p className="text-lg font-semibold text-orange-100">{poolData?.tvl} SOL</p>
              </div>
            </div>

            {connected && userPosition && (
              <Card className="bg-black/20 mb-6 border border-orange-500/20">
                <div className="p-4">
                  <h3 className="font-semibold text-orange-100 mb-4">Your Position</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-orange-400">Token Amount</p>
                      <p className="font-medium text-orange-100">
                        {formatAmount(userPosition.tokenAAmount)} {tokenData.symbol}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-orange-400">SOL Amount</p>
                      <p className="font-medium text-orange-100">
                        {formatAmount(userPosition.tokenBAmount)} SOL
                      </p>
                    </div>
                  </div>
                  {parseFloat(userPosition.unclaimedRewards) > 0 && (
                    <div className="mt-4">
                      <p className="text-sm text-orange-400 mb-2">Unclaimed Rewards</p>
                      <p className="font-medium text-orange-100">
                        {formatAmount(userPosition.unclaimedRewards)} SOL
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            <Card className="bg-black/20 border border-orange-500/20">
              <div className="p-4">
                <h3 className="font-semibold text-orange-100 mb-4">Pool Stats</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-orange-400">Fee Rate</span>
                    <span className="text-orange-100">{poolData?.fee}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-400">Token Liquidity</span>
                    <span className="text-orange-100">{formatAmount(poolData?.tokenABalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-400">SOL Liquidity</span>
                    <span className="text-orange-100">{formatAmount(poolData?.tokenBBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-orange-400">Reward Rate</span>
                    <span className="text-orange-100">{formatAmount(poolData?.rewardRate)} SOL/day</span>
                  </div>
                </div>
              </div>
            </Card>

            {connected && (
              <div className="flex gap-4 mt-6">
                <Button
                  onClick={() => {
                    setIsAddingLiquidity(true);
                    setShowLiquidityForm(true);
                  }}
                  className="flex-1"
                >
                  Add Liquidity
                </Button>
                {userPosition && parseFloat(userPosition.lpTokenBalance) > 0 && (
                  <Button
                    onClick={() => {
                      setIsAddingLiquidity(false);
                      setShowLiquidityForm(true);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Remove Liquidity
                  </Button>
                )}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <PriceChart tokenAddress={tokenAddress} />
        </div>
      </div>

      <AnimatePresence>
        {showLiquidityForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <LiquidityForm
              token={tokenData}
              onSubmit={handleLiquidityAction}
              onCancel={() => setShowLiquidityForm(false)}
              isLoading={loading}
              isAdding={isAddingLiquidity}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Profile Page Component
export const Profile = () => {
  const connection = useConnection();
  const navigate = useNavigate();
  const { connected, publicKey } = useWallet();
  const [tokens, setTokens] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!connected) {
      navigate('/');
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        const constants = getConstants();
        const market = await KaminoMarket.load(
          connection,
          constants.METEORA_PROGRAM_ID,
          { commitment: 'confirmed' }
        );

        // Fetch created tokens
        const allPools = await market.getAllPools();
        const userPools = allPools.filter(pool => 
          pool.state.owner.equals(publicKey)
        );

        const poolData = await Promise.all(
          userPools.map(async (pool) => {
            try {
              const state = await pool.getPoolState();
              let metadata;
              try {
                const metadataPDA = await createV1.findMetadataPda(state.tokenMintA);
                metadata = await createV1.getMetadata(metadataPDA);
              } catch (e) {
                console.log('No metadata for:', state.tokenMintA.toString());
              }

              return {
                address: pool.address.toString(),
                name: metadata?.name || `Token ${formatAddress(state.tokenMintA.toString())}`,
                symbol: metadata?.symbol || 'UNKNOWN',
                price: state.currentPrice.toString(),
                volume24h: state.volume24h.toString(),
                tvl: state.tvl.toString()
              };
            } catch (error) {
              console.error('Error fetching pool data:', error);
              return null;
            }
          })
        );

        setTokens(poolData.filter(token => token !== null));

        // Fetch user positions
        const userPositions = await Promise.all(
          allPools.map(async (pool) => {
            try {
              const position = await pool.getUserPosition(publicKey);
              if (!position || position.lpTokenBalance.isZero()) return null;

              const state = await pool.getPoolState();
              return {
                poolAddress: pool.address.toString(),
                tokenAmount: position.tokenAAmount.toString(),
                solAmount: position.tokenBAmount.toString(),
                lpBalance: position.lpTokenBalance.toString(),
                rewards: position.unclaimedRewards?.toString() || '0',
                tokenMint: state.tokenMintA.toString()
              };
            } catch (error) {
              console.error('Error fetching position:', error);
              return null;
            }
          })
        );

        setPositions(userPositions.filter(pos => pos !== null));
      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [connected, publicKey, connection, navigate]);

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto px-4 py-8"
      >
        <Card className="p-6">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-orange-500/10 rounded w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-orange-500/10 rounded-xl" />
              ))}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="container mx-auto px-4 py-8"
      >
        <Card className="p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error Loading Profile</h2>
            <p className="text-orange-200 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="container mx-auto px-4 py-8"
    >
      <div className="space-y-8">
        <Card className="p-6">
          <h2 className="text-2xl font-bold text-orange-100 mb-6">Your Tokens</h2>
          {tokens.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-orange-200 mb-4">You haven't created any tokens yet</p>
              <Button onClick={() => navigate('/create')}>
                Create Your First Token
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tokens.map(token => (
                <TokenCard
                  key={token.address}
                  token={token}
                  onClick={() => navigate(`/token/${token.address}`)}
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h2 className="text-2xl font-bold text-orange-100 mb-6">Your Positions</h2>
          {positions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-orange-200">You don't have any active positions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {positions.map(position => (
                <Card
                  key={position.poolAddress}
                  className="bg-black/20 border border-orange-500/20"
                >
                  <div className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-orange-100">
                          {formatAddress(position.poolAddress)}
                        </h3>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                          <div>
                            <p className="text-sm text-orange-400">Token Amount</p>
                            <p className="font-medium text-orange-100">
                              {formatAmount(position.tokenAmount)}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-orange-400">SOL Amount</p>
                            <p className="font-medium text-orange-100">
                              {formatAmount(position.solAmount)}
                            </p>
                          </div>
                        </div>
                        {parseFloat(position.rewards) > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-orange-400">Unclaimed Rewards</p>
                            <p className="font-medium text-orange-100">
                              {formatAmount(position.rewards)} SOL
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/token/${position.poolAddress}`)}
                      >
                        Manage
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
};


