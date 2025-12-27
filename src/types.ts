export type Order = {
    asset: "BTC" | "ETH" | "SOL",
    type: "long" | "short",
    margin: number,
    leverage: number,
    slippage: number,
    quantity: number
};

// export type tradeObjectType = {
//     name: string,
//     messages: {
//         id: string,
//         messages: {
//             id: string,
//             message: {
//                 data: string
//             }[];
//         }
//     }
// }[];

export type tradeObjectType = [
    {
        name: string,
        messages: {
            id: string,
            message: {data: string}
        }[]
    }
];

export type TradeRecievedType = {
    asset: string,
    price: number,
    leverage: number,
    slippage: number,
    quantityPurchased: number,
    balance: number,
    recieved: string,
    type: "short" | "long"
};

export type responseArrayOfActiveTradeType = {
    id: string,
    openPrice: number,
    closePrice: number,
    leverage: number,
    pnl: number,
    assetId: number,
    liquidated: boolean,
    userId: string
}[];