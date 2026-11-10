import { create } from "zustand";
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:1000/api";

const getPrivateChatHeaders = () => {
  const token = sessionStorage.getItem("privateChatToken");
  return token ? { "X-Private-Chat-Token": token } : {};
};

const searchGiphyMedia = async (mediaType, query) => {
  const apiKey = import.meta.env.VITE_GIPHY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GIF and sticker search needs a GIPHY API key. Set VITE_GIPHY_API_KEY in Frontend/.env and restart the frontend.");
  }

  const endpoint = query.trim()
    ? `https://api.giphy.com/v1/${mediaType}/search`
    : `https://api.giphy.com/v1/${mediaType}/trending`;
  const params = new URLSearchParams({
    api_key: apiKey,
    ...(query.trim() ? { q: query.trim() } : {}),
    limit: "18",
    rating: "pg",
    bundle: "messaging_non_clips",
  });
  const response = await fetch(`${endpoint}?${params}`, { cache: "no-store" });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.meta?.msg || "GIPHY search is unavailable right now.");
  }

  return result.data.map((item) => ({
    id: item.id,
    title: item.title || "GIPHY sticker",
    previewUrl: item.images?.fixed_width_small?.url || item.images?.fixed_width?.url || item.images?.original?.url,
  })).filter((item) => item.previewUrl);
};

