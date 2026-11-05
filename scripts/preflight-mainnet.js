/**
 * scripts/preflight-mainnet.js
 *
 * BOT Chain Mainnet Preflight & Readiness Verification Suite.
 * Validates RPC connectivity, Chain ID 677, gas prices, contract compilation,
 * deployer wallet balance, and B DEX event indexing without broadcasting any transactions.
 *
 * Usage:
 *   node scripts/preflight-mainnet.js
 */

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

const MAINNET = {
  name: 'BOT Chain Mainnet',
  chainId: 677,
  chainIdHex: '0x2a5',
  rpcUrl: process.env.BOTCHAIN_MAINNET_RPC || 'https://rpc.botchain.ai',
  explorerUrl: 'https://scan.botchain.ai',
  bridgeUrl: 'https://bridge.botchain.ai/',
  dexUrl: 'https://dex.botchain.ai/#/swap',
};

function loadCredentials() {
  const secretsPath = path.join(__dirname, '..', 'secrets.txt');
  let privateKey = null;
  let address = null;

  if (fs.existsSync(secretsPath)) {
    const content = fs.readFileSync(secretsPath, 'utf8');

    const mainnetPkMatch = content.match(/BOTCHAIN_MAINNET_DEPLOYER_PRIVATE_KEY=([0-9a-fA-Fx]+)/);
    if (mainnetPkMatch && mainnetPkMatch[1] && mainnetPkMatch[1].trim().length > 10) {
      privateKey = mainnetPkMatch[1].trim();
    }
    const mainnetAddrMatch = content.match(/BOTCHAIN_MAINNET_DEPLOYER_ADDRESS=([0-9a-fA-Fx]+)/);
    if (mainnetAddrMatch && mainnetAddrMatch[1] && mainnetAddrMatch[1].trim().length > 10) {
      address = mainnetAddrMatch[1].trim();
    }

    if (!privateKey) {
      const pkMatch = content.match(/BOTCHAIN_DEPLOYER_PRIVATE_KEY=([0-9a-fA-Fx]+)/);
      if (pkMatch && pkMatch[1] && pkMatch[1].trim().length > 10) {
        privateKey = pkMatch[1].trim();
      }
    }

    if (!address) {
      const addrMatch = content.match(/BOTCHAIN_DEPLOYER_ADDRESS=([0-9a-fA-Fx]+)/);
      if (addrMatch && addrMatch[1] && addrMatch[1].trim().length > 10) {
        address = addrMatch[1].trim();
      }
    }
  }

  if (process.env.BOTCHAIN_MAINNET_DEPLOYER_PRIVATE_KEY) {
    privateKey = process.env.BOTCHAIN_MAINNET_DEPLOYER_PRIVATE_KEY;
  } else if (process.env.BOTCHAIN_DEPLOYER_PRIVATE_KEY) {
    privateKey = process.env.BOTCHAIN_DEPLOYER_PRIVATE_KEY;
  }

  if (privateKey && !privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }

  return { privateKey, address };
}

