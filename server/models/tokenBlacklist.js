import mongoose from "mongoose"

const tokenBlackListSchema = new mongoose.Schema({
    token:{
        type:String,
        required:[true,"token is required"]
    }
})

const tokenBlackListModel = mongoose.model("blackListedTokens",tokenBlackListSchema)

export default tokenBlackListModel