const UseAuthStore = create((set) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  users: [],
  images: [],

  signup: async (userData) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${BASE_URL}/signup`, userData);
      const { user, tokens } = res.data;
      set({ loading: false, user, token: tokens.accessToken });
      sessionStorage.setItem("accessToken", tokens.accessToken);
      sessionStorage.setItem("refreshToken", tokens.refreshToken);
      return { success: true, message: res.data.message, id: user.id };
    } catch (error) {
      set({ error: error?.response?.data?.message || "SignUp failed", loading: false });
      return {
        success: false,
        message: error?.response?.data?.message || "Signup failed",
      };
    }
  },

  signin: async ({ Email, Password }) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${BASE_URL}/signin`, { Email, Password });
      const { user, tokens } = res.data;
      set({ loading: false, user, token: tokens.accessToken });
      sessionStorage.setItem("accessToken", tokens.accessToken);
      sessionStorage.setItem("refreshToken", tokens.refreshToken);
      return { success: true, message: res.data.message, id: res.data.user.id };
    } catch (error) {
      set({ error: error?.response?.data?.message || "SignIn failed", loading: false });
      return {
        success: false,
        message: error?.response?.data?.message || "SignIn failed",
      };
    }
  },

  signout: () => {
    set({ loading: true, error: null });
    try {
      set({ user: null, token: null });
      sessionStorage.removeItem("accessToken");
      sessionStorage.removeItem("refreshToken");
      sessionStorage.removeItem("privateChatUnlocked");
      sessionStorage.removeItem("privateChatToken");
      return { success: true };
    } catch (error) {
      set({ error: error?.response?.data?.message || "logout failed", loading: false });
      return {
        success: false,
        message: error?.response?.data?.message || "logout failed",
      };
    }
  },

  handleGoogleCallback: async (serverResponse) => {
    set({ loading: true, error: null });
    try {
      const { user, tokens } = serverResponse;
      set({ user, token: tokens.accessToken, loading: false });
      sessionStorage.setItem("accessToken", tokens.accessToken);
      sessionStorage.setItem("refreshToken", tokens.refreshToken);
      return { success: true };
    } catch (error) {
      set({ error: error?.response?.data?.message || "Google sign-in failed", loading: false });
      return {
        success: false,
        message: error?.response?.data?.message || "Google sign-in failed",
      };
    }
  },

  fetchUser: async () => {
    set({ loading: true, error: null });
    try {
      const token = sessionStorage.getItem("accessToken");
      if (!token) {
        set({ user: null, loading: false });
        return null;
      }
      const res = await axios.get(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      set({ user: res.data, loading: false });
      return res.data;
    } catch (error) {
      set({ user: null, error: "Failed to fetch user", loading: false });
      return null;
    }
  },

  fetchallUsers: async () => {
    set({ loading: true, error: null });
    try {
      const token = sessionStorage.getItem("accessToken");
      if (!token) {
        set({ users: [], loading: false });
        return [];
      }
      const res = await axios.get(`${BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      set({ users: res.data, loading: false });
      return res.data;
    } catch (error) {
      set({ users: [], error: "Failed to fetch users", loading: false });
      return [];
    }
  },

  UploadImage: async (file, ReceiverID) => {
    const token = sessionStorage.getItem("accessToken");
    if (!token) {
      console.info("You are not authorized user please login");
      return null;
    }

    const formdata = new FormData();
    formdata.append("image", file);
    formdata.append("ReceiverID", ReceiverID);
    const res = await axios.post(`${BASE_URL}/upload`, formdata, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true,
    });
    return res.data;
  },

  GetALLImage: async (ReceiverID) => {
    set({ loading: true, error: null });
    try {
      const token = sessionStorage.getItem("accessToken");
      if (!token) {
        set({ images: [], loading: false });
        return [];
      }
      const res = await axios.get(`${BASE_URL}/images?ReceiverID=${ReceiverID}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      set({ images: res?.data.images || [], loading: false });
      return res?.data.images || [];
    } catch (error) {
      set({ images: [], error: "Failed to fetch images", loading: false });
      return [];
    }
  },

  ReceiveALLImage: async (SenderID, ReceiverID) => {
    if (!SenderID) {
      console.info("Sender id is missing");
      return [];
    }
    set({ loading: true, error: null });
    try {
      const token = sessionStorage.getItem("accessToken");
      if (!token) {
        set({ images: [], loading: false });
        return [];
      }
      const res = await axios.get(
        `${BASE_URL}/images/receive?SenderID=${SenderID}&ReceiverID=${ReceiverID}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      set({ images: res?.data.images || [], loading: false });
      return res?.data.images || [];
    } catch (error) {
      set({ images: [], error: "Failed to fetch images", loading: false });
      return [];
    }
  },

  fetchChatMessages: async (contactId, before) => {
    const token = sessionStorage.getItem("accessToken");
    const res = await axios.get(`${BASE_URL}/chat/messages/${encodeURIComponent(contactId)}`, {
      params: before ? { before } : undefined,
      headers: {
        ...getPrivateChatHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    });
    return res.data;
  },

  fetchChatConversations: async () => {
    const token = sessionStorage.getItem("accessToken");
    const res = await axios.get(`${BASE_URL}/chat/messages/conversations`, {
      headers: {
        ...getPrivateChatHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    });
    return res.data.conversations;
  },

  sendChatMessage: async (message) => {
    const token = sessionStorage.getItem("accessToken");
    const res = await axios.post(`${BASE_URL}/chat/messages`, message, {
      headers: {
        ...getPrivateChatHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    });
    return res.data.message;
  },

  uploadChatAttachment: async (file, recipientId, duration) => {
    const token = sessionStorage.getItem("accessToken");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("recipientId", recipientId);
    if (Number.isFinite(duration)) formData.append("duration", String(duration));
    const res = await axios.post(`${BASE_URL}/chat/messages/upload`, formData, {
      headers: {
        ...getPrivateChatHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    });
    return res.data.message;
  },

  fetchChatPresence: async (userIds) => {
    if (!userIds.length) return [];
    const token = sessionStorage.getItem("accessToken");
    const res = await axios.get(`${BASE_URL}/chat/presence`, {
      params: { userIds: userIds.join(",") },
      headers: {
        ...getPrivateChatHeaders(),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      withCredentials: true,
    });
    return res.data.presence;
  },

  updateChatPresence: async (typingTo = null, offline = false) => {
    const token = sessionStorage.getItem("accessToken");
    const res = await axios.post(
      `${BASE_URL}/chat/presence/${offline ? "offline" : "heartbeat"}`,
      { typingTo },
      {
        headers: {
          ...getPrivateChatHeaders(),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        withCredentials: true,
      }
    );
    return res.status;
  },

  searchChatGifs: (query) => searchGiphyMedia("gifs", query),
  searchChatStickers: (query) => searchGiphyMedia("stickers", query),

  verifyReferralCode: async (code) => {
    try {
      const res = await axios.post(
        `${BASE_URL}/verify-referral-code`,
        { code },
        { withCredentials: true }
      );
      if (res.data?.success && res.data.privateChatToken) {
        sessionStorage.setItem("privateChatToken", res.data.privateChatToken);
        sessionStorage.setItem("privateChatUnlocked", "true");
      }
      return res.data;
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Could not verify the code. Check your connection and try again.",
      };
    }
  },

  checkPrivateChatAccess: async () => {
    try {
      const res = await axios.get(`${BASE_URL}/private-chat-status`, {
        headers: getPrivateChatHeaders(),
        withCredentials: true,
      });
      const unlocked = Boolean(res.data?.unlocked);
      if (unlocked) {
        sessionStorage.setItem("privateChatUnlocked", "true");
      } else {
        sessionStorage.removeItem("privateChatUnlocked");
        sessionStorage.removeItem("privateChatToken");
      }
      return { unlocked };
    } catch (error) {
      sessionStorage.removeItem("privateChatUnlocked");
      sessionStorage.removeItem("privateChatToken");
      return { unlocked: false };
    }
  },
}));

export default UseAuthStore;
