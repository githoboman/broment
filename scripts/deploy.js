/**
 * scripts/deploy.js
 *
 * Multi-network deployer for OrderFlowRegistry on BOT Chain.
 * Supports Bohr Testnet (Chain ID 968) and BOT Chain Mainnet (Chain ID 677).
 *
 * Usage:
 *   node scripts/deploy.js --network testnet
 *   node scripts/deploy.js --network mainnet
 */

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

// ─── Network Configurations ───────────────────────────────────────────────────

const NETWORKS = {
  testnet: {
    name: 'BOT Chain (Bohr Testnet)',
    networkKey: 'testnet',
    chainId: 968,
    chainIdHex: '0x3c8',
    rpcUrl: process.env.BOTCHAIN_TESTNET_RPC || 'https://rpc.bohr.life',
    explorerUrl: 'https://scan.bohr.life',
    faucetUrl: 'https://faucet.botchain.ai/basic',
    envVarName: 'NEXT_PUBLIC_ORDERFLOW_REGISTRY_ADDRESS',
    networkLabel: 'Bohr Testnet',
  },
  mainnet: {
    name: 'BOT Chain Mainnet',
    networkKey: 'mainnet',
    chainId: 677,
    chainIdHex: '0x2a5',
    rpcUrl: process.env.BOTCHAIN_MAINNET_RPC || 'https://rpc.botchain.ai',
    explorerUrl: 'https://scan.botchain.ai',
    bridgeUrl: 'https://bridge.botchain.ai/',
    dexUrl: 'https://dex.botchain.ai/#/swap',
    envVarName: 'NEXT_PUBLIC_ORDERFLOW_REGISTRY_ADDRESS_MAINNET',
    networkLabel: 'BOT Chain Mainnet',
  },
};

function parseTargetNetwork() {
  const args = process.argv.slice(2);
  let target = process.env.BOTCHAIN_TARGET_NETWORK || 'testnet';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--network' && args[i + 1]) {
      target = args[i + 1].toLowerCase();
      break;
    }
    if (args[i].startsWith('--network=')) {
      target = args[i].split('=')[1].toLowerCase();
      break;
    }
  }

  if (!NETWORKS[target]) {
    console.error(`[✗] Unknown network "${target}". Valid options are: testnet, mainnet`);
    process.exit(1);
  }

  return NETWORKS[target];
}

