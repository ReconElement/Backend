import express from 'express';
const app = express();
const PORT = 3000; //will be put into dotenv when db is initialized

app.get("/",async (req, res)=>{
    res.status(200).json({
        message: "Hello World from express server"
    })
});

app.listen(PORT, ()=>{
    console.log(`Listening to server on PORT ${PORT}`);
});

