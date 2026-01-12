import { createClient } from "redis";
import dotenv from 'dotenv';
dotenv.config();
const redisClient = await createClient({
    url: `${process.env.REDIS_CONNECTION_STRING}`
});

try{
   redisClient.connect();
}catch(e){
    console.log(`Error occurred while connecting to redis client: ${e}`);
    //since it's a fatal error for this backend
    // process.exit(1);
}
export default redisClient;



