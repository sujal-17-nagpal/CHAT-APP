import jwt from "jsonwebtoken"
import dotenv from 'dotenv'

// funtion to generate a token
export const genToken = (userId)=>{
    const token = jwt.sign({userId},process.env.JWT_SECRET)
    return token
}