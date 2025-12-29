import * as z from "zod";


const TradeRecievedZod = z.object({
    asset: z.literal(["BTC","ETH","SOL"]),
    price: z.float32(),
    leverage: z.literal([1,2,5,10,25,100]),
    quantityPurchased: z.number(),
    balance: z.float32(),
    recieved: z.string(),
    type: z.literal(["long","short"])
});

export default TradeRecievedZod;