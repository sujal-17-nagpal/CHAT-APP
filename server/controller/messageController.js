import Message from "../models/message.js";
import User from "../models/User.js";
import cloudinary from "../lib/cloudinary.js";
import { io, userSocketMap } from "../server.js";
import Trie from "../lib/Trie.js";
import { abusiveWords } from "../lib/abusiveWords.js";
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from "../lib/cache.js";


// Initialize Trie with abusive words
const trie = new Trie();
abusiveWords.forEach((word) => trie.insert(word));

// get all users except logged in user
export const getUsersForSidebar = async (req, res) => {
  try {
    const userId = req.user._id;
    const cacheKey = `users:sidebar:${userId}`;

    // checking if data is in cache
    const cachedData = cacheGet(cacheKey);
    if(cachedData){
      return res.json(cachedData);
    }

    
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
    const response = { success: true, users: filteredusers, unseenMessages };

    // store data in cache
    cacheSet(cacheKey,response,300)
    res.json(response);
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
    const cacheKey = `messages:${myId}:${selectedUserId}`;
    
    // check the cache first
    const cachedMessages = cacheGet(cacheKey);
    if (cachedMessages) {
      return res.json(cachedMessages);
    }

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

    // store in cache
    const response = { success: true, messages }
    cacheSet(cacheKey,response,900);

    res.json(response);
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
    // Invalidate related caches: message threads and sidebars
    const msg = await Message.findById(id);
    if (msg) {
      const a = `${msg.senderId}:${msg.receiverId}`;
      const b = `${msg.receiverId}:${msg.senderId}`;
      cacheDel(`messages:${a}`);
      cacheDel(`messages:${b}`);
      cacheDelPattern(`users:sidebar:${msg.receiverId}`);
      cacheDelPattern(`users:sidebar:${msg.senderId}`);
    }
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

    // invalidate caches for both participants
    cacheDel(`messages:${senderId}:${receiverId}`);
    cacheDel(`messages:${receiverId}:${senderId}`);
    cacheDelPattern(`users:sidebar:${receiverId}`);
    cacheDelPattern(`users:sidebar:${senderId}`);

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

