import type {
  ChainProviderFactory,
  InjectedConnector,
} from "@starknet-react/core";
import { createStore } from "mipd";
import { KakarotConnector } from "./kakarot";
import { RpcProvider } from "starknet";

export function kakarotConnectors(
  starknetRpcProvider: ChainProviderFactory<RpcProvider>,
): InjectedConnector[] {
  console.log("kakarotConnectors");
  // Set up a MIPD Store, and request Providers.
  const store = createStore();

  // Subscribe to the MIPD Store.
  store.subscribe((providerDetails) => {
    console.log(providerDetails);
    // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
  });

  // Retrieve emitted Providers.
  const allProviders = store.getProviders();
  // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]

  return allProviders.map((provider) => {
    console.log("provider", provider);
    return new KakarotConnector(provider, starknetRpcProvider);
  });
}
