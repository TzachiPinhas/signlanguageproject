// filepath: c:\Users\tzach\Desktop\ReactWeb\signlanguageproject\start-dev.js
/**
 * Custom development server starter script
 * This script launches the React development server with the appropriate settings
 * to allow external connections from other devices on the network.
 */

const { exec } = require('child_process');
const os = require('os');
const chalk = require('chalk') || { green: (text) => text, blue: (text) => text, yellow: (text) => text };

// Get the list of network interfaces
const networkInterfaces = os.networkInterfaces();

console.log(chalk.blue('=============================================='));
console.log(chalk.blue('🚀 Starting React App with external access enabled'));
console.log(chalk.blue('=============================================='));

// Find all IPv4 addresses on the machine (excluding internal loopback)
console.log(chalk.yellow('\nAvailable on your network at:'));
Object.keys(networkInterfaces).forEach((interfaceName) => {
  const interfaces = networkInterfaces[interfaceName];
  
  interfaces.forEach((iface) => {
    // Skip over internal and non-IPv4 addresses
    if (iface.family === 'IPv4' && !iface.internal) {
      console.log(chalk.green(`http://${iface.address}:3000`));
    }
  });
});

console.log(chalk.yellow('\n📱 Use one of these addresses for mobile device connections'));
console.log(chalk.blue('==============================================\n'));

// Start the React app with the HOST environment variable set to 0.0.0.0
// This allows connections from any IP address
const startProcess = exec('set HOST=0.0.0.0 && npm start', (error) => {
  if (error) {
    console.error('Error starting the development server:', error);
    process.exit(1);
  }
});

// Forward stdout and stderr to the console
startProcess.stdout.on('data', (data) => {
  process.stdout.write(data);
});

startProcess.stderr.on('data', (data) => {
  process.stderr.write(data);
});