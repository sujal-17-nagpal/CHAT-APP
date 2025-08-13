import Message from "../models/message.js"
import User from "../models/User.js"

// get all users except logged in user
export const getUsersForSidebar = async(req,res)=>{
    try{
        const userId = req.user._id
        const filteredusers = await User.find({_id:{$ne:userId}}).select("-password")

        // cnt no of messages not seen
        const unseenMessages = {}
        const promises = filteredusers.map(async (user)=>{
            const messages = await Message.find({senderId:user._id,receiverId:userId,seen:false})
            if(messages.length>0){
                unseenMessages[user._id] = messages.length
            }
        })

        await Promise.all(promises)
        res.json({success:true,users:filteredusers,unseenMessages})
    } catch (error){
        console.log(error.message)
        res.json({success:false,message:error.message})
    }
}