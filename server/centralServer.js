import express from "express"
import "dotenv/config";
import bloomFilter from "./lib/bloomFilter.js";
import User from "./models/User.js";
import { connectDb } from "./lib/db.js";
import LRUcache from "./lib/cache.js";

const bloom  = new bloomFilter(100000)
const cache = new LRUcache(10000)

const app = express()

app.use(express.json())
const port = process.env.CENTRAL_PORT

const warmUp = async()=>{
    try{
        const users = await User.find({},"email").lean()
        for(const u of users){
            bloom.add(u.email)
        }
        console.log("bloom warmed up successfully")
    } catch{
        console.log("error occured while inserting users in bloom filter at start")
    }
}


app.get("/health",(req,res)=>{
    res.status(200).json({message : "central server is running"})
})

app.post('/addEmail',(req,res)=>{
    const {email} = req.body
    if(!email){
        return res.status(404).json({message : "Email id is required"})
    }
    bloom.add(email)
    return res.status(200).json({message : "email is added to bloom filter"})
})
    

app.post('/check',(req,res)=>{
    const {email} = req.body
    if(!email){
        return res.status(404).json({message : "Email id is required"})
    }
    const present = bloom.exists(email)
    return res.json({present})
})

app.get('/getCache/:key',(req,res)=>{
    try {
        const {key} = req.params;
    const val = cache.get(key);
    if(val == null){
        return res.status(404).json({message:"cache miss"})
    }
    return res.status(200).json({message:"cache fetched successfully",data:val});
    } catch (error) {
        return res.status(400).json({message:error.message})
    }
    
})

app.post('/addCache',(req,res)=>{
    try {
        const {key,value} = req.body
        if(!key || !value || key == null || value == null){
            return res.status(400).json({message:"key and value are required"})
        }
        cache.add(key,value);
        return res.status(200).json({message:"value added to cache successfully"})
    } catch (error) {
        return res.status(400).json({message:error.message})
    }
})

app.post('/delCachePattern',(req,res)=>{
    try {
        const {pattern} = req.body;
        if(!pattern){
            return res.status(400).json({message:"pattern is required"})
        }
        cache.delPattern(pattern)
        return res.status(200).json({message :"pattern matching values removed from cache successfully"})
    } catch (error) {
        return res.status(400).json({message:error.message})
    }
})

await connectDb()
await warmUp()
app.listen(port,()=>{
    console.log(`central port running on port ${port}`)
})



