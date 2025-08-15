import { children, createContext, useContext, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import toast from "react-hot-toast";

export const Chatcontext = createContext()

export const ChatProvider = ({children})=>{

    const [messages,setMessages] = useState([])
    const [users,setUsers] = useState([])
    const [selectedUser,setSelectedUser] = useState(null)
    // store unseen messages count per userId
    const [unseenMessages,setUnseenMessages] = useState({})

    const{axios,socket} = useContext(AuthContext)

    // function to get all users for sidebar
    const getUsers = async()=>{
        try {
            const {data} = await axios.get('/api/messages/user')
            if(data.success){
                setUsers(data.users)
                setUnseenMessages(data.unseenMessages)
            }
        } catch (error) {
            console.log(error.messages)
            toast.error(error.message)
        }
    }

    // function to get messages for selectedUser
    const getMessages = async(userId)=>{
        try {
            const {data} = await axios.get(`/api/messages/${userId}`)
            if(data.success){
                setMessages(data.messages)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    //send message to selected user
    const sendMessage = async(messageData)=>{
        try {
            console.log(messageData)
            const {data} = await axios.post(`/api/messages/send/${selectedUser._id}`,messageData)
            console.log(data.success)
            console.log(data)

            if(data.success){
                setMessages((prevMessages)=>[...prevMessages,data.newMessage])
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    //function to subscribe to messages for seleted user
    const subscribeToMessages = async()=>{
        if(!socket){
            return;
        }
        socket.on("newMessage",(newMessage)=>{
            // normalize IDs to strings before comparing (ObjectId vs string)
            const senderIdStr = String(newMessage.senderId)
            const selectedIdStr = selectedUser ? String(selectedUser._id) : null

            if(selectedUser && senderIdStr === selectedIdStr){
                // incoming message is from the currently selected user - mark it seen locally
                newMessage.seen = true;
                setMessages((prevMessages)=>[...prevMessages,newMessage])
                axios.put(`/api/messages/mark/${newMessage._id}`)
            } else {
                setUnseenMessages((prevUnseenMessages)=>(
                    {
                        ...prevUnseenMessages,
                        [senderIdStr]: prevUnseenMessages[senderIdStr] ? prevUnseenMessages[senderIdStr] + 1 : 1
                    }
                ))
            }
        })
    }

    const unsubscibeFromMessages = ()=>{
        if(socket) socket.off("newMessage")
    }

    useEffect(()=>{
        subscribeToMessages()
        return ()=>unsubscibeFromMessages()
    },[selectedUser,socket])

    const value = {
        messages,users,selectedUser,getUsers,setMessages,sendMessage,setSelectedUser,unseenMessages,setUnseenMessages,getMessages
    }

    return (
    <Chatcontext.Provider value={value}>
        {children}
    </Chatcontext.Provider>
    )
}