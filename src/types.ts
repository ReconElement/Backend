export type Order = {
    asset: "BTC" | "ETH" | "SOL",
    type: "long" | "short",
    margin: number,
    leverage: number,
    slippage: number
};

export type tradeObjectType = {
    name: string,
    messages: {
        id: string,
        messages: {
            id: string,
            message: {
                data: string
            }[];
        }
    }
}[];

