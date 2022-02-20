import React, { useEffect, useState } from 'react';
import './styles/App.css';
import twitterLogo from './assets/twitter-logo.svg';
import { ethers } from 'ethers';
import contractABI from './utils/Domains.json';

// Constants
const TWITTER_HANDLE = 'gprendi30';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const tld = '.wknd';
const CONTRACT_ADDRESS = '0x2735A9CB2BFF24afA25B80abb0714040B40199ED';

const App = () => {

	// metamask account
	const [currentAccount, setCurrentAccount] = useState('');

	const [domain, setDomain] = useState('');
	const [record, setRecord] = useState('');

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
	};

	const renderNotConnectedContainer = () => (
		<div className="connect-wallet-container">

			<img src="https://media4.giphy.com/media/W2b8JkhIwnVH7Sr1zl/giphy.gif?cid=ecf05e47mov9hrrq5dv2rs11h8lgj7xbt1621ucsw6sbg62r&rid=giphy.gif&ct=g" alt="Weekend gif" />
			<button onClick={connectWallet} className="cta-button connect-wallet-button">
				Connect Wallet
			</button>
		</div>
	);

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

				<div className="button-container">
					<button className='cta-button mint-button' onClick={mintDomain}>
						Mint
					</button>
					<button className='cta-button mint-button' disabled={null} onClick={null}>
						Set data
					</button>
				</div>

			</div>
		);
	}

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
					</header>
				</div>


				{!currentAccount && renderNotConnectedContainer()}
				{/* Render the input form if an account is connected */}
				{currentAccount && renderInputForm()}

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
