const { ethers } = require("ethers");
const provider = new ethers.providers.JsonRpcProvider("https://rpc.chiadochain.net");
const wallet = new ethers.Wallet("0xceffa03fbbcf3897878d3b4c158dc7a050b51c0b8c3de665abfb5350389920b8", provider);

async function checkBalance() {
  const balance = await wallet.getBalance();
  console.log("Wallet Balance:", ethers.utils.formatEther(balance), "xDAI");
}

checkBalance();