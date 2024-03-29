import { Provider, chain, defaultChains } from 'wagmi'
import { InjectedConnector } from 'wagmi/connectors/injected'
// import { WalletConnectConnector } from 'wagmi/connectors/walletConnect'
// import { WalletLinkConnector } from 'wagmi/connectors/walletLink'

import { Example } from './Components'

// API key for Ethereum node
// Two popular services are Infura (infura.io) and Alchemy (alchemy.com)
const infuraId = process.env.REACT_APP_INFURA_ID;

// Chains for connectors to support
const chains = defaultChains

// Set up connectors
const connectors = ({ chainId }: any) => {
  const rpcUrl =
    chains.find((x) => x.id === chainId)?.rpcUrls?.[0] ??
    chain.mainnet.rpcUrls[0]
  return [
    new InjectedConnector({
      chains,
      options: { shimDisconnect: true },
    }),
    // new WalletConnectConnector({
    //   options: {
    //     infuraId,
    //     qrcode: true,
    //   },
    // }),
    // new WalletLinkConnector({
    //   options: {
    //     appName: 'My wagmi app',
    //     jsonRpcUrl: `${rpcUrl}/${infuraId}`,
    //   },
    // }),
  ]
}

export const Connector = () => {
  return (
    <Provider autoConnect connectors={connectors}>
    <Example />
  </Provider>
  )
}