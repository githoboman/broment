/**
 * scripts/deploy.js
 *
 * Compiles and deploys OrderFlowRegistry to BOT Chain (Bohr Testnet).
 * Network: Bohr Testnet (Chain ID 968)
 * RPC: https://rpc.bohr.life
 * Explorer: https://scan.bohr.life/
 */

const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');

const NETWORK = {
  name: 'BOT Chain (Bohr Testnet)',
  chainId: 968,
  rpcUrl: 'https://rpc.bohr.life',
  explorerUrl: 'https://scan.bohr.life',
};

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
  console.log('========================================================');
  console.log(`     DEPLOYING ORDERFLOW REGISTRY TO ${NETWORK.name}    `);
  console.log('========================================================\n');

  const { abi, bytecode } = compileContract();

  const creds = loadCredentials();
  const privateKey = process.env.BOTCHAIN_DEPLOYER_PRIVATE_KEY || creds.privateKey;
  if (!privateKey) throw new Error('No BOTCHAIN_DEPLOYER_PRIVATE_KEY found.');

  console.log('[2/4] Connecting to BOT Chain RPC...');
  const provider = new ethers.JsonRpcProvider(NETWORK.rpcUrl, {
    chainId: NETWORK.chainId,
    name: 'bohr-testnet',
  });

  const wallet = new ethers.Wallet(privateKey, provider);
  console.log('[✓] Deployer Address:', wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log(`[✓] Deployer Balance: ${ethers.formatEther(balance)} BOT`);

  if (balance === 0n) {
    throw new Error('Insufficient balance to deploy.');
  }

  console.log('\n[3/4] Broadcasting deployment transaction...');
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const contract = await factory.deploy();

  console.log('[i] Transaction Hash:', contract.deploymentTransaction().hash);
  console.log('[i] Waiting for transaction confirmation on Bohr Testnet (~0.75s blocks)...');

  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  console.log('\n[4/4] ========================================================');
  console.log('🎉 CONTRACT DEPLOYED SUCCESSFULLY TO BOHR TESTNET!');
  console.log('========================================================');
  console.log('Contract Name:    OrderFlowRegistry');
  console.log('Contract Address:', contractAddress);
  console.log('Transaction Hash:', contract.deploymentTransaction().hash);
  console.log('BOTScan Explorer:', `${NETWORK.explorerUrl}/address/${contractAddress}`);
  console.log('========================================================\n');

  // Save address into secrets.txt and artifacts
  const secretsPath = path.join(__dirname, '..', 'secrets.txt');
  if (fs.existsSync(secretsPath)) {
    let secretsContent = fs.readFileSync(secretsPath, 'utf8');
    secretsContent = secretsContent.replace(
      /NEXT_PUBLIC_ORDERFLOW_REGISTRY_ADDRESS=.*/,
      `NEXT_PUBLIC_ORDERFLOW_REGISTRY_ADDRESS=${contractAddress}`
    );
    fs.writeFileSync(secretsPath, secretsContent, 'utf8');
    console.log('[✓] Updated secrets.txt with deployed contract address.');
  }

  // Also save ABI and address to src/lib/OrderFlowRegistry.json for frontend
  const artifactDir = path.join(__dirname, '..', 'src', 'lib', 'contracts');
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, 'OrderFlowRegistry.json'),
    JSON.stringify({ address: contractAddress, abi, chainId: NETWORK.chainId }, null, 2),
    'utf8'
  );
  console.log('[✓] Exported ABI and address to src/lib/contracts/OrderFlowRegistry.json');
}

main().catch((err) => {
  console.error('\n[Deployment Failed]:', err);
  process.exit(1);
});
