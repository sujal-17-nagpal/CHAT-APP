import Message from "../models/message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";
import Trie from "../lib/Trie.js";
import { abusiveWords } from "../lib/abusiveWords.js";

// Initialize Trie with abusive words
const trie = new Trie();
abusiveWords.forEach((word) => trie.insert(word));

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
        canBeSeen: true,
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

    // Get messages with visibility logic
    const messages = await Message.find({
      $or: [
        { 
          senderId: myId, 
          receiverId: selectedUserId 
          // Sender can see all their messages (including blocked ones)
        },
        { 
          senderId: selectedUserId, 
          receiverId: myId,
          canBeSeen: true  // Receiver only sees messages where canBeSeen is true
        },
      ],
    });

    // Mark messages as seen (only if canBeSeen is true)
    await Message.updateMany(
      {
        senderId: selectedUserId,
        receiverId: myId,
        seen: false,
        canBeSeen: true,
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
    const body = req.body || {};
    let { text, image } = body;
    const receiverId = req.params.id;
    const senderId = req.user._id;

    const currUser = await User.findById(senderId);
    const otherUser = await User.findById(receiverId);

    if (!currUser || !otherUser) {
      return res.status(404).json({ success: false, message: "user not found" });
    }

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    // Mask abusive words in text before saving
    if (text) {
      text = trie.maskAbuses(text);
    }

    // Check if receiver has blocked sender
    const isBlocked = otherUser.blockedUsers.includes(senderId);

    const newMessage = await Message.create({
      senderId,
      receiverId,
      text,
      image: imageUrl,
      canBeSeen: !isBlocked,  // Set to false if receiver blocked sender
    });

    // Only emit to receiver if not blocked
    if (!isBlocked) {
      const receiverSocketId = userSocketMap[receiverId];
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newMessage", newMessage);
      }
    }

    res.json({ success: true, newMessage });
  } catch (error) {
    console.log(error);
    res.json({ success: false, message: error.message });
  }
};

