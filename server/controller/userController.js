import { genToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcrypt"
import cloudinary from "../lib/cloudinary.js";

// sign up new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;

  try {
    if (!fullName || !email || !password || !bio) {
      return res.status(400).json({ message: "all fields are required" });
    }
    const existingUser = await User.findOne({email});
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "user with this email already exist" });
    }
    const hashPass = await bcrypt.hash(password,10)
    const newUser = await User.create({
        fullName,email,password:hashPass,bio
    })
    const token = genToken(newUser._id)

    return res.json({success : true,userData:newUser,token,message :"account created successfully"})
  } catch (error) {
    console.log(error.message)
    return res.status(400).json({message:error.message})
  }
};

//controller for user login

export const login = async(req,res)=>{
    const {email,password} = req.body
   
    try {
      
        if(!email || !password){
            return res.status(400).json({message:"all fields are required"})
        }
       
        const existingUser = await User.findOne({email})
        if(!existingUser){
            return res.status(404).json({message:"no user exists with this email"})
        }
        
        const hashPass = existingUser.password
        const comp = await bcrypt.compare(password,hashPass)
        if(!comp){
            return res.status(400).json({message:"incorrect password"})
        } 
        
        const token = genToken(existingUser._id)
        return res.status(200).json({success:true,userData:existingUser,token,message:"login successful"})
    } catch (error) {
        console.log(error.message)
        return res.status(400).json({message:error.message})
    }
}

//controller to check if user is authenticated

export const checkAuth = (req,res)=>{
  res.json({success:true,user : req.user})
}

//controller to update user profile

export const updateProfile = async(req,res)=>{
  try{
      const {profilePic,bio,fullName} = req.body
      
      const userId = req.user._id
      let updatedUser;
      if(!profilePic){
        updatedUser = await User.findByIdAndUpdate(userId,{bio,fullName},{new:true})
      } else {
     
        const upload = await cloudinary.uploader.upload(profilePic)

        updatedUser = await User.findByIdAndUpdate(userId,{profilePic:upload.secure_url,bio,fullName},{new :true})
      }
      res.status(200).json({success:true,user:updatedUser})
  } catch(error){
    console.log(error.message)
      res.status(400).json({message:error.message})
  }
}
