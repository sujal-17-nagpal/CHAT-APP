import express from 'express'
import { blockUser, checkAuth, checkIfBlocked, getBlockedUsers,logout, login, signup, unblockUser, updateProfile } from '../controller/userController.js'
import { protectRoute } from '../middleware/auth.js'

const userRouter = express.Router()

userRouter.post('/signup',signup)
userRouter.post('/login',login)
userRouter.put('/update-profile',protectRoute,updateProfile)
userRouter.get('/check',protectRoute,checkAuth)

userRouter.post('/blockUser/:id',protectRoute,blockUser)
userRouter.post('/unblockUser/:id',protectRoute,unblockUser)
userRouter.get('/blocked-users',protectRoute,getBlockedUsers)
userRouter.get('/checkIfBlocked/:id',protectRoute,checkIfBlocked)

userRouter.get('/log-out',logout)

export default userRouter