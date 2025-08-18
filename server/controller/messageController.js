import Message from "../models/message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";

// get all users except logged in user
export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Simple query to get all users except yourself (no blocking filter)
    const filteredusers = await User.find({ 
      _id: { $ne: userId } 
    }).select("-password");

    // cnt no of messages not seen
    const unseenMessages = {};
    const promises = filteredusers.map(async (user) => {
      const messages = await Message.find({
        senderId: user._id,
        receiverId: userId,
        seen: false,
      });
      if (messages.length > 0) {
        unseenMessages[user._id] = messages.length;
      }
    });

    await Promise.all(promises);
    res.json({ success: true, users: filteredusers, unseenMessages });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};


// get all messages for selected user
export const getMessages = async (req, res) => {
  try {
    const { id: selectedUserId } = req.params;
    const myId = req.user._id;

    const currUser = await User.findById(myId);
    const otherUser = await User.findById(selectedUserId);

    if (!currUser || !otherUser) {
      return res.status(404).json({ message: "user not found" });
    }

    // if (
    //   currUser.blockedUsers.includes(selectedUserId) ||
    //   otherUser.blockedUsers.includes(myId)
    // ) {
    //   return res.status(400).json({ message: "user not found" });
    // }

    // Get all messages between the two users
    const messages = await Message.find({
      $or: [
        { senderId: myId, receiverId: selectedUserId },
        { senderId: selectedUserId, receiverId: myId },
      ],
    });

    // FIXED: Mark messages from the OTHER user to ME as seen
    // (not my messages to them)
    await Message.updateMany(
      {
        senderId: selectedUserId, // Messages FROM the other user
        receiverId: myId, // TO me
        seen: false, // Only update unseen messages
      },
      { $set: { seen: true } }
    );

    res.json({ success: true, messages });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

//api to mark message as seen using message id
export const markMessageAsSeen = async (req, res) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndUpdate(id, { seen: true });
    res.json({ success: true });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

// send message to selected user
export const sendMessage = async (req, res) => {
  try {
    // Debug incoming request - headers and body
    // console.log("--- sendMessage headers ---");
    // console.log(req.headers);
    // console.log("--- sendMessage body ---");
    // console.log(req.body);

    // guard against undefined body so destructuring doesn't throw
    const body = req.body || {};
    const { text, image } = body;
    console.log("received text:", text);
    const receiverId = req.params.id;
    const senderId = req.user._id;

    const currUser = await User.findById(senderId)
    const otherUser = await User.findById(receiverId);

    if(currUser.blockedUsers.includes(receiverId) || otherUser.blockedUsers.includes(senderId)){
      return res.status(404).json({message : "user not found"})
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
    });

    // emit new message to the receiver's socket
    const receiverSocketId = userSocketMap[receiverId];

    if (receiverSocketId) {
      console.log(newMessage);
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};
