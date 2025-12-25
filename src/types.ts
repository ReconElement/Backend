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


