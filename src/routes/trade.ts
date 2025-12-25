import express from 'express';
import Context from '../utils/context.js';
import prisma from '../lib/prisma.js';
import redisClient from '../lib/redis.js';
import tradeApiZodValidation from '../zod-validation/tradeApiZod.js';
import tradeValidationZod from '../zod-validation/tradeValidationZod.js';
import type { Order, tradeObjectType } from '../types.js';
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
        console.log(order);
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
        let ack = async function(): Promise<boolean>{
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
                                resolve(true);
                            }
                            reject();
                        }
                        reject();
                    }
                    reject();
                },100)
            })
        };
        
        if(await ack()){
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

export default trade;