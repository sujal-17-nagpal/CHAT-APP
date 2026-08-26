import mongoose from "mongoose"

const tokenBlackListSchema = new mongoose.Schema({
    token: {
        type: String,
        required: [true, "token is required"]
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: "7d" 
    }
})

const tokenBlackListModel = mongoose.model("blackListedTokens",tokenBlackListSchema)

export default tokenBlackListModel