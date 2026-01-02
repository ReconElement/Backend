import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import user from './routes/user.js';
import auth from './middlewares/auth.js';
import balance from './routes/balance.js';
import trade from './routes/trade.js';
import profile from './routes/profile.js';
const app = express();
const PORT = process.env.PORT || 4000;
dotenv.config();
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(cookieParser());

const allowList = ['localhost:3000']

let corsOptionDelegate = (req: express.Request, callback: CallableFunction)=>{
    let corsOption = {
        origin: false,
        credentials: true
    };
    let origin;
    if(req.headers.origin){
        origin = req.headers.origin;
        if(allowList.indexOf(origin)!==-1){
            corsOption = {...corsOption, origin: true}
        }else{
            corsOption = {...corsOption, origin: true}
        }
    }
    callback(null, corsOption)
}
app.use(cors(corsOptionDelegate));
app.get('/',(req, res)=>{
    res.status(200).json({
        message: `Hello to PORT: ${PORT} from Express server`
    })
});

app.use('/api/v1/', user);


app.use(auth);

app.use('/api/v1/balance', balance);
app.use('/api/v1/trade',trade);
app.use('/api/v1/profile',profile);

app.get("/secure",async (req, res)=>{
    res.status(200).json({
        message: "Auth middleware works"
    });
});

app.get('/api/v1/supportedAssets', async (req, res)=>{
    const assets = {
        assets: [{
            symbol: "BTC",
            name: "Bitcoin",
            imageUrl: "https://bitcoin.org/img/icons/logotop.svg?1749679667"
        },{
            symbol: "ETH",
            name: "Ethereum",
            imageUrl: "https://ethereum.org/favicon.ico"
        },{
            symbol: "SOL",
            name: "Solana",
            imageUrl: "https://solana.com/favicon.svg"
        }]
    }
    res.status(200).json(assets);
});

app.listen(PORT, ()=>{
    console.log(`Server listening at PORT: ${PORT}`);
})