import React, { useState, useEffect } from 'react';

export const WaterDroplet = ({ style }) => (
  <div 
    className="water-droplet"
    style={{
      ...style,
      animation: `droplet ${2 + Math.random() * 2}s linear infinite`,
      left: `${Math.random() * 100}vw`,
      opacity: 0.8
    }}
  />
);

export const WaterDroplets = () => {
  const [droplets, setDroplets] = useState([]);
  
  useEffect(() => {
    const createDroplet = () => ({
      id: Math.random(),
      style: {
        animationDelay: `${Math.random() * 3}s`
      }
    });

    const initialDroplets = Array.from({ length: 30 }, createDroplet);
    setDroplets(initialDroplets);

    const intervalId = setInterval(() => {
      setDroplets(prev => [...prev.slice(-29), createDroplet()]);
    }, 300);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-20">
      {droplets.map(droplet => (
        <WaterDroplet key={droplet.id} style={droplet.style} />
      ))}
    </div>
  );
};

export const MistBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-10">
    <div className="absolute inset-0 dynamic-background" />
    <div className="absolute inset-0 subtle-mist opacity-30" />
    <div className="absolute inset-0 subtle-mist opacity-20" 
         style={{ animationDelay: '-10s' }} />
    <div className="absolute inset-0 backdrop-blur-[20px] opacity-20" />
  </div>
);

export const WaterEffect = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div className="absolute inset-0 water-ripple opacity-60" />
    <div className="absolute inset-0 water-ripple opacity-50" 
         style={{ animationDelay: '-2s' }} />
    <div className="absolute inset-0 water-ripple opacity-40" 
         style={{ animationDelay: '-4s' }} />
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent animate-pulse" />
  </div>
);