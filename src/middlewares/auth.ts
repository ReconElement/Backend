import express from 'express';
import jwt from 'jsonwebtoken';
const auth = async (req: express.Request, res: express.Response, next: express.NextFunction)=>{
    const cookies = req.cookies;
    const token = cookies["JWT_bearer"];
    if(!token){
        // console.log("Unauthorized access");
        res.status(401).json({
            message: "Unauthorized, access denied"
        });
        return;
    }
    const verify = jwt.verify(token, process.env.SECRET_KEY);
    if(typeof verify === "object"){
        if(verify.id){
            next();
        }
    }else{
        res.status(401).json({
            message: "Unauthorized, access denied"
        });
    }
};

export default auth;