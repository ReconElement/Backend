import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import user from './routes/user.js';
import auth from './middlewares/auth.js';
import balance from './routes/balance.js';
import trade from './routes/trade.js';
const app = express();
const PORT = process.env.PORT || 4000;
dotenv.config();
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(cookieParser());
app.get('/',(req, res)=>{
    res.status(200).json({
        message: `Hello to PORT: ${PORT} from Express server`
    })
});

app.use('/api/v1/', user);


app.use(auth);

app.use('/api/v1/balance', balance);
app.use('/api/v1/trade',trade);

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