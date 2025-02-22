import { Buffer } from 'buffer';

// Ensure all required globals are available
window.global = window;
window.Buffer = Buffer;

// Add process
if (!window.process) {
  window.process = {
    env: { NODE_ENV: process.env.NODE_ENV },
    version: [],
    nextTick: (cb) => setTimeout(cb, 0),
    browser: true
  };
}

// Safe BigInt serialization
if (!window.structuredClone) {
  window.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    ));
  };
}

// Verify polyfills loaded
console.log('Polyfills initialized:', {
  hasBuffer: !!window.Buffer,
  hasProcess: !!window.process,
  hasGlobal: !!window.global
});