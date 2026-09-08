
import axios from "axios";
import tokenBlackListModel from "../models/tokenBlacklist.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken"

const baseUrl = 'http://localhost:7000'

// middleware to protect routes
export const protectRoute = async(req,res,next)=>{
    try{
        const token = req.headers.token;

        if(!token){
            return res.status(404).json({success: false, message : "token is missing"})
        }

        try {
            const blackListResponse = await axios.get(`${baseUrl}/getCache/${encodeURIComponent(`blacklist:${token}`)}`)
            if(blackListResponse.status === 200 && blackListResponse.data.data){
                return res.status(401).json({message:"Unauthorized token"})
            }
        } catch (error) {
            if(error.response?.status !== 404){
                console.log("some error occured in blackList token Caching check")
            }
            
        }

        try {
            const verifiedTokenResponse = await axios.get(`${baseUrl}/getCache/${encodeURIComponent(`verified:${token}`)}`)
            if(verifiedTokenResponse.status === 200 && verifiedTokenResponse.data.data){
                req.user = verifiedTokenResponse.data.data
                return next()
            }
        } catch (error) {
            if(error.response?.status !== 404){
                console.log("some error occured in verified token Caching check")
            }
              
        }

        const isTokenBlackListed = await tokenBlackListModel.findOne({token})

        if(isTokenBlackListed){
            try {
                const cacheKey = `blacklist:${token}`
            const insertBlackListInCache = await axios.post(`${baseUrl}/addCache`,{
                key:cacheKey,
                value:true
            })
            } catch (error) {
                console.log("error occured while inserting blacklist token in cache")
            }
            
            return res.status(401).json({success: false, message:"invalid token"})
        }

        const decoded = jwt.verify(token,process.env.JWT_SECRET) 

        const user = await User.findById(decoded.userId).select("-password")

        if(!user){
            return res.status(404).json({success:false,message:"user not found"})
        }
         try {
                const cacheKey = `verified:${token}`
            const insertVerifiedInCache = await axios.post(`${baseUrl}/addCache`,{
                key:cacheKey,
                value:user
            })
            } catch (error) {
                console.log("error occured while inserting verified token in cache")
            }
        req.user = user
        next()
    } catch(error){
        console.log(error.message)
        res.status(401).json({success:false,message:error.message})
    }
}