function loadCredentials(targetNetwork) {
  const secretsPath = path.join(__dirname, '..', 'secrets.txt');
  let privateKey = null;
  let address = null;

  if (fs.existsSync(secretsPath)) {
    const content = fs.readFileSync(secretsPath, 'utf8');

    if (targetNetwork.networkKey === 'mainnet') {
      const mainnetPkMatch = content.match(/BOTCHAIN_MAINNET_DEPLOYER_PRIVATE_KEY=([0-9a-fA-Fx]+)/);
      if (mainnetPkMatch && mainnetPkMatch[1] && mainnetPkMatch[1].trim().length > 10) {
        privateKey = mainnetPkMatch[1].trim();
      }
      const mainnetAddrMatch = content.match(/BOTCHAIN_MAINNET_DEPLOYER_ADDRESS=([0-9a-fA-Fx]+)/);
      if (mainnetAddrMatch && mainnetAddrMatch[1] && mainnetAddrMatch[1].trim().length > 10) {
        address = mainnetAddrMatch[1].trim();
      }
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

  // Environment variables override secrets.txt
  if (targetNetwork.networkKey === 'mainnet' && process.env.BOTCHAIN_MAINNET_DEPLOYER_PRIVATE_KEY) {
    privateKey = process.env.BOTCHAIN_MAINNET_DEPLOYER_PRIVATE_KEY;
  } else if (process.env.BOTCHAIN_DEPLOYER_PRIVATE_KEY) {
    privateKey = process.env.BOTCHAIN_DEPLOYER_PRIVATE_KEY;
  }

  if (privateKey && !privateKey.startsWith('0x')) {
    privateKey = '0x' + privateKey;
  }

  return { privateKey, address };
}

function compileContract() {
  console.log('[1/4] Compiling OrderFlowRegistry.sol with solc...');
  const contractPath = path.join(__dirname, '..', 'contracts', 'OrderFlowRegistry.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'OrderFlowRegistry.sol': {
        content: source,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const hasError = output.errors.some((err) => err.severity === 'error');
    output.errors.forEach((err) => {
      if (err.severity === 'error') console.error('Compile Error:', err.formattedMessage);
      else console.warn('Compile Warning:', err.formattedMessage);
    });
    if (hasError) throw new Error('Solidity compilation failed.');
  }

  const contract = output.contracts['OrderFlowRegistry.sol']['OrderFlowRegistry'];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log('[✓] Contract compiled successfully. Bytecode size:', bytecode.length / 2, 'bytes');
  return { abi, bytecode };
}

async function main() {
  const targetNetwork = parseTargetNetwork();

  console.log('========================================================');
  console.log(`     DEPLOYING ORDERFLOW REGISTRY TO ${targetNetwork.name.toUpperCase()}    `);
  console.log('========================================================\n');
  console.log(`Target Network:   ${targetNetwork.name}`);
  console.log(`Chain ID:         ${targetNetwork.chainId} (${targetNetwork.chainIdHex})`);
  console.log(`RPC Endpoint:     ${targetNetwork.rpcUrl}`);
  console.log(`Block Explorer:   ${targetNetwork.explorerUrl}\n`);

  const { abi, bytecode } = compileContract();

  const creds = loadCredentials(targetNetwork);
  const privateKey = creds.privateKey;
  if (!privateKey) {
    throw new Error(
      `No deployer private key found for ${targetNetwork.name}.\n` +
      `Please configure BOTCHAIN_MAINNET_DEPLOYER_PRIVATE_KEY or BOTCHAIN_DEPLOYER_PRIVATE_KEY in secrets.txt or environment.`
    );
  }

  console.log('[2/4] Connecting to BOT Chain RPC...');
  const fetchReq = new ethers.FetchRequest(targetNetwork.rpcUrl);
  fetchReq.timeout = 15000;
  const provider = new ethers.JsonRpcProvider(fetchReq, targetNetwork.chainId, {
    staticNetwork: ethers.Network.from(targetNetwork.chainId),
  });

  // Verify chainId from RPC
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== targetNetwork.chainId) {
    throw new Error(
      `RPC Chain ID mismatch: expected ${targetNetwork.chainId}, RPC returned ${network.chainId}`
    );
  }

  const blockNumber = await provider.getBlockNumber();
  console.log(`[✓] Connected to ${targetNetwork.name} at block #${blockNumber}`);

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('[✓] Deployer Address:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log(`[✓] Deployer Balance: ${ethers.formatEther(balance)} BOT`);

  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');
  const estimatedGas = 650000n; // typical deployment gas for OrderFlowRegistry
  const estimatedCost = estimatedGas * gasPrice;

  console.log(`[✓] Current Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} Gwei`);
  console.log(`[✓] Estimated Deployment Cost: ~${ethers.formatEther(estimatedCost)} BOT`);

  if (balance < estimatedCost) {
    console.error('\n--------------------------------------------------------');
    console.error(`⚠️  INSUFFICIENT BALANCE FOR ${targetNetwork.name.toUpperCase()} DEPLOYMENT`);
    console.error(`Required Minimum: ~${ethers.formatEther(estimatedCost)} BOT`);
    console.error(`Current Balance:   ${ethers.formatEther(balance)} BOT`);
    console.error(`Deployer Address:  ${wallet.address}`);
    if (targetNetwork.networkKey === 'mainnet') {
      console.error(`To fund your mainnet deployer:`);
      console.error(`1. Official BOT Bridge:  ${targetNetwork.bridgeUrl}`);
      console.error(`2. B DEX Official Swap:  ${targetNetwork.dexUrl}`);
      console.error(`3. Transfer BOT to:      ${wallet.address}`);
    } else {
      console.error(`To claim testnet tokens:`);
      console.error(`1. Official Bohr Faucet: ${targetNetwork.faucetUrl}`);
      console.error(`2. Claim tBOT to:        ${wallet.address}`);
    }
    console.error('--------------------------------------------------------\n');
    throw new Error(`Insufficient funds on ${targetNetwork.name}. Deployment aborted.`);
  }

  console.log('\n[3/4] Broadcasting deployment transaction...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();

  const deployTx = contract.deploymentTransaction();
  console.log('[i] Transaction Hash:', deployTx.hash);
  console.log(`[i] Waiting for transaction confirmation on ${targetNetwork.name} (~0.75s blocks)...`);

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log('\n[4/4] ========================================================');
  console.log(`🎉 CONTRACT DEPLOYED SUCCESSFULLY TO ${targetNetwork.name.toUpperCase()}!`);
  console.log('========================================================');
  console.log('Contract Name:    OrderFlowRegistry');
  console.log('Network:         ', targetNetwork.name);
  console.log('Chain ID:        ', targetNetwork.chainId);
  console.log('Contract Address:', contractAddress);
  console.log('Transaction Hash:', deployTx.hash);
  console.log('BOTScan Explorer:', `${targetNetwork.explorerUrl}/address/${contractAddress}`);
  console.log('========================================================\n');

  // Update secrets.txt
  const secretsPath = path.join(__dirname, '..', 'secrets.txt');
  if (fs.existsSync(secretsPath)) {
    let secretsContent = fs.readFileSync(secretsPath, 'utf8');
    const regex = new RegExp(`${targetNetwork.envVarName}=.*`);
    if (regex.test(secretsContent)) {
      secretsContent = secretsContent.replace(regex, `${targetNetwork.envVarName}=${contractAddress}`);
    } else {
      secretsContent += `\n${targetNetwork.envVarName}=${contractAddress}\n`;
    }
    fs.writeFileSync(secretsPath, secretsContent, 'utf8');
    console.log(`[✓] Updated secrets.txt (${targetNetwork.envVarName}).`);
  }

  // Update multi-network contract artifact in src/lib/contracts/OrderFlowRegistry.json
  const artifactDir = path.join(__dirname, '..', 'src', 'lib', 'contracts');
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  const artifactFile = path.join(artifactDir, 'OrderFlowRegistry.json');

  let existingArtifact = { networks: {} };
  if (fs.existsSync(artifactFile)) {
    try {
      existingArtifact = JSON.parse(fs.readFileSync(artifactFile, 'utf8'));
      if (!existingArtifact.networks) existingArtifact.networks = {};
    } catch {
      existingArtifact = { networks: {} };
    }
  }

  existingArtifact.address = contractAddress; // latest deployed address
  existingArtifact.chainId = targetNetwork.chainId;
  existingArtifact.abi = abi;
  existingArtifact.networks[String(targetNetwork.chainId)] = {
    name: targetNetwork.name,
    networkKey: targetNetwork.networkKey,
    address: contractAddress,
    txHash: deployTx.hash,
    deployedAt: new Date().toISOString(),
    explorerUrl: `${targetNetwork.explorerUrl}/address/${contractAddress}`,
  };

  fs.writeFileSync(artifactFile, JSON.stringify(existingArtifact, null, 2), 'utf8');
  console.log(`[✓] Updated multi-network artifact in src/lib/contracts/OrderFlowRegistry.json`);
}

main().catch((err) => {
  console.error('\n[Deployment Failed]:', err.message || err);
  process.exit(1);
});
