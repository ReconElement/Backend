import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import auth from './middlewares/auth.js';
import user from './routes/user.js';
const app = express();
const PORT = process.env.PORT || 4000;
dotenv.config();
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.get('/',(req, res)=>{
    res.status(200).json({
        message: `Hello to PORT: ${PORT} from Express server`
    })
});

app.use('/api/v1/', user);

app.use(auth);

app.get("/secure",async (req, res)=>{
    res.status(200).json({
        message: "Auth middleware works"
    });
})

app.listen(PORT, ()=>{
    console.log(`Server listening at PORT: ${PORT}`);
})
