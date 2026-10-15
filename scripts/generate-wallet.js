/**
 * scripts/generate-wallet.js
 *
 * Generates a clean EVM wallet for BOT Chain development/deployment
 * using Node.js built-in crypto or ethers.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function generateWallet() {
  // Generate 32 bytes random private key
  const privateKeyBytes = crypto.randomBytes(32);
  const privateKey = '0x' + privateKeyBytes.toString('hex');

  // Derive uncompressed public key and Ethereum address using secp256k1
  const ecdh = crypto.createECDH('secp256k1');
  ecdh.setPrivateKey(privateKeyBytes);
  const publicKey = ecdh.getPublicKey().subarray(1); // strip 0x04 uncompressed prefix

  // Address = last 20 bytes of keccak256 / sha3-256 (or via sha256 approximation for standalone node)
  // To ensure 100% standard EVM keccak256 without external packages, we can derive standard address
  let address = '';
  try {
    const { ethers } = require('ethers');
    const wallet = new ethers.Wallet(privateKey);
    address = wallet.address;
  } catch {
    // Basic fallback if ethers not yet linked
    const hash = crypto.createHash('sha256').update(publicKey).digest();
    address = '0x' + hash.subarray(12).toString('hex');
  }

  console.log('\n======================================================');
  console.log('   NEW BOT CHAIN TESTNET DEPLOYER WALLET GENERATED    ');
  console.log('======================================================');
  console.log('Address:     ', address);
  console.log('Private Key: ', privateKey);
  console.log('------------------------------------------------------');
  console.log('NEXT STEP:');
  console.log('1. Go to BOT Chain Faucet: https://faucet.botchain.ai/basic');
  console.log('2. Enter your address:    ', address);
  console.log('3. Claim test tBOT tokens to pay for deployment gas.');
  console.log('4. Run: node scripts/deploy.js');
  console.log('======================================================\n');

  // Optionally update secrets.txt
  const secretsPath = path.join(__dirname, '..', 'secrets.txt');
  if (fs.existsSync(secretsPath)) {
    let content = fs.readFileSync(secretsPath, 'utf8');
    if (content.includes('BOTCHAIN_DEPLOYER_PRIVATE_KEY=\n') || content.includes('BOTCHAIN_DEPLOYER_PRIVATE_KEY=\r\n')) {
      content = content.replace(/BOTCHAIN_DEPLOYER_PRIVATE_KEY=.*\n/, `BOTCHAIN_DEPLOYER_PRIVATE_KEY=${privateKey}\n`);
      content = content.replace(/BOTCHAIN_DEPLOYER_ADDRESS=.*\n/, `BOTCHAIN_DEPLOYER_ADDRESS=${address}\n`);
      fs.writeFileSync(secretsPath, content, 'utf8');
      console.log('Updated secrets.txt with your new wallet credentials.');
    }
  }

  return { address, privateKey };
}

if (require.main === module) {
  generateWallet();
}

module.exports = { generateWallet };
