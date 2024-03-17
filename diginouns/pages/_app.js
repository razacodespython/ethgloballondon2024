import "@/styles/globals.css";
import { DynamicContextProvider, DynamicWidget } from '@dynamic-labs/sdk-react-core';
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";

export default function App({ Component, pageProps }) {
  return (
    <DynamicContextProvider 
    settings={{ 
      environmentId: 'a772f6eb-06e7-412e-9e96-6985f12140b8',
      walletConnectors: [ EthereumWalletConnectors ],
    }}> 
  
  <Component {...pageProps} />
  </DynamicContextProvider> 
  )
}
