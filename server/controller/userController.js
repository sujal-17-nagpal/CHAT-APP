import { genToken } from "../lib/utils";
import User from "../models/User";
import bcrypt from "bcrypt"

// sign up new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;
  try {
    if (!fullName || !email || !password || !body) {
      return res.status(400).json({ message: "all fields are required" });
    }
    const existingUser = User.findOne({email});
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
        const existingUser = User.findOne({email})
        if(!existingUser){
            return res.status(404).json({message:"no user exists with this email"})
        }
        const hashPass = existingUser.password
        const comp = bcrypt.compare(password,hashPass)
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
