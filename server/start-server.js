#!/usr/bin/env node

/**
 * Robust BoilerBrain Server Startup Script
 * Enhanced error handling and diagnostic logging
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 BoilerBrain Server Startup - Enhanced Diagnostics');
console.log('==================================================');

// Check Node.js version
const nodeVersion = process.version;
console.log(`📋 Node.js Version: ${nodeVersion}`);

// Check environment
console.log(`📋 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`📋 Platform: ${process.platform}`);
console.log(`📋 Architecture: ${process.arch}`);

// Check current directory
const currentDir = process.cwd();
console.log(`📋 Current Directory: ${currentDir}`);

// Check server directory structure
const serverDir = path.join(currentDir, 'server');
console.log(`📋 Server Directory: ${serverDir}`);

try {
  const serverFiles = fs.readdirSync(serverDir);
  console.log(`📋 Server Files: ${serverFiles.join(', ')}`);
} catch (error) {
  console.error(`❌ Server directory not found: ${error.message}`);
  process.exit(1);
}

// Check package.json
const packagePath = path.join(serverDir, 'package.json');
try {
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  console.log(`📋 Server Package: ${packageJson.name} v${packageJson.version}`);
  console.log(`📋 Main Script: ${packageJson.main || 'index.js'}`);
} catch (error) {
  console.error(`❌ Package.json error: ${error.message}`);
  process.exit(1);
}

// Check index.js exists
const indexPath = path.join(serverDir, 'index.js');
if (!fs.existsSync(indexPath)) {
  console.error(`❌ Server entry point not found: ${indexPath}`);
  process.exit(1);
}
console.log(`✅ Server entry point found: ${indexPath}`);

// Check for .env file in parent directory
const envPath = path.join(currentDir, '.env');
if (fs.existsSync(envPath)) {
  console.log(`✅ Environment file found: ${envPath}`);
  
  // Check environment variables
  require('dotenv').config({ path: envPath });
  
  const requiredVars = [
    'OPENAI_API_KEY',
    'DEEPSEEK_API_KEY_1',
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  console.log('🔑 Environment Variables Check:');
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (value && value !== 'undefined' && value !== '') {
      const masked = varName.includes('API_KEY') ? 
        `${value.substring(0, 8)}...${value.substring(value.length - 4)}` : 
        value.substring(0, 20) + '...';
      console.log(`  ✅ ${varName}: ${masked}`);
    } else {
      console.log(`  ❌ ${varName}: MISSING or EMPTY`);
    }
  });
} else {
  console.error(`❌ Environment file not found: ${envPath}`);
  console.log('💡 Please create .env file with required API keys');
}

// Set port
const port = process.env.PORT || 3001;
console.log(`🌐 Server Port: ${port}`);

// Check if port is available
const net = require('net');
const checkPort = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close();
      resolve(true);
    });
    server.on('error', () => {
      resolve(false);
    });
  });
};

checkPort(port).then(isAvailable => {
  if (isAvailable) {
    console.log(`✅ Port ${port} is available`);
  } else {
    console.error(`❌ Port ${port} is already in use`);
    process.exit(1);
  }
  
  // Start the server
  console.log('\n🚀 Starting BoilerBrain Server...');
  console.log('=====================================');
  
  const serverProcess = spawn('node', [indexPath], {
    cwd: serverDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      PORT: port,
      NODE_ENV: process.env.NODE_ENV || 'development'
    }
  });
  
  serverProcess.on('error', (error) => {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  });
  
  serverProcess.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Server exited with code ${code}`);
      process.exit(code);
    }
  });
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down server...');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down server...');
    serverProcess.kill('SIGTERM');
  });
  
  console.log(`✅ Server starting on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/api/health`);
  console.log(`🎯 API endpoint: http://localhost:${port}/api/chat`);
});
