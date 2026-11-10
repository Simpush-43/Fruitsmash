import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowPathIcon,
  DocumentIcon,
  EllipsisVerticalIcon,
  FaceSmileIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  PaperAirplaneIcon,
  PaperClipIcon,
  PauseIcon,
  PlayIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { useNavigate } from "react-router-dom";
import UseAuthStore from "../AuthStore/UseAuthStore";
import ProfileImage from "../assets/reshot-icon-profile-image-SBDVTH9PEA (1).png";
import "../Chat.css";

const EMOJIS = {
  Recent: ["😀", "😂", "🥰", "😍", "😊", "😉", "😭", "😎", "🤔", "🙏", "👍", "❤️", "✨", "🎉", "🔥", "💯"],
  Smileys: ["😀", "😃", "😄", "😁", "😆", "😅", "😂", "🥹", "😊", "😇", "🙂", "🙃", "😉", "😍", "🥰", "😘", "😋", "😎", "🤓", "🤔", "🫡", "🤗", "😭", "😤", "🥳", "🤯", "😴", "🤝"],
  Nature: ["🐶", "🐱", "🐼", "🦊", "🐸", "🐵", "🦋", "🐝", "🌸", "🌻", "🌈", "☀️", "🌙", "⭐", "🍀", "🌿"],
  Food: ["🍓", "🍒", "🍉", "🍋", "🍑", "🥑", "🍕", "🍔", "🍟", "🍩", "🍪", "🍰", "☕", "🧋", "🍿", "🥐"],
  Symbols: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💔", "💖", "💯", "✅", "✨", "🎉", "🔥", "💫"],
};

const STICKER_CATEGORIES = ["Reactions", "Love", "Cute", "Celebration"];

const getId = (value) => String(value?._id || value?.id || value || "");
const getMessagePeer = (message, currentUserId) =>
  getId(message.SenderID) === currentUserId ? getId(message.ReceiverID) : getId(message.SenderID);

const formatTime = (date) =>
  new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date(date));

const formatDuration = (seconds) => {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, "0")}:${String(safeSeconds % 60).padStart(2, "0")}`;
};

const AUDIO_RECORDING_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
];

const getAudioExtension = (mimeType) => {
  const type = mimeType.split(";")[0].toLowerCase();
  if (type === "audio/mp4" || type === "audio/aac") return "m4a";
  if (type === "audio/ogg") return "ogg";
  if (type === "audio/wav" || type === "audio/wave") return "wav";
  return "webm";
};

const formatDateLabel = (date) => {
  const value = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (value.toDateString() === today.toDateString()) return "TODAY";
  if (value.toDateString() === yesterday.toDateString()) return "YESTERDAY";
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", year: "numeric" })
    .format(value)
    .toUpperCase();
};

function GiphyMessage({ gifId, title, isSticker = false }) {
  const [src, setSrc] = useState("");
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let active = true;
    const apiKey = import.meta.env.VITE_GIPHY_API_KEY?.trim();
    if (!apiKey) {
      setUnavailable(true);
      return undefined;
    }

    const params = new URLSearchParams({ api_key: apiKey, rating: "pg" });
    fetch(`https://api.giphy.com/v1/gifs/${encodeURIComponent(gifId)}?${params}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`GIPHY returned ${response.status}`);
        const result = await response.json();
        const url = result.data?.images?.fixed_height?.url || result.data?.images?.original?.url;
        if (!url) throw new Error("GIPHY did not return a GIF image.");
        return url;
      })
      .then((url) => {
        if (active) {
          setSrc(url);
          setUnavailable(false);
        }
      })
      .catch((error) => {
        console.error("Could not load shared GIPHY GIF:", error);
        if (active) setUnavailable(true);
      });

    return () => { active = false; };
  }, [gifId]);

  if (!gifId) return null;
  const imageClass = isSticker ? "chat-sticker-image" : "chat-gif";
  if (src) return <img className={imageClass} src={src} alt={title || (isSticker ? "Sticker" : "GIF")} loading="lazy" />;
  if (unavailable) return <div className="chat-gif-placeholder" role="status">Media unavailable</div>;
  return <div className="chat-gif-placeholder" role="status">Loading…</div>;
}

const formatLastSeen = (value) => {
  if (!value) return "offline";
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return `last seen today at ${formatTime(date)}`;
  if (date.toDateString() === yesterday.toDateString()) return `last seen yesterday at ${formatTime(date)}`;
  return `last seen ${new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(date)} at ${formatTime(date)}`;
};

const messagePreview = (message) => {
  if (!message) return "Start a private conversation";
  if (message.type === "text") return message.text;
  if (message.type === "image") return "Photo";
  if (message.type === "video") return "Video";
  if (message.type === "voice") return "Voice message";
  if (message.type === "gif") return "GIF";
  if (message.type === "sticker") return "Sticker";
  return "Attachment";
};

