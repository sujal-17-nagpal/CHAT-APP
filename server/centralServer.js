import express from "express"
import "dotenv/config";
import bloomFilter from "./lib/bloomFilter.js";
import User from "./models/User.js";
import { connectDb } from "./lib/db.js";
const bloom  = new bloomFilter(100000)

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

const app = express()

app.use(express.json())
const port = process.env.CENTRAL_PORT


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
await connectDb()
await warmUp()
app.listen(port,()=>{
    console.log(`central port running on port ${port}`)
})



