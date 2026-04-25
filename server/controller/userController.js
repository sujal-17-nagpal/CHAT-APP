import { genToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import cloudinary from "../lib/cloudinary.js";
import { cacheGet, cacheSet, cacheDel, cacheDelPattern } from "../lib/cache.js";

// bloom filter for last looks of users
import bloomFilter from "../lib/bloomFilter.js";
import tokenBlackListModel from "../models/tokenBlacklist.js";
const bloom = new bloomFilter(20000);

// sign up new user
export const signup = async (req, res) => {
  const { fullName, email, password, bio } = req.body;
  
  try {
    if (!fullName || !email || !password || !bio) {
      return res.status(400).json({ message: "all fields are required" });
    }

    // check using bloom filter if the user exists
    const flag = bloom.exists(email);
    if (flag) {
      // user can exist or not exist (happens due to false positivity )
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res
          .status(400)
          .json({ message: "user with this email already exist" });
      }
    } 

    // if(password.length < 6){
    //   return res.status(400).json({message : "password length must be at least 6 charcters"})
    // }

    // this is the else case (case when bloom filter returned false)
    // user does not exist
    const hashPass = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      fullName,
      email,
      password: hashPass,
      bio,
    });
    const token = genToken(newUser._id);
    bloom.add(email)
    return res.json({
      success: true,
      userData: newUser,
      token,
      message: "account created successfully",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ message: error.message });
  }
};

//controller for user login

export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "all fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res
        .status(404)
        .json({ message: "no user exists with this email" });
    }

    const hashPass = existingUser.password;
    const comp = await bcrypt.compare(password, hashPass);
    if (!comp) {
      return res.status(400).json({ message: "incorrect password" });
    }

    const token = genToken(existingUser._id);
    return res.status(200).json({
      success: true,
      userData: existingUser,
      token,
      message: "login successful",
    });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ message: error.message });
  }
};

//controller to check if user is authenticated

export const checkAuth = (req, res) => {
  const cacheKey = `auth:${req.user._id}`;
  
  // Store in cache for 10 minutes
  cacheSet(cacheKey, req.user, 600);
  
  res.json({ success: true, user: req.user });
};

//controller to update user profile

export const updateProfile = async (req, res) => {
  try {
    const { profilePic, bio, fullName } = req.body;

    const userId = req.user._id;
    let updatedUser;
    if (!profilePic) {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { bio, fullName },
        { new: true },
      );
    } else {
      const upload = await cloudinary.uploader.upload(profilePic);

      updatedUser = await User.findByIdAndUpdate(
        userId,
        { profilePic: upload.secure_url, bio, fullName },
        { new: true },
      );
    }

    // After successful update, add:
    cacheDel(`auth:${req.user._id}`);
    cacheDelPattern(`users:sidebar:`);

    res.status(200).json({ success: true, user: updatedUser });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
};

//function to block a user
export const blockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const userTobeBlockedId = req.params.id;
    if (userId === userTobeBlockedId) {
      return res.status(400).json({ message: "you can not block yourself" });
    }
    const blockUser = await User.findById(userTobeBlockedId);

    if (!blockUser) {
      return res.status(404).json({ message: "no user exists with this id" });
    }

    const currUser = await User.findById(userId);
    if (currUser.blockedUsers.includes(userTobeBlockedId)) {
      return res.status(400).json({ message: "user is already blocked" });
    }

    await User.findByIdAndUpdate(userId, {
      $addToSet: { blockedUsers: userTobeBlockedId },
    });

    // invalidate caches for both users
    cacheDelPattern(`users:sidebar:${userId}`);
    cacheDelPattern(`users:sidebar:${userTobeBlockedId}`);
    cacheDel(`auth:${userId}`);

    res
      .status(200)
      .json({ success: true, message: "user blocked successfully" });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

//function to unblock a user
export const unblockUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const userToBeUnblockedId = req.params.id;

    const userToBeUnblocked = await User.findById(userToBeUnblockedId);

    if (userToBeUnblockedId === userId) {
      return res.status(400).json({ message: "you can not unblock user" });
    }

    if (!userToBeUnblocked) {
      return res.status(404).json({ message: "no user exists with this id" });
    }

    const currUser = await User.findById(userId);
    if (!currUser.blockedUsers.includes(userToBeUnblockedId)) {
      return res.status(404).json({ message: "user is already unblocked" });
    }
    await User.findByIdAndUpdate(userId, {
      $pull: { blockedUsers: userToBeUnblockedId },
    });

    // invalidate caches for both users
    cacheDelPattern(`users:sidebar:${userId}`);
    cacheDelPattern(`users:sidebar:${userToBeUnblockedId}`);
    cacheDel(`auth:${userId}`);

    res.status(200).json({ success: true, message: "user unblocked" });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
};

// get all blocked users data by a user
export const getBlockedUsers = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "user not found" });
    }

    const blockedUserInfo = await User.find(
      {
        _id: { $in: user.blockedUsers },
      },
      "fullName email profilePic",
    );
    res.status(200).json({ success: true, blockedUsers: blockedUserInfo });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};

//check if user is blocked

export const checkIfBlocked = async (req, res) => {
  try {
    const userId = req.user._id;
    const otherUserId = req.params.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    if (user.blockedUsers.includes(otherUserId)) {
      res.status(200).json({ isBlocked: true });
    } else {
      res.status(200).json({ isBlocked: false });
    }
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: error.message });
  }
};

export const logout = async (req, res) => {
  const token = req.headers.token;

  if (!token) {
    return res.status(400).json({ message: "you are already logged out" });
  }

  try {
    await tokenBlackListModel.create({ token });
    return res.status(200).json({ message: "logged out" });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};