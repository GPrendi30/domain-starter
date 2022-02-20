import React, { useEffect, useState } from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import polygonLogo from './assets/polygonlogo.png';
import ethLogo from './assets/ethlogo.png';

import { networks } from './utils/networks';
import { ethers } from 'ethers';
import contractABI from './utils/Domains.json';

// Constants
const TWITTER_HANDLE = 'gprendi30';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const tld = '.wknd';
const CONTRACT_ADDRESS = '0xbE8f948f361445Eed7c409abF2f790402a0400Af';

const App = () => {

	// metamask account
	const [currentAccount, setCurrentAccount] = useState('');

	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');
	const [network, setNetwork] = useState('');
	const [editing, setEditing] = useState(false);
	const [mints, setMints] = useState([]);
	const [loading, setLoading] = useState(false);

	const connectWallet = async () => {
		try {
			const { ethereum } = window;

			if (!ethereum) {
				alert("Get MetaMask -> https://metamask.io/");
				return;
			}

			// Fancy method to request access to account.
			const accounts = await ethereum.request({ method: "eth_requestAccounts" });

			console.log("Connected", accounts[0]);
			setCurrentAccount(accounts[0]);
		} catch (error) {
			console.log(error)
		}
	}


	const checkIfWalletIsConnected = async () => {
		const { ethereum } = window;
		if (!ethereum) {
			alert("Make sure you have Metamask");
			return;
		} else {
			console.log('Ethereum is connected!', ethereum);
		}

		const accounts = await ethereum.request({ method: 'eth_accounts' });

		if (accounts.length !== 0) {
			const account = accounts[0];
			console.log('Found an authorized account:', account);
			setCurrentAccount(account);
		} else {
			console.log('No authorized account found');
		}

		const chainId = await ethereum.request({ method: 'eth_chainId' });
		setNetwork(networks[chainId]);

		ethereum.on('chainChanged', (_chainId) => {
			window.location.reload();
		});
	};

	const renderNotConnectedContainer = () => {
		if (network !== 'Polygon Mumbai Testnet') {
			return (
				<div className="connect-wallet-container">
					<p>Please connect to the Polygon Mumbai Testnet</p>
					<button className='cta-button mint-button' onClick={switchNetwork}>Click here to switch</button>
				</div>
			);
		}

		return (
			<div className="connect-wallet-container">

				<img src="https://media4.giphy.com/media/W2b8JkhIwnVH7Sr1zl/giphy.gif?cid=ecf05e47mov9hrrq5dv2rs11h8lgj7xbt1621ucsw6sbg62r&rid=giphy.gif&ct=g" alt="Weekend gif" />
				<button onClick={connectWallet} className="cta-button connect-wallet-button">
					Connect Wallet
				</button>
			</div>
		);
	}

	const switchNetwork = async () => {
		if (window.ethereum) {
			try {
				// Try to switch to the Mumbai testnet
				await window.ethereum.request({
					method: 'wallet_switchEthereumChain',
					params: [{ chainId: '0x13881' }], // Check networks.js for hexadecimal network ids
				});
			} catch (error) {
				// This error code means that the chain we want has not been added to MetaMask
				// In this case we ask the user to add it to their MetaMask
				if (error.code === 4902) {
					try {
						await window.ethereum.request({
							method: 'wallet_addEthereumChain',
							params: [
								{
									chainId: '0x13881',
									chainName: 'Polygon Mumbai Testnet',
									rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
									nativeCurrency: {
										name: "Mumbai Matic",
										symbol: "MATIC",
										decimals: 18
									},
									blockExplorerUrls: ["https://mumbai.polygonscan.com/"]
								},
							],
						});
					} catch (error) {
						console.log(error);
					}
				}
				console.log(error);
			}
		} else {
			// If window.ethereum is not found then MetaMask is not installed
			alert('MetaMask is not installed. Please install it to use this app: https://metamask.io/download.html');
		}
	}

	const updateDomain = async () => {
		if (!record || !domain) { return }
		setLoading(true);
		console.log("Updating domain", domain, "with record", record);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

				let tx = await contract.setRecord(domain, record);
				await tx.wait();
				console.log("Record set https://mumbai.polygonscan.com/tx/" + tx.hash);

				fetchMints();
				setRecord('');
				setDomain('');
			}
		} catch (error) {
			console.log(error);
		}
		setLoading(false);
	}

	const mintDomain = async () => {
		if (!domain) { return }

		if (domain.length < 3) {
			alert("Domain name must be at least 3 characters long");
			return;
		}

		const price = domain.length === 3 ? '0.5' : domain.length === 4 ? '0.3' : '0.1';
		console.log("Minting domain", domain, "with price", price);
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

				console.log("Going to pop wallet now to pay gas...");

				let tx = await contract.register(domain, { value: ethers.utils.parseEther(price) });

				const receipt = await tx.wait(); // wait for transaction to be mined

				if (receipt.status === 1) {
					console.log("Domain minted! https://mumbai.polygonscan.com/tx/" + tx.hash);

					tx = contract.setRecord(domain, record);

					await tx.wait();

					console.log("Record set! https://mumbai.polygonscan.com/tx/" + tx.hash);

					setTimeout(() => {
						fetchMints();
					}, 2000);

					setRecord('');
					setDomain('');
				}
			}
			else {
				alert("Transaction failed. Please try again.");
			}
		} catch (error) {
			console.log(error);
		}
	}

	const fetchMints = async () => {
		try {
			const { ethereum } = window;
			if (ethereum) {
				const provider = new ethers.providers.Web3Provider(ethereum);
				const signer = provider.getSigner();
				const contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI.abi, signer);

				// Get all the domain names from our contract
				const names = await contract.getAllNames();

				// For each name, get the record and the address
				const mintRecords = await Promise.all(names.map(async (name) => {
					const mintRecord = await contract.records(name);
					const owner = await contract.domains(name);
					return {
						id: names.indexOf(name),
						name: name,
						record: mintRecord,
						owner: owner,
					};
				}));

				console.log("MINTS FETCHED ", mintRecords);
				setMints(mintRecords);
			}
		} catch (error) {
			console.log(error);
		}
	}

	const renderInputForm = () => {
		return (
			<div className="form-container">
				<div className="first-row">
					<input
						type="text"
						value={domain}
						placeholder='domain'
						onChange={e => setDomain(e.target.value)}
					/>
					<p className='tld'> {tld} </p>
				</div>

				<input
					type="text"
					value={record}
					placeholder='whats ur weekend activity'
					onChange={e => setRecord(e.target.value)}
				/>

				{editing ? (
					<div className="button-container">
						<button className='cta-button mint-button' disabled={loading} onClick={updateDomain}>
							Set record
						</button>
						<button className='cta-button mint-button' onClick={() => { setEditing(false) }}>
							Cancel
						</button>
					</div>
				) : (
					// If editing is not true, the mint button will be returned instead
					<button className='cta-button mint-button' disabled={loading} onClick={mintDomain}>
						Mint
					</button>
				)}
			</div>
		);
	}

	const editRecord = (name) => {
		console.log("Editing record for", name);
		setEditing(true);
		setDomain(name);
	}

	const renderMints = () => {
		if (currentAccount && mints.length > 0) {
			return (
				<div className="mint-container">
					<p className="subtitle"> Recently minted domains!</p>
					<div className="mint-list">
						{ mints.map((mint, index) => {
							return (
								<div className="mint-item" key={index}>
									<div className='mint-row'>
										<a className="link" href={`https://testnets.opensea.io/assets/mumbai/${CONTRACT_ADDRESS}/${mint.id}`} target="_blank" rel="noopener noreferrer">
											<p className="underlined">{' '}{mint.name}{tld}{' '}</p>
										</a>
										{/* If mint.owner is currentAccount, add an "edit" button*/}
										{ mint.owner.toLowerCase() === currentAccount.toLowerCase() ?
											<button className="edit-button" onClick={() => editRecord(mint.name)}>
												<img className="edit-icon" src="https://img.icons8.com/metro/26/000000/pencil.png" alt="Edit button" />
											</button>
											:
											null
										}
									</div>
						<p> {mint.record} </p>
					</div>)
					})}
				</div>
			</div>);
		}
	};

	useEffect(() => {
		checkIfWalletIsConnected();
	}, []);


	return (
		<div className="App">
			<div className="container">

				<div className="header-container">
					<header>
						<div className="left">
							<p className="title">🐱‍👤 Weekend Name Service</p>
							<p className="subtitle">Your Weekend Escape API on the blockchain!</p>
						</div>

						<div className="right">
							<img alt="Network logo" className="logo" src={network.includes("Polygon") ? polygonLogo : ethLogo} />
							{currentAccount ? <p> Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)} </p> : <p> Not connected </p>}
						</div>
					</header>
				</div>


				{!currentAccount && renderNotConnectedContainer()}
				{/* Render the input form if an account is connected */}
				{currentAccount && renderInputForm()}
				{fetchMints() && renderMints()}

				<div className="footer-container">
					<img alt="Twitter Logo" className="twitter-logo" src={twitterLogo} />
					<a
						className="footer-text"
						href={TWITTER_LINK}
						target="_blank"
						rel="noreferrer"
					>{`built by @${TWITTER_HANDLE} with `}</a>
					<a
						className="footer-text"
						target="_blank"
						href='https://twitter.com/_buildspace'
						rel="noreferrer"
					>{' @_buildspace '}</a>
				</div>
			</div>
		</div>
	);
}

export default App;
