import express from 'express';
import "dotenv/config";
import cors from 'cors';
import http from 'http';
import { connectDb } from './lib/db.js';

const app = express()
const server = http.createServer(app)

app.use(express.json({limit:"4mb"}))
app.use(cors());

app.use('/api/status',(req,res)=>{
    res.send("Server is live")
})

await connectDb()

const PORT = process.env.PORT || 5000

app.listen(PORT,()=>{
    console.log(`server in running on port: ${PORT}`)
})