function AudioMessage({ src, duration }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [length, setLength] = useState(duration || 0);
  const [playbackError, setPlaybackError] = useState(false);

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try {
        setPlaybackError(false);
        await audio.play();
        setPlaying(true);
      } catch (error) {
        console.error("Could not play voice message:", error);
        setPlaying(false);
        setPlaybackError(true);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return (
    <div className="audio-message">
      <button className="audio-play-button" onClick={togglePlayback} aria-label={playing ? "Pause voice message" : "Play voice message"}>
        {playing ? <PauseIcon /> : <PlayIcon />}
      </button>
      <div className="audio-track-wrap">
        <input
          aria-label="Voice message progress"
          className="audio-track"
          type="range"
          min="0"
          max={Math.max(length, 1)}
          value={Math.min(progress, length || 0)}
          onChange={(event) => {
            if (audioRef.current) audioRef.current.currentTime = Number(event.target.value);
          }}
        />
        <span>{formatDuration(progress >= length && length ? 0 : (length || duration || 0) - progress)}</span>
      </div>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          setLength(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : duration || 0);
          setPlaybackError(false);
        }}
        onEnded={() => { setPlaying(false); setProgress(0); }}
        onPause={() => setPlaying(false)}
        onError={() => { setPlaying(false); setPlaybackError(true); }}
      />
      {playbackError && <audio className="audio-fallback" src={src} controls preload="metadata" aria-label="Voice message audio player" />}
    </div>
  );
}

function MessageContent({ message, onImageClick }) {
  if (message.type === "image") {
    return (
      <button className="chat-image-button" onClick={() => onImageClick(message.mediaUrl)} aria-label="Open shared image">
        <img src={message.mediaUrl} alt={message.mediaName || "Shared image"} loading="lazy" />
      </button>
    );
  }
  if (message.type === "video") {
    return <video className="chat-video" src={message.mediaUrl} controls playsInline preload="metadata" />;
  }
  if (message.type === "voice") {
    return <AudioMessage src={message.mediaUrl} duration={message.duration} />;
  }
  if (message.type === "file") {
    return (
      <a className="chat-file-card" href={message.mediaUrl} target="_blank" rel="noreferrer">
        <DocumentIcon />
        <span>{message.mediaName || "Download attachment"}</span>
      </a>
    );
  }
  if (message.type === "gif") {
    return message.gifId
      ? <GiphyMessage gifId={message.gifId} title={message.text} />
      : <img className="chat-gif" src={message.mediaUrl} alt={message.text || "GIF"} loading="lazy" />;
  }
  if (message.type === "sticker") {
    return message.stickerId
      ? <GiphyMessage gifId={message.stickerId} title={message.text || "Sticker"} isSticker />
      : <span className="chat-sticker" role="img" aria-label="Sticker">{message.sticker}</span>;
  }
  return <p className="chat-message-text">{message.text}</p>;
}

function MessageStatus({ message }) {
  if (message.status === "failed") {
    return <span className="message-failed">Failed</span>;
  }
  if (message.status === "sending") return <span className="message-state">Sending</span>;
  if (message.readAt || message.status === "read") return <span className="message-state is-read" aria-label="Read">✓✓</span>;
  if (message.deliveredAt || message.status === "delivered") return <span className="message-state" aria-label="Delivered">✓✓</span>;
  return <span className="message-state" aria-label="Sent">✓</span>;
}

