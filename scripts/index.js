
const { default: BigNumber } = require('bignumber.js');
const qs = require('qs');
const Web3 = require('web3');

const tokensAllowList = ['WBTC', 'WETH', 'WMATIC', 'WFTM', 'DAI', 'USDC', 'USDT', 'FRAX', 'BUSD'];
const fullTokenListSource = 'CoinGecko';

const networksAllowList = ['Ethereum', 'Polygon', 'Binance Smart Chain', 'Optimism', 'Fantom', 'Celo', 'Avalanche', 'Ropsten (Eth)'];
const networkAPIobj = {
    'Ethereum': ['https://api.0x.org', 'https://tokens.coingecko.com/uniswap/all.json'],  // mainnet
    'Polygon': ['https://polygon.api.0x.org', 'https://tokens.coingecko.com/polygon-pos/all.json'],
    'Binance Smart Chain': ['https://bsc.api.0x.org', 'https://tokens.coingecko.com/binance-smart-chain/all.json'],
    'Optimism': ['https://optimism.api.0x.org', 'https://tokens.coingecko.com/optimistic-ethereum/all.json'],
    'Fantom': ['https://fantom.api.0x.org', 'https://tokens.coingecko.com/fantom/all.json'],
    'Celo': ['https://celo.api.0x.org', 'https://tokens.coingecko.com/celo/all.json'],
    'Avalanche': ['https://avalanche.api.0x.org', 'https://tokens.coingecko.com/avalanche/all.json'],
    'Ropsten (Eth)': ['https://ropsten.api.0x.org', 'https://tokens.coingecko.com/uniswap/all.json'],
}
const ropstenERC20address = {
    'DAI': '0x31F42841c2db5173425b5223809CF3A38FEde360', // '0xaD6D458402F60fD3Bd25163575031ACDce07538D',
    'WETH': '0xc778417E063141139Fce010982780140Aa0cD5Ab',
    'USDC': '0x07865c6E87B9F70255377e024ace6630C1Eaa37F',
}
let currentNetwork = networksAllowList[0];
let baseURL = networkAPIobj[currentNetwork][0];
let fullTokenListURL = networkAPIobj[currentNetwork][1];
let currentTrade;
let currentSelectSide;
let tokens;

function shorten_Ether_address(full_address) {
    return full_address.substring(0, 5) + '...' + full_address.substring(full_address.length - 4);
}

async function init() {
    document.getElementById("selectedNetwork").innerHTML = currentNetwork;

    console.log("initializing full", fullTokenListSource, "list for", currentNetwork, "...");
    let response = await fetch(fullTokenListURL);
    let tokenListJSON = await response.json();
    tokens = tokenListJSON.tokens;
    console.log(tokens);

    // create token list for modal
    let parent = document.getElementById("token_list");
    parent.innerHTML = "";
    for (const i in tokens) {
        // token row in the modal token list
        if (tokensAllowList.includes(tokens[i].symbol)) {
            let div = document.createElement("div");
            div.className = "token_row";
            let html = `<img class="token_list_img" src="${tokens[i].logoURI}"><span class="token_list_text">${tokens[i].symbol}</span>`;
            div.innerHTML = html;
            div.onclick = () => {
                selectToken(tokens[i]);
            };
            parent.appendChild(div);
        }
    }
    currentTrade = {};
}

function selectToken(token) {
    closeModal();

    if (currentNetwork === 'Ropsten (Eth)') {
        token.chainId = 3;
        try {
            token.address = ropstenERC20address[token.symbol];
        } catch (error) { pass }
    }
    currentTrade[currentSelectSide] = token;
    console.log("currentTrade:", currentTrade);
    renderInterface();
}

function renderInterface() {
    if (currentTrade.from) {
        document.getElementById("from_token_img").src = currentTrade.from.logoURI;
        document.getElementById("from_token_text").innerHTML = currentTrade.from.symbol;
    }
    if (currentTrade.to) {
        document.getElementById("to_token_img").src = currentTrade.to.logoURI;
        document.getElementById("to_token_text").innerHTML = currentTrade.to.symbol;
    }
}

async function connect() {
    if (typeof window.ethereum !== "undefined") {
        try {
            await ethereum.request({ method: "eth_requestAccounts" });
        } catch (error) {
            console.log(error);
        }
        const accounts = await ethereum.request({ method: "eth_accounts" });
        console.log("Connected:", shorten_Ether_address(accounts[0]));

        document.getElementById("login_button").innerHTML = shorten_Ether_address(accounts[0]);
        document.getElementById("swap_button").disabled = false;
    } else {
        document.getElementById("login_button").innerHTML =
            "Please install MetaMask";
    }
}

function setNetwork(networkId) {
    currentNetwork = networksAllowList[networkId];
    baseURL = networkAPIobj[currentNetwork][0];
    document.getElementById("selectedNetwork").innerHTML = currentNetwork;

    fullTokenListURL = networkAPIobj[currentNetwork][1];

    init();
}

function openModal(side) {
    currentSelectSide = side;
    document.getElementById("token_modal").style.display = "block";
}

function closeModal() {
    document.getElementById("token_modal").style.display = "none";
}

