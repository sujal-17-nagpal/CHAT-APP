
import tokenBlackListModel from "../models/tokenBlacklist.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken"

// middleware to protect routes
export const protectRoute = async(req,res,next)=>{
    try{
        const token = req.headers.token;

        if(!token){
            return res.status(404).json({success: false, message : "token is missing"})
        }

        const isTokenBlackListed = await tokenBlackListModel.findOne({token})

        if(isTokenBlackListed){
            return res.status(401).json({success: false, message:"invalid token"})
        }

        const decoded = jwt.verify(token,process.env.JWT_SECRET) 

        const user = await User.findById(decoded.userId).select("-password")

        if(!user){
            return res.status(404).json({success:false,message:"user not found"})
        }
        req.user = user
        next()
    } catch(error){
        console.log(error.message)
        res.status(401).json({success:false,message:error.message})
    }
}