const ChatPage = () => {
  const navigate = useNavigate();
  const {
    user,
    users,
    fetchUser,
    fetchallUsers,
    checkPrivateChatAccess,
    fetchChatMessages,
    fetchChatConversations,
    sendChatMessage,
    uploadChatAttachment,
    fetchChatPresence,
    updateChatPresence,
    searchChatGifs,
    searchChatStickers,
    ReceiveALLImage,
  } = UseAuthStore();

  const [activeContact, setActiveContact] = useState(null);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [legacyImages, setLegacyImages] = useState([]);
  const [summaries, setSummaries] = useState({});
  const [presence, setPresence] = useState({});
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [newMessages, setNewMessages] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [activePanel, setActivePanel] = useState("");
  const [emojiCategory, setEmojiCategory] = useState("Recent");
  const [stickerCategory, setStickerCategory] = useState("Reactions");
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [stickerQuery, setStickerQuery] = useState("");
  const [stickers, setStickers] = useState([]);
  const [gifError, setGifError] = useState("");
  const [loadingGifs, setLoadingGifs] = useState(false);
  const [loadingStickers, setLoadingStickers] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVoice, setRecordedVoice] = useState(null);
  const [imageViewer, setImageViewer] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSharedMedia, setShowSharedMedia] = useState(false);

  const currentUserId = getId(user);
  const contactId = getId(activeContact);
  const messagesRef = useRef(null);
  const draftRef = useRef(null);
  const fileInputRef = useRef(null);
  const recorderRef = useRef(null);
  const recordingStreamRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const recordedVoiceUrlRef = useRef("");
  const shouldStickToBottomRef = useRef(true);
  const typingTimeoutRef = useRef(null);
  const sendInFlightRef = useRef(false);
  const pollingRef = useRef(false);
  const activeContactRef = useRef("");
  const discardNextRecordingRef = useRef(false);
  activeContactRef.current = contactId;

  const [accessChecked, setAccessChecked] = useState(false);
  const sortedContacts = useMemo(() => {
    const filtered = (users || []).filter((contact) => getId(contact) !== currentUserId);
    return filtered
      .filter((contact) => `${contact.Firstname || ""} ${contact.Lastname || ""}`.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        const summaryA = summaries[getId(a)]?.lastMessage?.createdAt || 0;
        const summaryB = summaries[getId(b)]?.lastMessage?.createdAt || 0;
        return new Date(summaryB).getTime() - new Date(summaryA).getTime();
      });
  }, [users, currentUserId, search, summaries]);

  const mergedMessages = useMemo(() => {
    const apiImageUrls = new Set(messages.map((message) => message.mediaUrl).filter(Boolean));
    const legacy = legacyImages
      .filter((image) => !apiImageUrls.has(image.imageUrl))
      .map((image) => ({
        _id: `legacy-${image._id}`,
        SenderID: getId(image.SenderID),
        ReceiverID: getId(image.ReceiverID),
        type: "image",
        mediaUrl: image.imageUrl,
        mediaName: "Shared image",
        createdAt: image.CreatedAt,
        status: "sent",
      }));
    return [...messages, ...legacy].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  }, [messages, legacyImages]);

  const loadMessages = useCallback(async (targetContactId, { initial = false, before } = {}) => {
    if (!targetContactId || pollingRef.current) return;
    pollingRef.current = true;
    if (initial) setLoadingMessages(true);
    try {
      const [data, incomingLegacy, outgoingLegacy] = await Promise.all([
        fetchChatMessages(targetContactId, before),
        ReceiveALLImage(targetContactId, currentUserId),
        ReceiveALLImage(currentUserId, targetContactId),
      ]);
      if (activeContactRef.current !== targetContactId) return;
      const allLegacy = [...(incomingLegacy || []), ...(outgoingLegacy || [])];
      setLegacyImages(allLegacy);
      setHasOlderMessages(Boolean(data.hasMore));
      setMessages((previous) => {
        if (before) {
          const known = new Set(previous.map((message) => String(message._id)));
          return [...data.messages.filter((message) => !known.has(String(message._id))), ...previous];
        }
        const fresh = data.messages;
        const oldIds = new Set(previous.map((message) => String(message._id)));
        const newInboundCount = fresh.filter((message) =>
          getId(message.SenderID) !== currentUserId && !oldIds.has(String(message._id))
        ).length;
        if (newInboundCount && !shouldStickToBottomRef.current) {
          setNewMessages((count) => count + newInboundCount);
        }
        const earliestFresh = fresh[0]?.createdAt ? new Date(fresh[0].createdAt).getTime() : Infinity;
        const older = previous.filter((message) =>
          message.status !== "sending" &&
          message.status !== "failed" &&
          new Date(message.createdAt).getTime() < earliestFresh
        );
        const pending = previous.filter((message) => message.status === "sending" || message.status === "failed");
        return [...older, ...fresh, ...pending].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      });
      setSummaries((previous) => ({
        ...previous,
        [targetContactId]: {
          ...previous[targetContactId],
          lastMessage: data.messages[data.messages.length - 1] || previous[targetContactId]?.lastMessage,
        },
      }));
    } catch (error) {
      console.error("Could not load conversation:", error);
    } finally {
      pollingRef.current = false;
      if (initial) setLoadingMessages(false);
    }
  }, [ReceiveALLImage, currentUserId, fetchChatMessages]);

  useEffect(() => {
    let active = true;
    const enterChat = async () => {
      const { unlocked } = await checkPrivateChatAccess();
      if (!active) return;
      if (!unlocked) {
        navigate("/home");
        return;
      }
      await Promise.all([fetchUser(), fetchallUsers()]);
      setLoadingContacts(false);
      setAccessChecked(true);
    };
    enterChat().catch((error) => {
      console.error("Could not initialize private chat:", error);
      setLoadingContacts(false);
    });
    return () => { active = false; };
  }, [checkPrivateChatAccess, fetchUser, fetchallUsers, navigate]);

  useEffect(() => {
    if (!accessChecked) return undefined;
    const heartbeat = () => updateChatPresence().catch((error) => console.error("Presence heartbeat failed:", error));
    heartbeat();
    const timer = window.setInterval(heartbeat, 15_000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") heartbeat();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      updateChatPresence(null, true).catch((error) => console.error("Could not mark offline:", error));
    };
  }, [accessChecked, updateChatPresence]);

  useEffect(() => {
    if (!accessChecked) return undefined;
    const refresh = () => fetchChatConversations()
      .then((items) => {
        const next = {};
        items.forEach((item) => { next[getId(item.contactId)] = item; });
        setSummaries((previous) => ({ ...previous, ...next }));
      })
      .catch((error) => console.error("Could not refresh chat list:", error));
    refresh();
    const timer = window.setInterval(refresh, 8_000);
    return () => window.clearInterval(timer);
  }, [accessChecked, fetchChatConversations]);

  useEffect(() => {
    if (!accessChecked || !users?.length) return undefined;
    let active = true;
    const refresh = () => fetchChatPresence(users.map(getId).filter((id) => id && id !== currentUserId))
      .then((items) => {
        if (!active) return;
        const next = {};
        items.forEach((item) => { next[item.userId] = item; });
        setPresence(next);
      })
      .catch((error) => console.error("Could not refresh presence:", error));
    refresh();
    const timer = window.setInterval(refresh, 10_000);
    return () => { active = false; window.clearInterval(timer); };
  }, [accessChecked, users, currentUserId, fetchChatPresence]);

  useEffect(() => {
    if (!contactId) {
      setMessages([]);
      setLegacyImages([]);
      return undefined;
    }
    setMessages([]);
    setLegacyImages([]);
    setNewMessages(0);
    shouldStickToBottomRef.current = true;
    loadMessages(contactId, { initial: true });
    const timer = window.setInterval(() => loadMessages(contactId), 4_000);
    return () => window.clearInterval(timer);
  }, [contactId, loadMessages]);

  useEffect(() => {
    const container = messagesRef.current;
    if (!container) return;
    if (shouldStickToBottomRef.current) {
      container.scrollTop = container.scrollHeight;
      setNewMessages(0);
    }
  }, [mergedMessages.length, activeContact]);

  useEffect(() => {
    if (activePanel !== "gifs" || !contactId) return undefined;
    const timer = window.setTimeout(() => {
      setLoadingGifs(true);
      setGifError("");
      searchChatGifs(gifQuery)
        .then(setGifs)
        .catch((error) => {
          setGifs([]);
          setGifError(error.response?.data?.meta?.msg || error.message || "GIF search is unavailable right now.");
        })
        .finally(() => setLoadingGifs(false));
    }, gifQuery ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [activePanel, gifQuery, contactId, searchChatGifs]);

  useEffect(() => {
    if (activePanel !== "stickers" || !contactId) return undefined;
    const query = stickerQuery.trim() || stickerCategory;
    const timer = window.setTimeout(() => {
      setLoadingStickers(true);
      setGifError("");
      searchChatStickers(query)
        .then(setStickers)
        .catch((error) => {
          setStickers([]);
          setGifError(error.message || "Sticker search is unavailable right now.");
        })
        .finally(() => setLoadingStickers(false));
    }, stickerQuery ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [activePanel, contactId, searchChatStickers, stickerCategory, stickerQuery]);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = window.setInterval(() => {
      setRecordingSeconds(Math.floor((Date.now() - (recorderRef.current?.startedAt || Date.now())) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActivePanel("");
        setMenuOpen(false);
        setImageViewer("");
        setShowSharedMedia(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => () => {
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    if (recorderRef.current?.state === "recording") {
      discardNextRecordingRef.current = true;
      recorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordedVoiceUrlRef.current) URL.revokeObjectURL(recordedVoiceUrlRef.current);
  }, []);

  const handleScroll = () => {
    const container = messagesRef.current;
    if (!container) return;
    shouldStickToBottomRef.current = container.scrollHeight - container.scrollTop - container.clientHeight < 120;
    if (shouldStickToBottomRef.current) setNewMessages(0);
  };

  const handleSelectContact = (contact) => {
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    if (contactId) postTyping(false);
    setActiveContact(contact);
    setMobileChatOpen(true);
    setDraft("");
    setActivePanel("");
    setUploadError("");
  };

  const postTyping = (typing) => {
    updateChatPresence(typing && contactId ? contactId : null)
      .catch((error) => console.error("Could not update typing status:", error));
  };

  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    if (!contactId) return;
    if (!typingTimeoutRef.current) postTyping(true);
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => postTyping(false), 1600);
  };

  const sendTextMessage = async (text = draft, retryId = null) => {
    const value = text.trim();
    if (!value || !contactId || sendInFlightRef.current) return;
    sendInFlightRef.current = true;
    setDraft("");
    setActivePanel("");
    if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
    postTyping(false);
    const localId = retryId || `pending-${Date.now()}`;
    const optimisticMessage = {
      _id: localId,
      SenderID: currentUserId,
      ReceiverID: contactId,
      type: "text",
      text: value,
      createdAt: new Date().toISOString(),
      status: "sending",
    };
    setMessages((previous) => retryId
      ? previous.map((message) => message._id === retryId ? { ...message, status: "sending" } : message)
      : [...previous, optimisticMessage]);
    shouldStickToBottomRef.current = true;
    try {
      const saved = await sendChatMessage({ recipientId: contactId, type: "text", text: value });
      setMessages((previous) => previous.map((message) => message._id === localId ? saved : message));
    } catch (error) {
      console.error("Could not send message:", error);
      setMessages((previous) => previous.map((message) => message._id === localId
        ? { ...message, status: "failed", error: error.response?.data?.message || "Message failed" }
        : message));
    } finally {
      sendInFlightRef.current = false;
      draftRef.current?.focus();
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendTextMessage();
    }
  };

  const sendStructuredMessage = async (payload) => {
    if (!contactId) return;
    setActivePanel("");
    setUploadError("");
    try {
      const saved = await sendChatMessage({ recipientId: contactId, ...payload });
      setMessages((previous) => [...previous, saved]);
      shouldStickToBottomRef.current = true;
    } catch (error) {
      console.error("Could not send attachment:", error);
      setUploadError(error.response?.data?.message || "Could not send this item.");
    }
  };

  const sendFile = async (file, duration) => {
    if (!file || !contactId) return;
    setIsUploading(true);
    setUploadError("");
    try {
      const saved = await uploadChatAttachment(file, contactId, duration);
      setMessages((previous) => [...previous, saved]);
      shouldStickToBottomRef.current = true;
    } catch (error) {
      console.error("Could not upload attachment:", error);
      setUploadError(error.response?.data?.message || "Upload failed. Try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFilePicked = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Attachments must be smaller than 10 MB.");
      return;
    }
    sendFile(file);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setUploadError("Voice recording is not supported in this browser.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredType = typeof MediaRecorder.isTypeSupported === "function"
        ? AUDIO_RECORDING_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
        : "";
      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      recorder.startedAt = Date.now();
      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size) recordingChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        if (discardNextRecordingRef.current) {
          discardNextRecordingRef.current = false;
          stream.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
          return;
        }
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (!blob.size) {
          setUploadError("The recording was empty. Check microphone access and try again.");
          stream.getTracks().forEach((track) => track.stop());
          recordingStreamRef.current = null;
          return;
        }
        const url = URL.createObjectURL(blob);
        if (recordedVoiceUrlRef.current) URL.revokeObjectURL(recordedVoiceUrlRef.current);
        recordedVoiceUrlRef.current = url;
        setRecordedVoice({
          blob,
          url,
          duration: Math.max(1, Math.round((Date.now() - recorder.startedAt) / 1000)),
        });
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      });
      recorder.addEventListener("error", (event) => {
        console.error("Voice recording failed:", event.error);
        setUploadError("The voice recording failed. Check microphone access and try again.");
        setRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
      });
      recorder.start();
      setRecordingSeconds(0);
      setRecording(true);
      setUploadError("");
    } catch (error) {
      console.error("Microphone permission failed:", error);
      setUploadError(error.name === "NotAllowedError"
        ? "Allow microphone access in your browser to record a voice message."
        : "Could not start recording. Check that a microphone is available.");
    }
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    setRecording(false);
  };

  const discardRecording = () => {
    if (recorderRef.current?.state === "recording") {
      discardNextRecordingRef.current = true;
      recorderRef.current.stop();
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
    if (recordedVoiceUrlRef.current) URL.revokeObjectURL(recordedVoiceUrlRef.current);
    recordedVoiceUrlRef.current = "";
    setRecordedVoice(null);
    setRecording(false);
    setRecordingSeconds(0);
  };

  const sendRecording = async () => {
    if (!recordedVoice) return;
    const mimeType = recordedVoice.blob.type || "audio/webm";
    const file = new File([recordedVoice.blob], `voice-message-${Date.now()}.${getAudioExtension(mimeType)}`, { type: mimeType });
    const duration = recordedVoice.duration;
    discardRecording();
    await sendFile(file, duration);
  };

  const insertEmoji = (emoji) => {
    const input = draftRef.current;
    if (!input) {
      setDraft((value) => value + emoji);
      return;
    }
    const start = input.selectionStart ?? draft.length;
    const end = input.selectionEnd ?? draft.length;
    const next = `${draft.slice(0, start)}${emoji}${draft.slice(end)}`;
    setDraft(next);
    window.requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    });
  };

  const sendGif = (gif) => sendStructuredMessage({ type: "gif", gifId: gif.id, text: gif.title });
  const sendSticker = (sticker) =>
    sendStructuredMessage({ type: "sticker", stickerId: sticker.id, text: sticker.title });

  const loadOlderMessages = async () => {
    if (!mergedMessages.length || !contactId) return;
    const container = messagesRef.current;
    const oldHeight = container?.scrollHeight || 0;
    await loadMessages(contactId, { before: mergedMessages[0].createdAt });
    window.requestAnimationFrame(() => {
      if (container) container.scrollTop = container.scrollHeight - oldHeight;
    });
  };

  const status = presence[contactId];
  const sharedMedia = mergedMessages.filter((message) => ["image", "video", "gif", "sticker"].includes(message.type));

  return (
    <main className="chat-app" aria-label="PhotoSafe private chats">
      <aside className={`chat-sidebar ${mobileChatOpen ? "is-mobile-hidden" : ""}`}>
        <div className="chat-sidebar-top">
          <div className="chat-sidebar-brand">
            <img src={user?.Profilepic || ProfileImage} alt="" />
            <div className="chat-brand-copy">
              <strong>PhotoSafe</strong>
              <span>Private chats</span>
            </div>
            <button className="chat-icon-button sidebar-menu" aria-label="More options" onClick={() => setMenuOpen((open) => !open)}>
              <EllipsisVerticalIcon />
            </button>
          </div>
          {menuOpen && (
            <div className="chat-menu sidebar-menu-popover">
              <button onClick={() => { navigate("/home"); setMenuOpen(false); }}>Back to home game</button>
              <button onClick={() => { navigate("/home/profile"); setMenuOpen(false); }}>Your profile</button>
            </div>
          )}
          <label className="chat-search">
            <MagnifyingGlassIcon />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people" aria-label="Search people" />
            {search && <button aria-label="Clear search" onClick={() => setSearch("")}><XMarkIcon /></button>}
          </label>
          <div className="chat-list-label">CONVERSATIONS <span>{sortedContacts.length}</span></div>
        </div>

        <div className="chat-contact-list">
          {loadingContacts ? (
            Array.from({ length: 5 }, (_, index) => <div className="chat-contact-skeleton" key={index}><i /><span /></div>)
          ) : sortedContacts.length ? (
            sortedContacts.map((contact) => {
              const id = getId(contact);
              const summary = summaries[id];
              const lastMessage = summary?.lastMessage;
              const peerPresence = presence[id];
              return (
                <button
                  type="button"
                  className={`chat-contact ${id === contactId ? "is-active" : ""}`}
                  key={id}
                  onClick={() => handleSelectContact(contact)}
                >
                  <span className="chat-avatar-wrap">
                    <img src={contact.Profilepic || ProfileImage} alt="" />
                    {peerPresence?.online && <i className="chat-online-dot" />}
                  </span>
                  <span className="chat-contact-copy">
                    <span className="chat-contact-row">
                      <strong>{contact.Firstname} {contact.Lastname || ""}</strong>
                      {lastMessage && <time>{formatTime(lastMessage.createdAt)}</time>}
                    </span>
                    <span className="chat-contact-row">
                      <span className="chat-contact-preview">{messagePreview(lastMessage)}</span>
                      {summary?.unreadCount > 0 && <span className="chat-unread-count">{summary.unreadCount}</span>}
                    </span>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="chat-no-contacts">{search ? "No contacts match your search." : "No other PhotoSafe members yet."}</div>
          )}
        </div>
        <div className="chat-sidebar-footer">
          <span className="chat-privacy-lock">⌑</span>
          <span>Your conversations stay private</span>
        </div>
      </aside>

      <section className={`chat-conversation ${mobileChatOpen ? "is-mobile-open" : ""}`}>
        {activeContact ? (
          <>
            <header className="chat-header">
              <button
                className="chat-icon-button chat-back-button"
                aria-label="Back to conversations"
                onClick={() => { setMobileChatOpen(false); setActiveContact(null); }}
              >
                <ArrowLeftIcon />
              </button>
              <span className="chat-avatar-wrap chat-header-avatar">
                <img src={activeContact.Profilepic || ProfileImage} alt="" />
                {status?.online && <i className="chat-online-dot" />}
              </span>
              <div className="chat-header-copy">
                <strong>{activeContact.Firstname} {activeContact.Lastname || ""}</strong>
                <span className={status?.typing ? "is-typing" : status?.online ? "is-online" : ""}>
                  {status?.typing ? "typing..." : status?.online ? "online" : formatLastSeen(status?.lastSeenAt)}
                </span>
              </div>
              <button
                className="chat-icon-button"
              aria-label="Conversation details"
              onClick={() => setShowSharedMedia(true)}
              >
                <MagnifyingGlassIcon />
              </button>
              <div className="chat-menu-anchor">
                <button className="chat-icon-button" aria-label="Conversation options" onClick={() => setMenuOpen((open) => !open)}>
                  <EllipsisVerticalIcon />
                </button>
                {menuOpen && (
                  <div className="chat-menu">
                    <button onClick={() => { setShowSharedMedia(true); setMenuOpen(false); }}>Shared media</button>
                    <button onClick={() => { setActiveContact(null); setMobileChatOpen(false); setMenuOpen(false); }}>Close conversation</button>
                  </div>
                )}
              </div>
            </header>

            <div className="chat-message-area">
              <div className="chat-messages-scroll" ref={messagesRef} onScroll={handleScroll}>
                {hasOlderMessages && mergedMessages.length > 0 && (
                  <button className="chat-load-older" onClick={loadOlderMessages}>
                    <ArrowPathIcon />
                    Load earlier messages
                  </button>
                )}
                {loadingMessages ? (
                  <div className="chat-message-skeletons">
                    <i /><i /><i /><i />
                  </div>
                ) : mergedMessages.length === 0 ? (
                  <div className="chat-empty-state">
                    <span className="empty-lock">⌑</span>
                    <strong>Your conversations are private</strong>
                    <p>Send a note, share a photo, or leave a little hello.</p>
                  </div>
                ) : (
                  mergedMessages.map((message, index) => {
                    const own = getId(message.SenderID) === currentUserId;
                    const previous = mergedMessages[index - 1];
                    const currentDate = new Date(message.createdAt).toDateString();
                    const previousDate = previous ? new Date(previous.createdAt).toDateString() : "";
                    const showDate = currentDate !== previousDate;
                    const grouped = previous &&
                      getMessagePeer(previous, currentUserId) === getMessagePeer(message, currentUserId) &&
                      new Date(message.createdAt).getTime() - new Date(previous.createdAt).getTime() < 5 * 60 * 1000 &&
                      currentDate === previousDate;
                    return (
                      <React.Fragment key={message._id}>
                        {showDate && <div className="chat-date-separator"><span>{formatDateLabel(message.createdAt)}</span></div>}
                        <div className={`chat-message-row ${own ? "is-own" : "is-other"} ${grouped ? "is-grouped" : ""}`}>
                          <article className={`chat-bubble ${message.type === "sticker" ? "is-sticker-bubble" : ""}`}>
                            <MessageContent message={message} onImageClick={setImageViewer} />
                            {message.type !== "sticker" && (
                              <footer className="chat-bubble-meta">
                                <time>{formatTime(message.createdAt)}</time>
                                {own && <MessageStatus message={message} />}
                              </footer>
                            )}
                            {message.status === "failed" && (
                              <button className="retry-message-button" onClick={() => sendTextMessage(message.text, message._id)}>
                                Retry sending
                              </button>
                            )}
                          </article>
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                {status?.typing && (
                  <div className="typing-bubble" aria-label={`${activeContact.Firstname} is typing`}>
                    <i /><i /><i />
                    <span>typing</span>
                  </div>
                )}
              </div>
              {newMessages > 0 && (
                <button className="new-messages-button" onClick={() => {
                  shouldStickToBottomRef.current = true;
                  if (messagesRef.current) messagesRef.current.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
                  setNewMessages(0);
                }}>
                  <ArrowDownIcon />
                  {newMessages} new {newMessages === 1 ? "message" : "messages"}
                </button>
              )}
            </div>

            <div className="chat-composer-zone">
              {activePanel && (
                <div className={`chat-picker-panel ${activePanel === "gifs" ? "is-gif-picker" : ""}`}>
                  <div className="chat-picker-header">
                    <strong>{activePanel === "emoji" ? "Emoji" : activePanel === "stickers" ? "Stickers" : "Find a GIF"}</strong>
                    <button className="chat-icon-button" aria-label="Close picker" onClick={() => setActivePanel("")}><XMarkIcon /></button>
                  </div>
                  {activePanel === "emoji" && (
                    <>
                      <div className="picker-categories">
                        {Object.keys(EMOJIS).map((category) => (
                          <button key={category} className={emojiCategory === category ? "is-selected" : ""} onClick={() => setEmojiCategory(category)}>{category}</button>
                        ))}
                      </div>
                      <div className="emoji-grid">
                        {EMOJIS[emojiCategory].map((emoji, index) => (
                          <button key={`${emoji}-${index}`} aria-label={`Insert ${emoji}`} onClick={() => insertEmoji(emoji)}>{emoji}</button>
                        ))}
                      </div>
                    </>
                  )}
                  {activePanel === "stickers" && (
                    <>
                      <label className="gif-search">
                        <MagnifyingGlassIcon />
                        <input
                          value={stickerQuery}
                          onChange={(event) => setStickerQuery(event.target.value)}
                          placeholder="Search stickers"
                          aria-label="Search stickers"
                        />
                      </label>
                      {!stickerQuery && (
                        <div className="picker-categories">
                          {STICKER_CATEGORIES.map((category) => (
                            <button key={category} className={stickerCategory === category ? "is-selected" : ""} onClick={() => setStickerCategory(category)}>{category}</button>
                          ))}
                        </div>
                      )}
                      {gifError && <p className="picker-error" role="status">{gifError}</p>}
                      {loadingStickers ? (
                        <div className="gif-loading-grid"><i /><i /><i /><i /></div>
                      ) : (
                        <div className="giphy-sticker-grid">
                          {stickers.map((sticker) => (
                            <button
                              key={sticker.id}
                              aria-label={`Send sticker: ${sticker.title}`}
                              onClick={() => sendSticker(sticker)}
                            >
                              <img src={sticker.previewUrl} alt={sticker.title} loading="lazy" />
                            </button>
                          ))}
                          {!gifError && stickers.length === 0 && <p className="picker-empty">No stickers found. Try another search.</p>}
                        </div>
                      )}
                      <p className="giphy-attribution">Powered by GIPHY</p>
                    </>
                  )}
                  {activePanel === "gifs" && (
                    <>
                      <label className="gif-search">
                        <MagnifyingGlassIcon />
                        <input value={gifQuery} onChange={(event) => setGifQuery(event.target.value)} placeholder="Search GIPHY GIFs" aria-label="Search GIFs" />
                      </label>
                      {gifError && <p className="picker-error" role="status">{gifError}</p>}
                      {loadingGifs ? (
                        <div className="gif-loading-grid"><i /><i /><i /><i /></div>
                      ) : (
                        <div className="gif-grid">
                          {gifs.map((gif) => (
                            <button
                              key={gif.id}
                              aria-label={`Send GIF: ${gif.title}`}
                              onClick={() => sendGif(gif)}
                            >
                              <img src={gif.previewUrl} alt={gif.title} loading="lazy" />
                            </button>
                          ))}
                          {!gifError && gifs.length === 0 && <p className="picker-empty">No GIFs found. Try another search.</p>}
                        </div>
                      )}
                      <p className="giphy-attribution">Powered by GIPHY</p>
                    </>
                  )}
                </div>
              )}

              {uploadError && <div className="chat-composer-error" role="alert">{uploadError}</div>}
              {recording && (
                <div className="voice-recording-bar">
                  <span className="recording-pulse" />
                  <strong>Recording</strong>
                  <time>{String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:{String(recordingSeconds % 60).padStart(2, "0")}</time>
                  <button className="chat-icon-button" onClick={discardRecording} aria-label="Cancel recording"><XMarkIcon /></button>
                  <button className="voice-stop-button" onClick={stopRecording}>Stop</button>
                </div>
              )}
              {recordedVoice && (
                <div className="voice-preview-bar">
                  <AudioMessage src={recordedVoice.url} duration={recordedVoice.duration} />
                  <button className="chat-icon-button" onClick={discardRecording} aria-label="Delete voice recording"><XMarkIcon /></button>
                  <button className="voice-send-button" disabled={isUploading} onClick={sendRecording}>Send</button>
                </div>
              )}

              <form className="chat-composer" onSubmit={(event) => { event.preventDefault(); sendTextMessage(); }}>
                <button type="button" className={`chat-tool-button ${activePanel === "emoji" ? "is-active" : ""}`} aria-label="Open emoji picker" onClick={() => setActivePanel(activePanel === "emoji" ? "" : "emoji")}>
                  <FaceSmileIcon />
                </button>
                <button type="button" className={`chat-tool-button text-tool ${activePanel === "gifs" ? "is-active" : ""}`} aria-label="Open GIF picker" onClick={() => setActivePanel(activePanel === "gifs" ? "" : "gifs")}>GIF</button>
                <button type="button" className={`chat-tool-button text-tool ${activePanel === "stickers" ? "is-active" : ""}`} aria-label="Open stickers" onClick={() => setActivePanel(activePanel === "stickers" ? "" : "stickers")}>☺</button>
                <button type="button" className="chat-tool-button" aria-label="Attach a file" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  <PaperClipIcon />
                </button>
                <input ref={fileInputRef} className="visually-hidden-file" type="file" accept="image/*,video/*,audio/*,application/pdf" onChange={handleFilePicked} />
                <textarea
                  ref={draftRef}
                  value={draft}
                  onChange={handleDraftChange}
                  onKeyDown={handleComposerKeyDown}
                  onFocus={() => setActivePanel("")}
                  rows={1}
                  placeholder="Write a message"
                  aria-label="Write a message"
                  maxLength={4000}
                />
                {draft.trim() ? (
                  <button type="submit" className="chat-send-button" aria-label="Send message" disabled={isUploading}>
                    <PaperAirplaneIcon />
                  </button>
                ) : recordedVoice ? null : recording ? null : (
                  <button type="button" className={`chat-tool-button mic-button ${isUploading ? "is-disabled" : ""}`} aria-label="Record a voice message" onClick={startRecording} disabled={isUploading}>
                    <MicrophoneIcon />
                  </button>
                )}
                {isUploading && <span className="uploading-label">Uploading</span>}
              </form>
            </div>
          </>
        ) : (
          <div className="chat-welcome">
            <div className="welcome-orbit"><span>✦</span><i>⌑</i></div>
            <p className="chat-eyebrow">PHOTOSAFE PRIVATE CHAT</p>
            <h1>A little more private.<br /><span>A lot more connected.</span></h1>
            <p>Choose someone from your conversations to share a message, photo, voice note, or sticker.</p>
            <div className="welcome-privacy"><span>⌑</span> Private access is on</div>
          </div>
        )}
      </section>

      {imageViewer && (
        <div className="chat-lightbox" role="dialog" aria-modal="true" aria-label="Shared image viewer" onClick={() => setImageViewer("")}>
          <button className="chat-lightbox-close" onClick={() => setImageViewer("")} aria-label="Close image viewer"><XMarkIcon /></button>
          <img src={imageViewer} alt="Shared full-size" onClick={(event) => event.stopPropagation()} />
        </div>
      )}

      {showSharedMedia && (
        <div className="chat-lightbox media-gallery-backdrop" role="dialog" aria-modal="true" aria-label="Shared media" onClick={() => setShowSharedMedia(false)}>
          <section className="shared-media-gallery" onClick={(event) => event.stopPropagation()}>
            <header><strong>Shared media</strong><button className="chat-icon-button" onClick={() => setShowSharedMedia(false)} aria-label="Close shared media"><XMarkIcon /></button></header>
            <div>
              {sharedMedia.map((media) => (
                <button key={media._id} onClick={() => {
                  setShowSharedMedia(false);
                  if (media.type === "image") setImageViewer(media.mediaUrl);
                }}>
                  {media.type === "video"
                    ? <video src={media.mediaUrl} muted />
                    : media.type === "gif" && media.gifId
                      ? <GiphyMessage gifId={media.gifId} title={media.text} />
                      : media.type === "sticker" && media.stickerId
                       ? <GiphyMessage gifId={media.stickerId} title={media.text || "Sticker"} isSticker />
                      : <img src={media.mediaUrl} alt="" loading="lazy" />}
                </button>
              ))}
              {sharedMedia.length === 0 && <p>No photos, videos, or GIFs shared yet.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

export default ChatPage;
