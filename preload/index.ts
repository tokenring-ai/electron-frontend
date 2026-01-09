// Preload script entry point
// This file imports all preload modules and exposes them to the renderer process

// Import individual preload modules
import './fsBridge';
import './apiBridge';

// Export a version object for debugging
console.log('[Preload] TokenRing Coder preload script loaded');
