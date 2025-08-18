import { createContext, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

const backendUrl = import.meta.env.VITE_BACKEND_URL;
axios.defaults.baseURL = backendUrl;

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [authUser, setAuthUser] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [socket, setSocket] = useState(null);

  // check if user is authenticated and if so , set the user data and connect the socket
  const checkAuth = async () => {
    try {
      const { data } = await axios.get("/api/auth/check");
      //   console.log(data)
      if (data.success) {
        setAuthUser(data.user);
        connectSocket(data.user);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  //Login function to handle user authentication and socket connection

  const login = async (state, credentials) => {
    try {
      const { data } = await axios.post(`/api/auth/${state}`, credentials);

      if (data.success) {
        setAuthUser(data.userData);
        connectSocket(data.userData);
        axios.defaults.headers.common["token"] = data.token;
        setToken(data.token);
        localStorage.setItem("token", data.token);
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  //logout function and disconnect socket
  const logout = async () => {
    localStorage.removeItem("token");
    setToken(null);
    setAuthUser(null);
    setOnlineUsers([]);
    axios.defaults.headers.common["token"] = null;
    toast.success("logged out successfully");
    socket.disconnect();
  };

  //update profile function
  const updateProfile = async (body) => {
    try {
      const { data } = await axios.put("/api/auth/update-profile", body);
      if (data.success) {
        setAuthUser(data.user);
        toast.success("profile upadted successfully");
      }
    } catch (error) {
      toast.error(error.message);
    }
  };

  // connect socket function to handle socket connection and online users update
  const connectSocket = (userData) => {
    if (!userData || socket?.connected) return;

    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

    try {
      const newSocket = io(backendUrl, {
        query: {
          userId: userData._id,
        },
      });

      newSocket.on("connect", () => {
        console.log("Socket connected:", newSocket.id);
      });

      newSocket.on("connect_error", (error) => {
        console.log("Socket connection error:", error);
      });

      newSocket.on("getOnlineUsers", (userIds) => {
        setOnlineUsers(userIds);
      });

      setSocket(newSocket);
    } catch (error) {
      console.log("Socket connection failed:", error);
    }
  };

  const checkIfBlocked = async (userId) => {
    try {
      const { data } = await axios.get(`/api/auth/checkIfBlocked/${userId}`);
      return data.isBlocked;
    } catch (error) {
      console.log(error);
      toast.error("error checking blocked status", error.message);
      return false;
    }
  };

  const getAllBlockedUser = async () => {
    try {
      const { data } = await axios.get("/api/auth/blocked-users");
      if (data.success) {
        return data.blockedUsers;
      }
      return [];
    } catch (error) {
      console.log(error);
      toast.error("error fetching blocked user", error.message);
      return [];
    }
  };

  const blockUser = async (userId) => {
    try {
      const { data } = await axios.post(`/api/auth/blockUser/${userId}`);
      if (data.success) {
        toast.success(data.message || "User blocked successfully");
        return true;
      } else {
        toast.error(data.message || "Failed to block user");
        return false;
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Error blocking user");
      return false;
    }
  };

  const unblockUser = async (userId) => {
    try {
      const { data } = await axios.post(`/api/auth/unblockUser/${userId}`);
      if (data.success) {
        toast.success(data.message || "User unblocked successfully");
        return true;
      } else {
        toast.error(data.message || "Failed to unblock user");
        return false;
      }
    } catch (error) {
      console.log(error);
      toast.error(error.response?.data?.message || "Error unblocking user");
      return false;
    }
  };

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["token"] = token;
      checkAuth();
    }
  }, []);

  const value = {
    axios,
    authUser,
    onlineUsers,
    socket,
    login,
    logout,
    updateProfile,
    blockUser,
    unblockUser,
    getAllBlockedUser,
    checkIfBlocked
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