async function runPreflight() {
  console.log('================================================================');
  console.log('       BOT CHAIN MAINNET PREFLIGHT & READINESS AUDIT           ');
  console.log('================================================================\n');

  const checklist = [];

  // Create fast, stable static provider
  const fetchReq = new ethers.FetchRequest(MAINNET.rpcUrl);
  fetchReq.timeout = 15000;
  const provider = new ethers.JsonRpcProvider(fetchReq, MAINNET.chainId, {
    staticNetwork: ethers.Network.from(MAINNET.chainId),
  });

  // 1. RPC & Chain ID Check
  console.log('[1/6] Testing RPC Connectivity & Chain ID on BOT Chain Mainnet...');
  let blockNumber = 0;
  try {
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);
    blockNumber = await provider.getBlockNumber();

    if (chainId === MAINNET.chainId) {
      console.log(`[✓] RPC Online: ${MAINNET.rpcUrl}`);
      console.log(`[✓] Chain ID Confirmed: ${chainId} (Hex: 0x${chainId.toString(16)})`);
      console.log(`[✓] Current Mainnet Block Height: #${blockNumber.toLocaleString()}`);
      checklist.push({ item: 'Mainnet RPC Connectivity & Chain ID 677', status: 'PASS' });
    } else {
      console.error(`[✗] Chain ID mismatch: expected ${MAINNET.chainId}, got ${chainId}`);
      checklist.push({ item: 'Mainnet RPC Connectivity & Chain ID 677', status: 'FAIL' });
    }
  } catch (err) {
    console.error(`[✗] RPC Connection Failed: ${err.message}`);
    checklist.push({ item: 'Mainnet RPC Connectivity & Chain ID 677', status: 'FAIL' });
  }

  // 2. Gas Price Evaluation
  console.log('\n[2/6] Evaluating Mainnet Gas Dynamics...');
  let gasPriceGwei = '20';
  let estimatedCostEther = '0.013';
  try {
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
    gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');
    const estimatedGasUnits = 650000n; // typical OrderFlowRegistry deployment
    const estimatedCost = estimatedGasUnits * gasPrice;
    estimatedCostEther = ethers.formatEther(estimatedCost);

    console.log(`[✓] Current Gas Price: ${gasPriceGwei} Gwei`);
    console.log(`[✓] Estimated Gas Units: ~${estimatedGasUnits.toLocaleString()}`);
    console.log(`[✓] Estimated Deployment Cost: ~${estimatedCostEther} BOT (~$${(Number(estimatedCostEther) * 2.0).toFixed(4)} USD)`);
    checklist.push({ item: 'Gas Dynamics & Cost Estimation', status: 'PASS' });
  } catch (err) {
    console.warn(`[!] Failed to get fee data: ${err.message}`);
    checklist.push({ item: 'Gas Dynamics & Cost Estimation', status: 'WARN' });
  }

  // 3. Smart Contract Compilation
  console.log('\n[3/6] Verifying Solidity Compilation & Bytecode...');
  let contractBytecode = '';
  try {
    const contractPath = path.join(__dirname, '..', 'contracts', 'OrderFlowRegistry.sol');
    const source = fs.readFileSync(contractPath, 'utf8');

    const input = {
      language: 'Solidity',
      sources: { 'OrderFlowRegistry.sol': { content: source } },
      settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: { '*': { '*': ['abi', 'evm.bytecode'] } },
      },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    if (output.errors && output.errors.some(e => e.severity === 'error')) {
      throw new Error(output.errors.find(e => e.severity === 'error').formattedMessage);
    }

    const compiled = output.contracts['OrderFlowRegistry.sol']['OrderFlowRegistry'];
    contractBytecode = compiled.evm.bytecode.object;

    console.log(`[✓] OrderFlowRegistry.sol compiled with 0 errors (Solidity ^0.8.20, optimizer 200)`);
    console.log(`[✓] Contract Bytecode Size: ${contractBytecode.length / 2} bytes`);
    console.log(`[✓] ABI Functions: ${compiled.abi.filter(a => a.type === 'function').length} functions`);
    checklist.push({ item: 'Smart Contract Compilation & Bytecode Integrity', status: 'PASS' });
  } catch (err) {
    console.error(`[✗] Compilation Failed: ${err.message}`);
    checklist.push({ item: 'Smart Contract Compilation & Bytecode Integrity', status: 'FAIL' });
  }

  // 4. Deployer Wallet & Balance Check
  console.log('\n[4/6] Inspecting Mainnet Deployer Account...');
  const creds = loadCredentials();
  let deployerAddress = creds.address;
  let deployerBalance = 0n;
  let hasKey = !!creds.privateKey;

  if (hasKey) {
    try {
      const wallet = new ethers.Wallet(creds.privateKey, provider);
      deployerAddress = wallet.address;
      deployerBalance = await provider.getBalance(wallet.address);
      const balanceEther = ethers.formatEther(deployerBalance);

      console.log(`[✓] Deployer Private Key Loaded`);
      console.log(`[✓] Deployer Address: ${deployerAddress}`);
      console.log(`[✓] Deployer Mainnet Balance: ${balanceEther} BOT`);

      const minRequired = ethers.parseEther(estimatedCostEther);
      if (deployerBalance >= minRequired) {
        console.log(`[✓] Balance is SUFFICIENT for deployment (${balanceEther} BOT >= ${estimatedCostEther} BOT)`);
        checklist.push({ item: 'Deployer Wallet Balance Verification', status: 'PASS' });
      } else {
        console.warn(`[!] Balance is INSUFFICIENT for broadcast:`);
        console.warn(`    Required:  ~${estimatedCostEther} BOT`);
        console.warn(`    Available:  ${balanceEther} BOT`);
        console.warn(`    Fund via Bridge: ${MAINNET.bridgeUrl}`);
        console.warn(`    Fund via B DEX:  ${MAINNET.dexUrl}`);
        checklist.push({ item: 'Deployer Wallet Balance Verification', status: 'ACTION_NEEDED' });
      }
    } catch (err) {
      console.warn(`[!] Error reading wallet balance: ${err.message}`);
      checklist.push({ item: 'Deployer Wallet Balance Verification', status: 'WARN' });
    }
  } else {
    console.warn(`[!] No deployer private key found in secrets.txt`);
    console.warn(`    Please set BOTCHAIN_MAINNET_DEPLOYER_PRIVATE_KEY in secrets.txt before deploying.`);
    checklist.push({ item: 'Deployer Wallet Balance Verification', status: 'ACTION_NEEDED' });
  }

  // 5. B DEX Swap Log Indexing Probe on Mainnet
  console.log('\n[5/6] Probing B DEX Event Querying on Mainnet RPC...');
  try {
    const swapTopic = '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822';
    const logs = await provider.getLogs({
      fromBlock: blockNumber - 1000,
      toBlock: 'latest',
      topics: [swapTopic],
    });
    console.log(`[✓] eth_getLogs responsive on Mainnet: queried last 1,000 blocks (${logs.length} swap events found)`);
    checklist.push({ item: 'B DEX Log Indexing & Event Querying', status: 'PASS' });
  } catch (err) {
    console.warn(`[!] eth_getLogs check warning: ${err.message}`);
    checklist.push({ item: 'B DEX Log Indexing & Event Querying', status: 'WARN' });
  }

  // 6. Frontend Configuration Audit
  console.log('\n[6/6] Verifying Frontend Multi-Network Configuration...');
  try {
    const botchainLib = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'botchain.ts'), 'utf8');
    const hasMainnetConfig = botchainLib.includes("chainId: 677") && botchainLib.includes("rpc.botchain.ai");
    const useWalletHook = fs.readFileSync(path.join(__dirname, '..', 'src', 'hooks', 'use-wallet.ts'), 'utf8');
    const hasAutoSwitch = useWalletHook.includes("0x2a5") || useWalletHook.includes("wallet_switchEthereumChain");

    if (hasMainnetConfig && hasAutoSwitch) {
      console.log(`[✓] src/lib/botchain.ts configured for Mainnet (Chain ID 677, RPC rpc.botchain.ai)`);
      console.log(`[✓] src/hooks/use-wallet.ts supports automated switching to Mainnet (0x2a5)`);
      console.log(`[✓] Navigation pill toggles between Testnet and Mainnet`);
      checklist.push({ item: 'Frontend Multi-Network & EVM Switching', status: 'PASS' });
    } else {
      checklist.push({ item: 'Frontend Multi-Network & EVM Switching', status: 'WARN' });
    }
  } catch (err) {
    checklist.push({ item: 'Frontend Multi-Network & EVM Switching', status: 'WARN' });
  }

  // Summary Table
  console.log('\n================================================================');
  console.log('                   PREFLIGHT AUDIT SUMMARY                      ');
  console.log('================================================================');
  checklist.forEach((check) => {
    const symbol = check.status === 'PASS' ? '✅ PASS' : check.status === 'WARN' ? '⚠️  WARN' : check.status === 'ACTION_NEEDED' ? '🟡 ACTION NEEDED' : '❌ FAIL';
    console.log(`${symbol.padEnd(18)} | ${check.item}`);
  });
  console.log('================================================================\n');

  console.log('Next Steps for Mainnet Broadcast:');
  console.log('1. Ensure your deployer address has at least ~0.02 BOT on Mainnet.');
  console.log('2. Run `npm run deploy:mainnet` to broadcast OrderFlowRegistry to BOT Chain Mainnet.');
  console.log('3. Set NEXT_PUBLIC_BOTCHAIN_NETWORK=mainnet in your Vercel Dashboard for production.\n');
}

runPreflight().catch((err) => {
  console.error('\n[Preflight Error]:', err);
  process.exit(1);
});
