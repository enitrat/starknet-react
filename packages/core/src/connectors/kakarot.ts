import {
    type AddDeclareTransactionParameters,
    type AddInvokeTransactionParameters,
    Permission,
    type Call as RequestCall,
    type RequestFnCall,
    type RpcMessage,
    type RpcTypeToMessageMap,
    type SwitchStarknetChainParameters,
    type TypedData,
} from "@starknet-io/types-js";
import { devnet, mainnet, sepolia } from "@starknet-react/chains";
import {
    Account,
    hash,
    Provider,
    WalletAccount,
    type AccountInterface,
    type Call,
    type ProviderInterface,
    type ProviderOptions,
} from "starknet";
import {
    ConnectorNotConnectedError,
    ConnectorNotFoundError,
    UserRejectedRequestError,
} from "../errors";
import { Connector, type ConnectorData, type ConnectorIcons } from "./base";
import { InjectedConnector, InjectedConnectorOptions } from "./injected";
import { publicProvider } from "../providers";
import { createWalletClient, custom, defineChain, encodeAbiParameters, http, toHex, WalletClient } from 'viem'
import { EIP6963ProviderDetail } from "mipd";


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


export class KakarotConnector extends InjectedConnector {
    public ethereumConnector: WalletClient | undefined;
    public ethProvider: any

    constructor(ethProviderDetail: EIP6963ProviderDetail) {
        super({
            options: {
                id: ethProviderDetail.info.uuid,
                name: ethProviderDetail.info.name,
                icon: ethProviderDetail.info.icon
            }
        });
        this.ethProvider = ethProviderDetail.provider
    }

    switchChain(chainId: bigint): void {
        if (!this.available()) {
            throw new ConnectorNotFoundError();
        }
        let account = this.ethereumConnector?.account?.address;
        if (chainId === sepolia.id) {
            console.log("switch to sepolia");
            this.ethereumConnector?.switchChain({ id: kakarotSepolia.id });
        } else if (chainId === mainnet.id) {
            // throw new Error("Kakarot Mainnet not supported");
            // TODO for debug purpose
            this.ethereumConnector?.switchChain({ id: 1 });
        }
        this.emit("change", { chainId, account });
    }
    async switchAccount(accountIndex: number): Promise<void> {
        if (!this.available()) {
            throw new ConnectorNotFoundError();
        }
        const addresses = await this.ethereumConnector!.getAddresses();
        if (addresses.length <= accountIndex) {
            throw new Error("Account index out of bounds");
        }
        const chainId = await this.ethereumConnector!.getChainId();
        const newAccount = {
            account: addresses[accountIndex],
            chainId: BigInt(chainId),
        };
        this.emit("change", newAccount);
    }

    available(): boolean {
        return this.ethereumConnector !== undefined;
    }

    async chainId(): Promise<bigint> {
        return Promise.resolve(1n);
    }

    async ready(): Promise<boolean> {
        //TODO fix this one
        return this.ethereumConnector?.account?.address !== undefined;
    }

    async connect(): Promise<ConnectorData> {
        const [address] = await createWalletClient({
            chain: kakarotSepolia,
            transport: custom(window.ethereum),
        }).requestAddresses();

        const client = createWalletClient({
            chain: kakarotSepolia,
            transport: custom(window.ethereum!),
            account: address,
        });
        this.ethereumConnector = client;
        const res = {
            account: address,
            chainId: BigInt(await client.getChainId()),
        };
        this.emit("connect", res);
        console.log("emit connect", res);
        return res;
    }

    async disconnect(): Promise<void> {
        this.ethereumConnector = undefined;
        this.emit("disconnect");
    }

    async request<T extends RpcMessage["type"]>(
        call: RequestFnCall<T>,
    ): Promise<RpcTypeToMessageMap[T]["result"]> {
        console.log("request", call);
        const { type, params } = call;

        if (!this.available()) {
            throw new ConnectorNotFoundError();
        }

        switch (type) {
            case "wallet_requestChainId":
                return toHex(await this.ethereumConnector!.getChainId());
            case "wallet_getPermissions":
                const permissions = await this.ethereumConnector!.request({
                    method: 'wallet_requestPermissions',
                    params: [{ eth_accounts: {} }],
                })
                return [];
            case "wallet_requestAccounts":
                const accounts = await this.ethereumConnector!.requestAddresses();
                //TODO: map them to starknet addresses ?
                return accounts;
            case "wallet_addStarknetChain":
                return false;
            case "wallet_watchAsset":
                return false;
            case "wallet_switchStarknetChain": {
                if (!params) throw new Error("Params are missing");

                const { chainId } = params as SwitchStarknetChainParameters;

                this.switchChain(BigInt(chainId));
                return true;
            }
            case "wallet_addDeclareTransaction": {
                return false;
            }
            case "wallet_addInvokeTransaction": {
                if (!params) throw new Error("Params are missing");
                const { calls } = params as AddInvokeTransactionParameters;
                return await this.ethereumConnector!.sendTransaction({
                    account: this.ethereumConnector!.account!.address,
                    chain: this.ethereumConnector!.chain,
                    to: "0x0000000000000000000000000000000000750003",
                    data: prepareTransactionData(calls),
                });
            }
            case "wallet_signTypedData": {
                if (!params) throw new Error("Params are missing");

                //TODO: is it the right typing?
                const { domain, message, primaryType, types } = params as TypedData;

                return this.ethereumConnector!.signMessage({
                    account: this.ethereumConnector!.account!.address,
                    message: message as unknown as string,
                });

                //TODO: sign message
                //   return (await this._account.signMessage({
                //     domain,
                //     message,
                //     primaryType,
                //     types,
                //   })) as string[];
            }
            default:
                throw new Error("Unknown request type");
        }
    }

    async account(
        provider: ProviderOptions | ProviderInterface,
    ): Promise<AccountInterface> {
        console.log("account called");
        if (!this.available()) {
            throw new ConnectorNotFoundError();
        }
        return new Account(provider, "", "");
    }

}

const prepareTransactionData = (calls: RequestCall[]) => {
    const encodedCalls = calls.map((call) => {
        return encodeAbiParameters(
            [
                { type: "uint256", name: "contractAddress" },
                { type: "uint256", name: "selector" },
                { type: "uint256[]", name: "calldata" },
            ],
            [
                BigInt(call.contract_address),
                BigInt(hash.getSelectorFromName(call.entry_point)),
                (call.calldata as string[]).map((data: string) => BigInt(data)),
            ],
        );
    });

    const concatenatedCalls = encodedCalls.join("");
    const callCount = toHex(calls.length, { size: 32 });
    return `${callCount}${concatenatedCalls.slice(2)}` as `0x${string}`;
}