async function getPrice() {
    if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;

    console.log("getting price...");
    let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);

    const params = {
        sellToken: currentTrade.from.address,
        buyToken: currentTrade.to.address,
        sellAmount: amount,
    }

    // Fetch the swap price.
    const response = await fetch(
        `${baseURL}/swap/v1/price?${qs.stringify(params)}`
    );

    swapPriceJSON = await response.json();
    console.log("swapPrice:", swapPriceJSON);

    document.getElementById("to_amount").value = swapPriceJSON.buyAmount / (10 ** currentTrade.to.decimals);
    document.getElementById("gas_estimate").innerHTML = swapPriceJSON.estimatedGas;
}

async function getQuote(account) {
    if (!currentTrade.from || !currentTrade.to || !document.getElementById("from_amount").value) return;

    console.log("getting quote...");
    let amount = Number(document.getElementById("from_amount").value * 10 ** currentTrade.from.decimals);

    const params = {
        sellToken: currentTrade.from.address,
        buyToken: currentTrade.to.address,
        sellAmount: amount,
        takerAddress: account,
    }

    // Fetch the swap quote.
    const response = await fetch(
        `${baseURL}/swap/v1/quote?${qs.stringify(params)}`
    );

    swapQuoteJSON = await response.json();
    console.log("Quote:", swapQuoteJSON);

    document.getElementById("to_amount").value = swapQuoteJSON.buyAmount / (10 ** currentTrade.to.decimals);
    document.getElementById("gas_estimate").innerHTML = swapQuoteJSON.estimatedGas;

    return swapQuoteJSON;
}

async function trySwap() {

    let accounts = await ethereum.request({ method: "eth_accounts" });
    let takerAddress = accounts[0];

    console.log("takerAddress:", takerAddress);

    const swapQuoteJSON = await getQuote(takerAddress);

    // Set Token Allowance
    // Interact with the ERC20TokenContract
    const web3 = new Web3(Web3.givenProvider);
    const fromTokenAddress = currentTrade.from.address;
    const erc20abi = [{ "inputs": [{ "internalType": "string", "name": "name", "type": "string" }, { "internalType": "string", "name": "symbol", "type": "string" }, { "internalType": "uint256", "name": "max_supply", "type": "uint256" }], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "owner", "type": "address" }, { "indexed": true, "internalType": "address", "name": "spender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Approval", "type": "event" }, { "anonymous": false, "inputs": [{ "indexed": true, "internalType": "address", "name": "from", "type": "address" }, { "indexed": true, "internalType": "address", "name": "to", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" }], "name": "Transfer", "type": "event" }, { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "spender", "type": "address" }], "name": "allowance", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "approve", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "burnFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "decimals", "outputs": [{ "internalType": "uint8", "name": "", "type": "uint8" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "subtractedValue", "type": "uint256" }], "name": "decreaseAllowance", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "spender", "type": "address" }, { "internalType": "uint256", "name": "addedValue", "type": "uint256" }], "name": "increaseAllowance", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "totalSupply", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transfer", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "sender", "type": "address" }, { "internalType": "address", "name": "recipient", "type": "address" }, { "internalType": "uint256", "name": "amount", "type": "uint256" }], "name": "transferFrom", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "nonpayable", "type": "function" }]
    const ERC20TokenContract = new web3.eth.Contract(erc20abi, fromTokenAddress);

    console.log("setup ERC20TokenContract:", ERC20TokenContract);

    const currentAllowance = new BigNumber(
        ERC20TokenContract.allowance(takerAddress, swapQuoteJSON.allowanceTarget).call()
    );
    console.log("sellAmount:", swapQuoteJSON.sellAmount)
    console.log("currentAllowance:", currentAllowance);
    if (currentAllowance.isLessThan(swapQuoteJSON.sellAmount)) {
        console.log("awaiting approval for", swapQuoteJSON.sellAmount, "at", swapQuoteJSON.allowanceTarget, "from", takerAddress)
        await ERC20TokenContract
            .approve(swapQuoteJSON.allowanceTarget, swapQuoteJSON.sellAmount)
            .send({ from: takerAddress })
            .then(tx => {
                console.log("tx:", tx)
            })
    }

    // Perform the swap
    const receipt = await web3.eth.sendTransaction(swapQuoteJSON);
    console.log("receipt:", receipt);

}

init();
document.getElementById("login_button").onclick = connect;
document.getElementById("networkDropdown0").onclick = () => { setNetwork(0) };
document.getElementById("networkDropdown1").onclick = () => { setNetwork(1) };
document.getElementById("networkDropdown2").onclick = () => { setNetwork(2) };
document.getElementById("networkDropdown3").onclick = () => { setNetwork(3) };
document.getElementById("networkDropdown4").onclick = () => { setNetwork(4) };
document.getElementById("networkDropdown5").onclick = () => { setNetwork(5) };
document.getElementById("networkDropdown6").onclick = () => { setNetwork(6) };
document.getElementById("networkDropdown7").onclick = () => { setNetwork(7) };
document.getElementById("from_token_select").onclick = () => { openModal("from") };
document.getElementById("to_token_select").onclick = () => { openModal("to") };
document.getElementById("modal_close").onclick = closeModal;
document.getElementById("from_amount").onblur = getPrice;
document.getElementById("swap_button").onclick = trySwap;