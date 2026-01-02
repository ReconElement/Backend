import express from 'express';
import prisma from '../lib/prisma.js';
import Context from '../utils/context.js';
const profile = express.Router();
type Profile = {
    email: string,
    name: string,
    username: string,
    fund: number,
}
profile.get('/', async (req: express.Request, res: express.Response)=>{
    try{
        const user_id = await Context(req);
        const userData = await prisma.user.findUnique({
            where: {
                id: user_id
            },
        });
        if(userData){
            const profile: Profile = {
                email: userData.email,
                name: `${userData.name}`,
                username: userData.username,
                fund: userData.fund
            };
            if(userData && userData.deleted){
                res.status(204).json({
                    message: "User does not exist anymore"
                });
                return;
            };
            res.status(200).json({
                profile: profile
            });
            return;
        }else{
            res.status(404).json({
                message: "User does not exist"
            })
        }
    }catch(e){
        res.status(500).json({
            message: "Internal Server Error"
        })
    }
});

export default profile;