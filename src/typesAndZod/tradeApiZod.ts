import * as z from 'zod';
const tradeApiZodValidation = z.object({
    asset: z.literal(["BTC","ETH","SOL"]),
    type: z.literal(["long","short"]),
    //margin is not provided by the order api 
    leverage: z.literal([2,5,10,25,100]),
    slippage: z.number(), //in bips aka every number here is 0.01%
});

export default tradeApiZodValidation;
