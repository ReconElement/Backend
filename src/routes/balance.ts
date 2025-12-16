import express from 'express';
import Context from '../utils/context.js';
import prisma from '../lib/prisma.js';
const balance = express.Router();
//it just shows the initial balance of the user, by fetching it from the db
balance.get("/", async (req: express.Request, res: express.Response)=>{
    const id = await Context(req);
    const user = await prisma.user.findUnique({
        where: {
            id: id
        }
    });
    if(user){
        const lengthOfDigits = user.fund.toString().length;
        res.status(200).json({
            message: `${user.fund.toPrecision(lengthOfDigits+3)}`
        });
        return;
    }
});

export default balance;