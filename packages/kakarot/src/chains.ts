import { defineChain } from "viem";
import { mainnet, sepolia } from "@starknet-react/chains";

export const KAKAROT_DEPLOYMENTS = {
  sepolia: "0x1d2e513630d8120666fc6e7d52ad0c01479fd99c183baac79fff9135f46e359",
};

export const kakarotSepolia = /*#__PURE__*/ defineChain({
  id: 920637907288165,
  name: "Kakarot Sepolia",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://sepolia-rpc.kakarot.org"],
    },
  },
  blockExplorers: {
    default: {
      name: "Kakarot Scan",
      url: "https://sepolia.kakarotscan.org",
    },
  },
  testnet: true,
});
