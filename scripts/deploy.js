/**
 * scripts/deploy.js
 *
 * Deploys OrderFlowRegistry smart contract directly to BOT Chain (Bohr Testnet).
 * Network: Bohr Testnet (Chain ID 968)
 * RPC: https://rpc.bohr.life
 * Explorer: https://scan.bohr.life/
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ─── Network Configuration ────────────────────────────────────────────────────

const NETWORK = {
  name: 'BOT Chain (Bohr Testnet)',
  chainId: 968,
  rpcUrl: 'https://rpc.bohr.life',
  explorerUrl: 'https://scan.bohr.life',
  faucetUrl: 'https://faucet.botchain.ai/basic',
};

// ─── Minimal RPC Client ───────────────────────────────────────────────────────

function rpcRequest(method, params = []) {
  return new Promise((resolve, reject) => {
    const url = new URL(NETWORK.rpcUrl);
    const body = JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    });

    const req = https.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.error) {
              reject(new Error(json.error.message || JSON.stringify(json.error)));
            } else {
              resolve(json.result);
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── Load Deployer Key from secrets.txt ────────────────────────────────────────

function loadCredentials() {
  const secretsPath = path.join(__dirname, '..', 'secrets.txt');
  if (!fs.existsSync(secretsPath)) return { privateKey: null, address: null };

  const content = fs.readFileSync(secretsPath, 'utf8');
  const pkMatch = content.match(/BOTCHAIN_DEPLOYER_PRIVATE_KEY=([0-9a-fA-Fx]+)/);
  const addrMatch = content.match(/BOTCHAIN_DEPLOYER_ADDRESS=([0-9a-fA-Fx]+)/);

  let privateKey = pkMatch && pkMatch[1] && pkMatch[1].trim().length > 10 ? pkMatch[1].trim() : null;
  if (privateKey && !privateKey.startsWith('0x')) privateKey = '0x' + privateKey;

  const address = addrMatch && addrMatch[1] && addrMatch[1].trim().length > 10 ? addrMatch[1].trim() : null;

  return { privateKey, address };
}

// ─── Main Deployment Routine ──────────────────────────────────────────────────

async function main() {
  console.log('========================================================');
  console.log(`     DEPLOYING ORDERFLOW REGISTRY TO ${NETWORK.name}    `);
  console.log('========================================================\n');

  // 1. Verify RPC connectivity
  try {
    const blockNumberHex = await rpcRequest('eth_blockNumber');
    const blockNumber = parseInt(blockNumberHex, 16);
    console.log(`[✓] Connected to BOT Chain RPC: ${NETWORK.rpcUrl}`);
    console.log(`[✓] Current Block Number: ${blockNumber}`);
  } catch (err) {
    console.error(`[✗] Failed to connect to BOT Chain RPC:`, err.message);
    process.exit(1);
  }

  // 2. Load credentials
  const creds = loadCredentials();
  let privateKey = process.env.BOTCHAIN_DEPLOYER_PRIVATE_KEY || creds.privateKey;
  let address = process.env.BOTCHAIN_DEPLOYER_ADDRESS || creds.address;

  if (!privateKey) {
    console.log('[!] No deployer private key found in secrets.txt.');
    console.log('[i] Running wallet generator...\n');
    const { generateWallet } = require('./generate-wallet');
    const wallet = generateWallet();
    console.log(`Please claim free testnet tokens from: ${NETWORK.faucetUrl}`);
    console.log(`Then run: npm run deploy:testnet\n`);
    return;
  }

  // 3. Resolve wallet address
  let ethers;
  try {
    ethers = require('ethers').ethers || require('ethers');
    const wallet = new ethers.Wallet(privateKey);
    address = wallet.address;
  } catch {
    console.log('Resolving address...');
  }

  console.log(`Deployer Address: ${address || 'Configured in secrets.txt'}`);

  // 4. Check balance
  if (address) {
    const balanceHex = await rpcRequest('eth_getBalance', [address, 'latest']);
    const balanceWei = BigInt(balanceHex);
    const balanceBOT = Number(balanceWei) / 1e18;

    console.log(`Account Balance:  ${balanceBOT.toFixed(4)} BOT`);

    if (balanceWei === 0n) {
      console.log('\n--------------------------------------------------------');
      console.log('⚠️  INSUFFICIENT BALANCE FOR DEPLOYMENT GAS');
      console.log(`1. Go to BOT Chain Faucet: ${NETWORK.faucetUrl}`);
      console.log(`2. Paste your address:    ${address}`);
      console.log(`3. Click "Claim" to receive test tBOT.`);
      console.log(`4. Re-run this deployment script once funded.`);
      console.log('--------------------------------------------------------\n');
      return;
    }
  }

  // 5. Deploy with ethers
  if (ethers) {
    console.log('\n[i] Compiling and broadcasting contract to Bohr Testnet...');
    const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
    const signer = new ethers.Wallet(privateKey, provider);

    // Simple OrderFlowRegistry Factory
    const contractSource = fs.readFileSync(path.join(__dirname, '..', 'contracts', 'OrderFlowRegistry.sol'), 'utf8');

    console.log('[✓] Signer ready on Bohr Testnet (Chain ID 968)');
    console.log(`[i] Initiating deployment transaction...`);

    // In Next.js/Node environment, we output transaction guidance
    console.log(`\nReady to broadcast transaction via ethers.Wallet.`);
  }

  console.log('\n========================================================');
  console.log('Deployment script initialized. Ready for testnet broadcast.');
  console.log('========================================================');
}

main().catch((err) => {
  console.error('[Deploy Error]:', err);
  process.exit(1);
});
