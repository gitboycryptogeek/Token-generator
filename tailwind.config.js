/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        blue: {
          500: '#3b82f6',
        },
        black: '#000000',
        white: '#ffffff',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        'droplet': 'droplet 3s linear infinite',
        'droplet-splash': 'dropletSplash 0.5s ease-out forwards',
        'ripple': 'ripple 10s ease-in-out infinite',
        'mist': 'mist-movement 20s ease-in-out infinite',
        'float-x': 'floatX 6s ease-in-out infinite',
        'float-y': 'floatY 8s ease-in-out infinite',
        'rotate': 'rotate 9s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        droplet: {
          '0%': {
            transform: 'translateY(-120vh) scale(0)',
            opacity: '0',
          },
          '10%': {
            opacity: '1',
          },
          '90%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateY(120vh) scale(1)',
            opacity: '0',
          },
        },
        dropletSplash: {
          '0%': {
            transform: 'translate(-50%, -50%) scale(1)',
            opacity: '0.8',
          },
          '100%': {
            transform: 'translate(-50%, -50%) scale(3)',
            opacity: '0',
          },
        },
        ripple: {
          '0%': {
            transform: 'scale(1)',
            opacity: '0.1',
          },
          '50%': {
            transform: 'scale(1.1)',
            opacity: '0.15',
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '0.1',
          },
        },
        'mist-movement': {
          '0%, 100%': {
            transform: 'translate(0, 0)',
            opacity: '0.02',
          },
          '50%': {
            transform: 'translate(20px, -10px)',
            opacity: '0.03',
          },
        },
        floatX: {
          '0%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(4px)' },
          '50%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(2px)' },
          '100%': { transform: 'translateX(0)' },
        },
        floatY: {
          '0%': { transform: 'translateY(0)' },
          '33%': { transform: 'translateY(-4px)' },
          '67%': { transform: 'translateY(4px)' },
          '100%': { transform: 'translateY(0)' },
        },
        rotate: {
          '0%': { transform: 'rotate(0deg)' },
          '33%': { transform: 'rotate(1deg)' },
          '67%': { transform: 'rotate(-1deg)' },
          '100%': { transform: 'rotate(0deg)' },
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      boxShadow: {
        'glow': '0 0 15px rgba(234,88,12,0.2)',
        'glow-lg': '0 0 30px rgba(234,88,12,0.3)',
        'inner-glow': 'inset 0 2px 4px 0 rgba(234,88,12,0.06)',
      },
      backdropBlur: {
        xs: '2px',
        xl: '24px',
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      transitionDuration: {
        '2000': '2000ms',
      },
      scale: {
        '102': '1.02',
      },
      opacity: {
        '2': '0.02',
        '3': '0.03',
        '15': '0.15',
      },
      blur: {
        '40px': '40px',
      },
      zIndex: {
        '0': '0',
        '10': '10',
        '20': '20',
        '30': '30',
        '40': '40',
        '50': '50',
      },
    },
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '2rem',
        lg: '4rem',
        xl: '5rem',
      },
    },
  },
  plugins: [
    function({ addBase, addComponents, theme }) {
      addBase({
        'html': {
          backgroundColor: theme('colors.black'),
          color: theme('colors.white'),
        },
      });
      
      addComponents({
        '.glassmorphism': {
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(24px)',
          borderWidth: '1px',
          borderColor: 'rgba(234, 88, 12, 0.2)',
          boxShadow: '0 0 15px rgba(234, 88, 12, 0.2)',
        },
        '.subtle-mist': {
          background: 'linear-gradient(to right, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.03))',
          filter: 'blur(40px)',
          mixBlendMode: 'overlay',
          pointerEvents: 'none',
          animation: 'mist-movement 20s ease-in-out infinite',
        },
        '.water-ripple': {
          background: 'radial-gradient(circle at center, rgba(59, 130, 246, 0.1), transparent)',
          mixBlendMode: 'overlay',
          animation: 'ripple 10s ease-in-out infinite',
        },
      });
    },
  ],
  corePlugins: {
    preflight: true,
  },
  mode: 'jit',
}