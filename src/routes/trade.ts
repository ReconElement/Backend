import express from 'express';
import Context from '../utils/context.js';
import prisma from '../lib/prisma.js';
import redisClient from '../lib/redis.js';
import tradeApiZodValidation from '../zod-validation/tradeApiZod.js';
import tradeValidationZod from '../zod-validation/tradeValidationZod.js';
import liquidateAssetZod from '../zod-validation/liquidateAssetZod.js';
import type { Order, tradeObjectType, TradeRecievedType, responseArrayOfActiveTradeType } from '../types.js';
import {assets} from '../seed/asset.js';
import type { ExistingTrade } from '../../generated/prisma/browser.js';
import { existsSync } from 'node:fs';
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
            assetPrice: 0,
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
            case 1:
                order.leverage = 1;
                break;
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
                                    assetPrice: JSON.parse(data).assetPrice,
                                    price: JSON.parse(data).price,
                                    leverage: JSON.parse(data).leverage,
                                    slippage: JSON.parse(data).slippage,
                                    quantityPurchased: JSON.parse(data).quantityPurchased,
                                    balance: JSON.parse(data).balance,
                                    recieved: JSON.parse(data).recieved,
                                    type: JSON.parse(data).type
                                }
                                resolve(tradeRecieved);
                                console.log(`Trade Recieved as acknowledgment`);
                                console.log(tradeRecieved);
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
            if (id) {
                //update the user fund
                const updateUserFund = await prisma.user.update({
                    where: {
                        id: user_id,
                    },
                    data: {
                        fund: verify.balance
                    }
                });
                const orderCreated = await prisma.existingTrade.create({
                    data: {
                        openPrice: verify.price,
                        assetPrice: verify.assetPrice,
                        closePrice: 0, //since it is the creation and not liquidation phase
                        leverage: verify.leverage,
                        pnl: 0, //since it has not been liquidated yet, it is 0
                        //@ts-ignore
                        liquidated: false, //since it's the creation bit, it's expected to be not liquidated yet, just created
                        userId: user_id,
                        assetId: id,
                        quantity: verify.quantityPurchased,
                        type: verify.type
                    }
                });
                orderCreated ? console.log("Order created") : console.log("Order not created");
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
        const parse = liquidateAssetZod.safeParse(req.body);
        if(!parse.success){
            res.status(404).json({
                message: "Error occurred during API validation, please provide the input id of the order correctly"
            });
        }
        const {id, quantity} = liquidateAssetZod.parse(req.body);
        console.log(id);
        //get the order and run various checks
        const existingTrade = await prisma.existingTrade.findUnique({
            where: {
                id: id
            }
        });
        console.log(existingTrade);
        if(existingTrade && existingTrade.liquidated===false){
            //quantity check
            if(existingTrade.quantity<quantity){
                res.status(400).json({
                    message: "Invalid request, the quantity provided to be sold exceeds the purchased quantity with this order id"
                })
                return;
            }
            //liquidation check
            if(existingTrade.liquidated){
                res.status(400).json({
                    message: "Invalid request, the trade with this order id has already been liquidated"
                });
                return;
            }
            //get the asset symbol based on the assetId 
            const order: Order = {
                asset: "BTC",
                assetPrice: 0,
                type: "long",
                margin: 0,
                leverage: 0,
                slippage: 0,
                quantity: 0
            };
            const assetSymbol = assets.filter((asset)=>asset.id===existingTrade.assetId).map((asset)=>asset.symbol)[0];
            if (assetSymbol) {
                switch(assetSymbol){
                    case "BTC":
                        order.asset = "BTC";
                        break;
                    case "ETH":
                        order.asset = "ETH";
                        break;
                    case "SOL":
                        order.asset = "SOL";
                }
            }
            order.type = existingTrade.type;
            order.margin = 0; //this differentiates a sell order from a buy/purchase order
            order.leverage = existingTrade.leverage;
            order.assetPrice = existingTrade.assetPrice;
            order.slippage = 1; //slippage is set as 1 blip by default
            order.quantity = quantity//quantity has to be defined by user and updated on db when the trade is recieved
            console.log(`liquidate-asset order ========= liquidate-asset order`);
            console.log(order);
            //update db only when you recieve the confirmation
            const sendOverStream = await redisClient.xAdd("stream","*",{
                data: JSON.stringify(order)
            });
            const acknowledgement = async (sendOverStream: string)=>{
                const item = redisClient.xRead({
                    id: "+",
                    key: "ackStream"
                },{BLOCK: 0});
                return item;
            };
            const ack = async (): Promise<TradeRecievedType> => {
                return new Promise((resolve, reject) => {
                    setTimeout(async () => {
                        let val = await acknowledgement(sendOverStream) as tradeObjectType;
                        const parsed = tradeValidationZod.safeParse(val);
                        if (parsed.success === true) {
                            const data = val[0].messages?.[0]?.message.data;
                            if (data) {
                                const id = JSON.parse(data).recieved;
                                console.log(JSON.parse(data)); //to get the data 
                                if (id === sendOverStream) {
                                    const tradeRecieved: TradeRecievedType = {
                                        asset: JSON.parse(data).asset,
                                        assetPrice: JSON.parse(data).assetPrice,
                                        price: JSON.parse(data).price,
                                        leverage: JSON.parse(data).leverage,
                                        slippage: JSON.parse(data).slippage,
                                        quantityPurchased: JSON.parse(data).quantityPurchased,
                                        balance: JSON.parse(data).balance,
                                        recieved: JSON.parse(data).recieved,
                                        type: JSON.parse(data).type
                                    }
                                    // const tradeRecieved: TradeRecievedType = JSON.parse(data);
                                    resolve(tradeRecieved);
                                }
                                reject();
                            }
                            reject();
                        }
                        reject();
                    }, 100)
                });
            }
            const verify: TradeRecievedType = await ack();
            console.log(verify);
            if(verify){
                //db modifications in ExistingTrade table
                //profit or loss gets updated instead of incrementing
                const tradeModifications = await prisma.existingTrade.update({
                    where: {id: id},
                    data: {
                        // closePrice: verify.balance, //since it's an aggregate price and not the particular price of the single asset
                        closePrice: {
                            increment: verify.balance*existingTrade.leverage,
                        },
                        leverage: verify.leverage,
                        // pnl: existingTrade.pnl + profitOrLoss,
                        quantity: existingTrade.quantity-verify.quantityPurchased,
                        liquidated: existingTrade.quantity-verify.quantityPurchased===0?true:false,
                    }
                });
                //user gets his cost
                const userModifications = await prisma.user.update({
                    where: {id: user_id},
                    data: {
                        fund: {
                            increment: verify.balance
                        }
                    }
                });
                //set the pnl after final resolution
                if(tradeModifications.liquidated){
                    //gives profitnloss on liquidatoion
                    const profitLossUpdate = await prisma.existingTrade.update({
                        where: {
                            id: tradeModifications.id
                        },
                        data: {
                            pnl: (tradeModifications.closePrice - tradeModifications.openPrice)
                        }
                    });
                    //addition of profit to final user balance
                    if(profitLossUpdate){
                        await prisma.user.update({
                            where: {id: user_id},
                            data: {
                                fund: {
                                    increment: profitLossUpdate.pnl
                                }
                            }
                        })
                    }
                }
                const balanceOfUserAfterSelling = await prisma.user.findUnique({
                    where: {id: user_id},
                    select: {fund: true}
                });
                console.log(`Total funds with user after this deal: $ ${balanceOfUserAfterSelling?.fund}`);
                // console.log(`Profit recieved in this run: ${verify.balance}`);
                /**
                 * Test with increasing quantity, then leverage and then by different coins 
                 * 
                 */
                if ( tradeModifications) {
                    res.status(200).json({
                        message: "Trade has been successfully liquidated"
                    });
                    return;
                }
            }
        }else{
            res.status(404).json({
                message: "No trades found with the provided id"
            });
            return;
        }
    }catch(e){
        console.log(`Error in liquidate-asset route: ${e}`);
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
})

export default trade;