import express from 'express';
import Context from '../utils/context.js';
import prisma from '../lib/prisma.js';
import redisClient from '../lib/redis.js';
import tradeApiZodValidation from '../zod-validation/tradeApiZod.js';
import tradeValidationZod from '../zod-validation/tradeValidationZod.js';
import type { Order, tradeObjectType, TradeRecievedType, responseArrayOfActiveTradeType } from '../types.js';
import {assets} from '../seed/asset.js';
const trade = express.Router();

trade.post("/create", async (req: express.Request, res: express.Response)=>{
    try{
        const user_id = await Context(req);
        const body = tradeApiZodValidation.safeParse(req.body);
        if(!body.success){
            res.status(404).json({
                message: "Error occurred during API validation, please try again with valid parameters"
            });
            return;
        }
        const {asset, type, leverage, slippage, quantity} = tradeApiZodValidation.parse(req.body);
        //default trade order object init
        const order: Order = {
            asset: "BTC",
            type: "long",
            margin: 0,
            leverage: 0,
            slippage: 0,
            quantity: 0
        };
        switch(asset){
            case "BTC":
                order.asset = "BTC";
                break;
            case "ETH":
                order.asset = "ETH";
                break;
            case "SOL":
                order.asset = "SOL";
                break;
            default:
                res.status(400).json({
                    message: "No asset of this name exists"
                });
                return;
        }
        switch(type){
            case "long":
                order.type = "long";
                break;
            case "short":
                order.type = "short";
                break;
            default: 
                res.status(400).json({
                    message: "No order of this type exists",
                });
                return;
        }
        //margin is the funds the user has 
        const user = await prisma.user.findUnique({
            where: {
                id: user_id
            },
            select: {
                fund: true
            }
        });
        if(!user){
            res.status(400).json({
                message: "No funds found with user"
            });
            return;
        }
        if(user.fund){
            order.margin = user.fund*100*100; //apparently decimal is fixed at 4, hence multiplied with 100*100
        };
        switch(leverage){
            case 2:
                order.leverage = 2;
                break;
            case 5:
                order.leverage = 5;
                break;
            case 10:
                order.leverage = 10;
                break;
            case 100:
                order.leverage = 100;
                break;
            default: 
                res.status(400).json({
                    message: "No such leverage exists"
                });
                return;
        };
        order.slippage = slippage;
        order.quantity = quantity;
        // console.log(order);
        //send the purchase order to engine 
        const sendOverStream = await redisClient.xAdd("stream",'*',{
            data: JSON.stringify(order)
        });
        const acknowledgement = async function(sendOverStream: string){
            const item = await redisClient.xRead({
                id: '+',
                key: "ackStream"
            },{BLOCK: 0});
            return item;
        };
        let ack = async function(): Promise<TradeRecievedType>{
            return new Promise((resolve, reject)=>{
                setTimeout(async ()=>{
                    let val = await acknowledgement(sendOverStream) as tradeObjectType;
                    const parsed = tradeValidationZod.safeParse(val);
                    if(parsed.success === true){
                        const data = val[0].messages?.[0]?.message.data;
                        if(data){
                            const id = JSON.parse(data).recieved;
                            console.log(JSON.parse(data)); //to get the data 
                            if(id===sendOverStream){
                                const tradeRecieved: TradeRecievedType = {
                                    asset: JSON.parse(data).asset,
                                    price: JSON.parse(data).price,
                                    leverage: JSON.parse(data).leverage,
                                    slippage: JSON.parse(data).slippage,
                                    quantityPurchased: JSON.parse(data).quantityPurchased,
                                    balance: JSON.parse(data).balance,
                                    recieved: JSON.parse(data).recieved,
                                    type: JSON.parse(data).type
                                }
                                resolve(tradeRecieved);
                            }
                            reject();
                        }
                        reject();
                    }
                    reject();
                },100)
            })
        };
        const verify: TradeRecievedType = await ack();
        if(verify){
            const id = assets.filter((asset)=>asset.symbol===verify.asset).map((asset)=>asset.id)[0];
            if(id){
            const orderCreated = await prisma.existingTrade.create({
                data: {
                    openPrice: verify.price,
                    closePrice: 0, //since it is the creation and not liquidation phase
                    leverage: verify.leverage,
                    pnl: 0, //since it has not been liquidated yet, it is 0
                    //@ts-ignore
                    liquidated: false, //since it's the creation bit, it's expected to be not liquidated yet, just created
                    userId: user_id,
                    assetId: id
                }
                });
                orderCreated?console.log("Order created"):console.log("Order not created");
            }
            res.status(200).json({
                message: "Order placed successfully"
            });
            return;
        }
    }catch(e){
        console.log(`Error in trade/create route: ${e}`);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

trade.get("/active-trades", async (req: express.Request, res: express.Response)=>{
    try{
        const user_id = await Context(req);
        const activeTrades = await prisma.existingTrade.findMany({
            where: {
                userId: user_id
            }
        });
        // console.log(activeTrades);
        
        const responseArrayOfActiveTrades: responseArrayOfActiveTradeType = activeTrades.filter((item)=>item.liquidated===false).map((item)=>item);
        console.log(responseArrayOfActiveTrades);
        res.status(200).json({
            message: responseArrayOfActiveTrades
        });
    }catch(e){
        console.log(`Error in active-trades route: ${e}`);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

trade.get("/trades", async (req: express.Request, res: express.Response)=>{
    try{
        const user_id = await Context(req);
        const trades = await prisma.existingTrade.findMany({
            where: {
                userId: user_id
            }
        });
        const responseArrayOfTrades: responseArrayOfActiveTradeType = trades.map((item)=>item);
        res.status(200).json({
            message: responseArrayOfTrades
        });
    }catch(e){
        console.log(`Error in trades route: ${e}`);
        res.status(500).json({
            message: "Internal Server Error"
        });
    }
});

trade.post("/liquidate-asset", async (req: express.Request, res: express.Response)=>{
    try{
        const user_id = await Context(req);
        /**
         * the body should be like 
         * {id: "{uuid of trade}"}
         */
        const {id} = req.body;
        
    }catch(e){
        console.log(`Error in liquidate-asset route: ${e}`);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
})

export default trade;