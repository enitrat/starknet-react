import { InjectedConnector } from "./injected";
import { KakarotConnector } from "./kakarot";
import { createStore } from 'mipd'

export function argent(): InjectedConnector {
  return new InjectedConnector({
    options: {
      id: "argentX",
      name: "Argent X",
    },
  });
}

export function braavos(): InjectedConnector {
  return new InjectedConnector({
    options: {
      id: "braavos",
      name: "Braavos",
    },
  });
}

export function injected({ id }: { id: string }): InjectedConnector {
  return new InjectedConnector({
    options: {
      id,
    },
  });
}

export function kakarot(): InjectedConnector {
  return new KakarotConnector({
    options: {
      id: "kakarot",
      name: "Kakarot",
    },
  });
}

export function kakarotConnectors(): InjectedConnector[] {

// Set up a MIPD Store, and request Providers.
const store = createStore()

// Subscribe to the MIPD Store.
store.subscribe(providerDetails => {
  console.log(providerDetails)
  // => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]
})

// Retrieve emitted Providers.
const allProviders = store.getProviders()
// => [EIP6963ProviderDetail, EIP6963ProviderDetail, ...]

  return allProviders.map((provider) => {
    return new KakarotConnector({
      ethProvider: provider,
      options: {
        id: provider.info.rdns,
        name: provider.info.name,
        icon: provider.info.icon
      },
    });
  });
}
