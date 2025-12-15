import express from 'express';
import {prisma} from '../lib/prisma.js';
import jwt from 'jsonwebtoken';
export default async function Context(req: express.Request):Promise<string>{
    const token = req.cookies["JWT_bearer"];
    let verify = await jwt.verify(token, process.env.SECRET_KEY);
    if(typeof verify === 'object'){
        return verify.id;
    }
    return "null";
};

