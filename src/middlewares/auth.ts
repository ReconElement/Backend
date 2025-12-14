import express from 'express';
const auth = async (req: express.Request, res: express.Response, next: express.NextFunction)=>{
    const cookies = req.cookies;
    console.log(`Cookies ${cookies}`);
    next();
}

export default auth;