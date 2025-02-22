import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { KaminoPool } from '@hubbleprotocol/kamino-sdk';
import { toast } from 'react-hot-toast';
import { useWallet } from './utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { Battery } from 'lucide-react';
import { 
  validateTokenData, 
  formatAddress, 
  formatAmount, 
  formatPercentage,
} from './utils';
// Base UI Components
const Card = React.forwardRef(({ className, ...props }, ref) => (
  <motion.div
    ref={ref}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className={`bg-gray-900/60 backdrop-blur-sm rounded-xl border border-orange-500/20 
              transform transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/30 ${className}`}
    {...props}
  />
));

const Button = React.forwardRef(({ className, variant = "default", size = "default", ...props }, ref) => {
  const variants = {
    default: "bg-gradient-to-r from-orange-600 to-orange-500 text-white hover:from-orange-500 hover:to-orange-400",
    destructive: "bg-red-600 text-white hover:bg-red-700",
    outline: "border border-orange-500/50 text-orange-100 hover:bg-orange-500/10",
    secondary: "bg-orange-800/50 text-orange-100 hover:bg-orange-700/50",
    ghost: "hover:bg-orange-500/10 text-orange-100"
  };

  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8"
  };

  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative inline-flex items-center justify-center rounded-xl font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500
        disabled:pointer-events-none disabled:opacity-50
        shadow-md hover:shadow-xl hover:shadow-orange-500/20
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...props}
    />
  );
});

