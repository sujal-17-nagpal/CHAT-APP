import express from 'express'
import { protectRoute } from '../middleware/auth'
import { getMessages, getUsersForSidebar, markMessageAsSeen } from '../controller/messageController'

const messageRouter = express.Router()

messageRouter.get('/user',protectRoute,getUsersForSidebar)
messageRouter.get('/:id',protectRoute,getMessages)
messageRouter.put('/mark/:id',protectRoute,markMessageAsSeen)

export default messageRouter