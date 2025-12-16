import express from 'express';
import prisma from '../lib/prisma.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import signupZodValidation from '../zod-validation/signupZod.js';
import loginZodValidation from '../zod-validation/loginZod.js';
const user = express.Router();

user.post('/signup', async (req: express.Request, res: express.Response)=>{
    try{
        const body = signupZodValidation.safeParse(req.body);
        if(!body.success){
            res.status(404).json({
                message: "Error occurred during API validation, please try again with valid parameters"
            });
            return;
        };
        const {firstname, lastname, email, username, password} = signupZodValidation.parse(req.body);
        //find that no other rows exist with the same username and email 
        const userFound = await prisma.user.findFirst({
            where: {
                OR: [
                    {email: email},
                    {username: username}
                ]
            }
        });
        if(userFound){
            res.status(422).json({
                message: "User with the same email or username already exists"
            });
            return;
        };
        //encrypting the password before saving in db
        const hashPassword = await bcrypt.hash(password, 10);
        const createUser = await prisma.user.create({
            data: {
                email: email,
                username: username,
                password: hashPassword,
                name: `${firstname} ${lastname}`,
                fund: Number(5000.00),
                deleted: false,
            }
        });
        if(createUser){
            res.status(200).json({
                message: "User created successfully"
            });
            return;
        }
        
    }catch(e){
        res.status(500).json({
            message: "Internal Server Error"
        });
        console.log(`Error: ${e}`);
        return;
    }
});

user.post("/login",async (req: express.Request, res: express.Response)=>{
    try{
        const body = loginZodValidation.safeParse(req.body);
        if(!body.success){
            res.status(404).json({
                message: "Error occurred during API validation, please try again with valid parameters"
            });
            return;
        }
        const {username, password} = loginZodValidation.parse(req.body);
        const user = await prisma.user.findUnique({
            where: {
                username: username
            }
        });
        if(!user){
            res.status(404).json({
                message: "User not found with the provided credentials"
            });
            return;
        };
        if(user){
            const match = await bcrypt.compare(password, user.password);
            if(!match){
                res.status(401).json({
                    message: "Unauthorized access, please provide the correct password"
                });
                return;
            }else if(user.deleted==true){
                res.status(410).json({
                    message: "Requested user does not exist anymore"
                });
                return;
            } 
            else{
                const token = jwt.sign({id: user.id}, process.env.SECRET_KEY, {expiresIn: "1hr"});
                res.setHeader("Set-Cookie",
                    cookie.stringifySetCookie({
                        name: "JWT_bearer",
                        value: token,
                        httpOnly: true,
                        secure: false, //since no HTTPS connection in dev mode make sure to change in deploy mode 
                        maxAge: 1*60*60, //1 hour
                        path: '/'
                    })
                );
                res.status(302).json({
                    message: "User found and authenticated"
                });
                return;
            }
        }
    }catch(e){
        res.status(500).json({
            message: "Internal Server Error"
        });
        console.log(`Error during login: ${e}`);
        return;
    }
})

export default user;