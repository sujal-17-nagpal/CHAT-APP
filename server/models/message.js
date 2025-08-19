import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId:{
        type:mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    receiverId:{
        type:mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    text :{
        type : String
    },
    seen:{
        type:Boolean,
        default:false
    },
    image:{
        type:String
    },
    canBeSeen: {
      type: Boolean,
      default: true,  
    },
},{timestamps:true})

const Message = mongoose.model("Message",messageSchema)

export default Message;