// Token Card Component
export const TokenCard = ({ token, onClick }) => {
  const [animationStyles] = useState(() => ({
    animation: `
      floatX ${6 + Math.random() * 4}s ease-in-out infinite, 
      floatY ${8 + Math.random() * 4}s ease-in-out infinite, 
      rotate ${9 + Math.random() * 4}s ease-in-out infinite
    `
  }));

  return (
    <motion.div 
      onClick={onClick} 
      className="group cursor-pointer"
      whileHover={{ scale: 1.02 }}
      style={animationStyles}
    >
      <Card>
        <div className="relative aspect-[4/3]">
          <img 
            src={token.logoURI || "/api/placeholder/400/300"} 
            alt={token.symbol}
            className="w-full h-full object-cover rounded-t-xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-900/90" />
        </div>

        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                {token.name}
              </h3>
              <p className="text-gray-400">{token.symbol}</p>
            </div>
            <p className="text-2xl font-bold text-green-400">
              {formatAmount(token.price)} SOL
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center text-gray-300">
              <Battery className="w-4 h-4 text-orange-400 mr-2" />
              {formatAmount(token.volume24h)} SOL
            </div>
            <div className="flex items-center text-gray-300">
              <span className="text-orange-400 mr-2">⚡</span>
              {formatAmount(token.marketCap)} SOL
            </div>
          </div>

          {token.apr && (
            <div className="mt-2 flex items-center justify-between">
              <span className="text-gray-400">APR</span>
              <span className="text-green-400">{formatPercentage(token.apr)}</span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

// Token Creation Form
export const TokenCreationForm = ({ onSubmit, isCreating }) => {
  const { connected } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    supply: '',
    decimals: 9,
    initialPrice: '',
    description: '',
    imageUrl: ''
  });
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    if (!connected) {
      toast.error('Please connect your wallet first');
      return false;
    }

    const validation = validateTokenData(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Form submission error:', error);
      setErrors(prev => ({ ...prev, submit: error.message }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-orange-100 mb-2">
            Token Name*
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter token name"
            className="w-full bg-black/20 border border-orange-500/20 rounded-xl px-4 py-2 text-orange-100 
                     placeholder-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-orange-100 mb-2">
            Symbol*
          </label>
          <input
            type="text"
            value={formData.symbol}
            onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
            placeholder="e.g., BTC"
            maxLength={8}
            className="w-full bg-black/20 border border-orange-500/20 rounded-xl px-4 py-2 text-orange-100 
                     placeholder-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          {errors.symbol && <p className="text-red-400 text-sm mt-1">{errors.symbol}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-orange-100 mb-2">
            Total Supply*
          </label>
          <input
            type="number"
            value={formData.supply}
            onChange={(e) => setFormData({ ...formData, supply: e.target.value })}
            placeholder="Enter total supply"
            min="1"
            className="w-full bg-black/20 border border-orange-500/20 rounded-xl px-4 py-2 text-orange-100 
                     placeholder-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          {errors.supply && <p className="text-red-400 text-sm mt-1">{errors.supply}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-orange-100 mb-2">
            Initial Price (SOL)*
          </label>
          <input
            type="number"
            value={formData.initialPrice}
            onChange={(e) => setFormData({ ...formData, initialPrice: e.target.value })}
            placeholder="Enter initial price in SOL"
            min="0.000001"
            step="0.000001"
            className="w-full bg-black/20 border border-orange-500/20 rounded-xl px-4 py-2 text-orange-100 
                     placeholder-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          {errors.initialPrice && <p className="text-red-400 text-sm mt-1">{errors.initialPrice}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-orange-100 mb-2">
            Decimals
          </label>
          <input
            type="number"
            value={formData.decimals}
            onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) })}
            min="0"
            max="9"
            className="w-full bg-black/20 border border-orange-500/20 rounded-xl px-4 py-2 text-orange-100 
                     placeholder-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          {errors.decimals && <p className="text-red-400 text-sm mt-1">{errors.decimals}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-orange-100 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows="4"
            placeholder="Enter token description"
            className="w-full bg-black/20 border border-orange-500/20 rounded-xl px-4 py-2 text-orange-100 
                     placeholder-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-orange-100 mb-2">
            Image URL (Optional)
          </label>
          <input
            type="url"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://"
            className="w-full bg-black/20 border border-orange-500/20 rounded-xl px-4 py-2 text-orange-100 
                     placeholder-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>
      </div>

      {errors.submit && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
          {errors.submit}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={isCreating}
      >
        {isCreating ? (
          <div className="flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            Creating Token...
          </div>
        ) : (
          'Create Token'
        )}
      </Button>
    </form>
  );
};

// Price Chart Component
export const PriceChart = ({ tokenAddress }) => {
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('1D');
  const [error, setError] = useState(null);

  const connection = useMemo(() => new Connection(
    process.env.REACT_APP_SOLANA_RPC || 'https://api.mainnet-beta.solana.com', 
    'confirmed'
  ), []);

  const fetchPriceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const pool = await KaminoPool.load(
        connection,
        new PublicKey(tokenAddress)
      );

      const startTime = new Date();
      switch (timeframe) {
        case '1D':
          startTime.setDate(startTime.getDate() - 1);
          break;
        case '1W':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case '1M':
          startTime.setMonth(startTime.getMonth() - 1);
          break;
        default:
          startTime.setDate(startTime.getDate() - 1);
      }

      const trades = await pool.getTradeHistory(startTime);
      const chartData = trades
        .map(trade => ({
          time: trade.timestamp,
          price: trade.price,
          volume: trade.amount
        }))
        .sort((a, b) => a.time - b.time);

      setPriceData(chartData);
    } catch (error) {
      console.error('Error fetching price data:', error);
      setError('Failed to load price data');
    } finally {
      setLoading(false);
    }
  }, [connection, tokenAddress, timeframe]);

  useEffect(() => {
    fetchPriceData();
  }, [fetchPriceData]);

  if (loading) {
    return (
      <Card className="p-4">
        <div className="h-64 bg-orange-500/10 rounded-xl animate-pulse" />
      </Card>
    );
  }
  
  if (error) {
      return (
        <Card className="p-4">
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-orange-400 mb-4">{error}</p>
            <Button onClick={() => fetchPriceData()} variant="outline">
              Retry
            </Button>
          </div>
        </Card>
      );
    }
  
    return (
      <Card className="p-4">
        <div className="flex justify-between mb-4">
          <h3 className="font-semibold text-orange-100">Price Chart</h3>
          <div className="space-x-2">
            {['1D', '1W', '1M'].map((tf) => (
              <Button
                key={tf}
                variant={timeframe === tf ? 'default' : 'outline'}
                onClick={() => setTimeframe(tf)}
                size="sm"
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
        
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={priceData}>
              <defs>
                <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(234,88,12,0.1)" />
              <XAxis 
                dataKey="time"
                tickFormatter={(timestamp) => new Date(timestamp).toLocaleTimeString()}
                stroke="#f97316"
                tick={{ fill: '#fdba74' }}
              />
              <YAxis 
                stroke="#f97316"
                tick={{ fill: '#fdba74' }}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  border: '1px solid rgba(234,88,12,0.2)',
                  borderRadius: '0.75rem',
                }}
                labelStyle={{ color: '#fdba74' }}
                itemStyle={{ color: '#fdba74' }}
                formatter={(value) => formatAmount(value, 6)}
              />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#f97316" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, fill: '#f97316' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };
  
  // Liquidity Form Component
  export const LiquidityForm = ({ token, isAdding = true, onSubmit, onCancel, isLoading }) => {
    const [formData, setFormData] = useState({
      tokenAmount: '',
      solAmount: '',
    });
    const [errors, setErrors] = useState({});
  
    const validateForm = () => {
      const newErrors = {};
  
      if (!formData.tokenAmount || parseFloat(formData.tokenAmount) <= 0) {
        newErrors.tokenAmount = 'Token amount must be greater than 0';
      }
      if (!formData.solAmount || parseFloat(formData.solAmount) <= 0) {
        newErrors.solAmount = 'SOL amount must be greater than 0';
      }
  
      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validateForm()) return;
  
      try {
        await onSubmit(formData);
      } catch (error) {
        setErrors(prev => ({ ...prev, submit: error.message }));
      }
    };
  
    return (
      <Card className="p-6">
        <h3 className="text-xl font-bold text-orange-100 mb-6">
          {isAdding ? 'Add Liquidity' : 'Remove Liquidity'}
        </h3>
  
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-orange-100 mb-2">
                {token?.symbol || 'Token'} Amount
              </label>
              <input
                type="number"
                value={formData.tokenAmount}
                onChange={(e) => setFormData({ ...formData, tokenAmount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.000001"
                className="w-full bg-black/20 border border-orange-500/20 rounded-xl px-4 py-2 text-orange-100 
                         placeholder-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              {errors.tokenAmount && (
                <p className="text-red-400 text-sm mt-1">{errors.tokenAmount}</p>
              )}
            </div>
  
            <div>
              <label className="block text-sm font-medium text-orange-100 mb-2">
                SOL Amount
              </label>
              <input
                type="number"
                value={formData.solAmount}
                onChange={(e) => setFormData({ ...formData, solAmount: e.target.value })}
                placeholder="0.00"
                min="0"
                step="0.000001"
                className="w-full bg-black/20 border border-orange-500/20 rounded-xl px-4 py-2 text-orange-100 
                         placeholder-orange-500/50 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
              {errors.solAmount && (
                <p className="text-red-400 text-sm mt-1">{errors.solAmount}</p>
              )}
            </div>
          </div>
  
          {errors.submit && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
              {errors.submit}
            </div>
          )}
  
          <div className="flex gap-4">
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  {isAdding ? 'Adding Liquidity...' : 'Removing Liquidity...'}
                </div>
              ) : (
                isAdding ? 'Add Liquidity' : 'Remove Liquidity'
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    );
  };
  
  // Navbar Component
  export const Navbar = () => {
    const { connected, publicKey, connectWallet, disconnectWallet } = useWallet();
    const [balance, setBalance] = useState(null);
    const [loading, setLoading] = useState(false);
    
    const connection = useMemo(() => new Connection(
      process.env.REACT_APP_SOLANA_RPC || 'https://api.mainnet-beta.solana.com',
      'confirmed'
    ), []);
  
    const getBalance = useCallback(async () => {
      if (connected && publicKey) {
        try {
          const balance = await connection.getBalance(publicKey);
          setBalance(balance / LAMPORTS_PER_SOL);
        } catch (error) {
          console.error('Error fetching balance:', error);
        }
      }
    }, [connected, publicKey, connection]);
  
    useEffect(() => {
      getBalance();
  
      if (connected && publicKey) {
        const subscriptionId = connection.onAccountChange(
          publicKey,
          (account) => {
            setBalance(account.lamports / LAMPORTS_PER_SOL);
          }
        );
  
        return () => {
          try {
            connection.removeAccountChangeListener(subscriptionId);
          } catch (error) {
            console.error('Error removing listener:', error);
          }
        };
      }
    }, [connected, publicKey, connection, getBalance]);
  
    const handleConnect = async () => {
      try {
        setLoading(true);
        await connectWallet();
      } catch (error) {
        toast.error('Failed to connect wallet');
      } finally {
        setLoading(false);
      }
    };
  
    return (
      <motion.nav 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-black/20 backdrop-blur-xl border-b border-orange-500/20"
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="text-xl font-bold text-orange-100 hover:text-orange-200 transition-colors">
              Token Platform
            </Link>
            
            <div className="flex items-center space-x-4">
              {connected && (
                <Link to="/create">
                  <Button variant="default">
                    Create Token
                  </Button>
                </Link>
              )}
              
              {!connected ? (
                <Button
                  onClick={handleConnect}
                  disabled={loading}
                  variant="outline"
                  className="min-w-[140px]"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
                      Connecting...
                    </div>
                  ) : (
                    'Connect Wallet'
                  )}
                </Button>
              ) : (
                <div className="flex items-center space-x-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="px-4 py-2 bg-black/20 rounded-xl border border-orange-500/20"
                  >
                    <p className="text-sm text-orange-100">
                      {balance !== null ? `${formatAmount(balance, 4)} SOL` : 'Loading...'}
                    </p>
                  </motion.div>
                  
                  <Link to="/profile">
                    <motion.div 
                      whileHover={{ scale: 1.05 }}
                      className="bg-black/20 p-2 rounded-xl border border-orange-500/20"
                    >
                      <p className="text-sm text-orange-100">
                        {formatAddress(publicKey.toString())}
                      </p>
                    </motion.div>
                  </Link>
  
                  <Button 
                    onClick={disconnectWallet}
                    variant="ghost"
                    className="text-orange-400"
                  >
                    Disconnect
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.nav>
    );
  };
  
  // Export all components
  export {
    Card,
    Button
};