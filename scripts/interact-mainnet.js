/**
 * scripts/interact-mainnet.js
 *
 * Executes a live on-chain verification interaction with OrderFlowRegistry on BOT Chain Mainnet (Chain ID 677).
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

async function main() {
  const artifactPath = path.join(__dirname, '..', 'src', 'lib', 'contracts', 'OrderFlowRegistry.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const contractAddress = artifact.networks['677'].address;
  const abi = artifact.abi;

  const secretsPath = path.join(__dirname, '..', 'secrets.txt');
  const secrets = fs.readFileSync(secretsPath, 'utf8');
  const pkMatch =
    secrets.match(/BOTCHAIN_MAINNET_DEPLOYER_PRIVATE_KEY=([0-9a-fA-Fx]+)/) ||
    secrets.match(/BOTCHAIN_DEPLOYER_PRIVATE_KEY=([0-9a-fA-Fx]+)/);

  if (!pkMatch || !pkMatch[1]) {
    throw new Error('No deployer private key found in secrets.txt');
  }

  let privateKey = pkMatch[1].trim();
  if (!privateKey.startsWith('0x')) privateKey = '0x' + privateKey;

  const fetchReq = new ethers.FetchRequest('https://rpc.botchain.ai');
  fetchReq.timeout = 15000;
  const provider = new ethers.JsonRpcProvider(fetchReq, ethers.Network.from(677), {
    staticNetwork: ethers.Network.from(677),
  });

  const wallet = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(contractAddress, abi, wallet);

  const balance = await provider.getBalance(wallet.address);
  const feeData = await provider.getFeeData();
  const block = await provider.getBlock('latest');
  console.log('Block baseFeePerGas:', block?.baseFeePerGas ? ethers.formatUnits(block.baseFeePerGas, 'gwei') : 'none');
  console.log('FeeData:', {
    gasPrice: feeData.gasPrice ? ethers.formatUnits(feeData.gasPrice, 'gwei') : null,
    maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : null,
  });
  const gasPrice = feeData.gasPrice || ethers.parseUnits('20', 'gwei');

  console.log('========================================================');
  console.log('   ORDERFLOW MAINNET ON-CHAIN INTERACTION VERIFIER      ');
  console.log('========================================================');
  console.log('Contract Address:', contractAddress);
  console.log('Caller Wallet:   ', wallet.address);
  console.log('Wallet Balance:  ', ethers.formatEther(balance), 'BOT');

  const reportId = ethers.id('orderflow-mainnet-genesis-report-v1');
  const tradeCount = 50n;
  const winRate = 5850n; // 58.50%
  const sizeRatio = 0n;
  const dominantDna = '';

  const alreadyRegistered = await contract.isReportRegistered(reportId);
  if (alreadyRegistered) {
    console.log('[✓] Genesis report already notarized on BOT Chain Mainnet.');
    const total = await contract.totalReportsNotarized();
    console.log('[✓] Total Reports Notarized on Mainnet:', total.toString());
    return;
  }

  const estimatedGas = await contract.notarizeReport.estimateGas(
    reportId,
    tradeCount,
    winRate,
    sizeRatio,
    dominantDna
  );
  const customGasPrice = ethers.parseUnits('20', 'gwei');
  const estimatedCost = estimatedGas * customGasPrice;

  console.log('Estimated Gas:   ', estimatedGas.toString(), 'units');
  console.log('Estimated Cost (at 20 Gwei):', ethers.formatEther(estimatedCost), 'BOT');

  if (balance < estimatedCost) {
    console.log('[i] Remaining balance below gas estimate for extra notarization call.');
    return;
  }

  console.log('\nBroadcasting notarizeReport() to BOT Chain Mainnet...');
  const tx = await contract.notarizeReport(
    reportId,
    tradeCount,
    winRate,
    sizeRatio,
    dominantDna,
    { gasPrice: customGasPrice, gasLimit: estimatedGas + 5000n }
  );
  console.log('Transaction Hash:', tx.hash);
  const receipt = await tx.wait();
  console.log('[✓] Confirmed in Block #' + receipt.blockNumber);
  console.log('BOTScan TX URL:  https://scan.botchain.ai/tx/' + tx.hash);

  const totalReports = await contract.totalReportsNotarized();
  console.log('[✓] On-Chain State Verified — totalReportsNotarized:', totalReports.toString());
}

main().catch((err) => {
  console.error('[Error]:', err.message || err);
  process.exit(1);
});
