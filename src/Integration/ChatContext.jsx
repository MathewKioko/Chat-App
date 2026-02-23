import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './Authcontext';

const ChatContext = createContext(null);

// Message status enum
export const MessageStatus = {
  SENDING: 'sending',
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
  FAILED: 'failed'
};

// Helper to sanitize message content
const sanitizeMessage = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;')
    .substring(0, 4000);
};

// Helper to generate unique ID
const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const ChatProvider = ({ children, session }) => {
  // Chat state
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Real-time channel reference
  const channelRef = useRef(null);
  const sessionRef = useRef(session);

  // Update session ref when it changes
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Dark mode
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('whatsapp-dark-mode');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Apply dark mode
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('whatsapp-dark-mode', JSON.stringify(darkMode));
      document.body.classList.toggle('dark', darkMode);
    }
  }, [darkMode]);

  // Toggle dark mode
  const toggleDarkMode = useCallback(() => {
    setDarkMode(prev => !prev);
  }, []);

  // Load chats from localStorage
  useEffect(() => {
    const savedChats = localStorage.getItem('chat-chats');
    if (savedChats) {
      try {
        setChats(JSON.parse(savedChats));
      } catch (e) {
        console.error('Failed to parse saved chats:', e);
      }
    }
  }, []);

  // Save chats to localStorage
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('chat-chats', JSON.stringify(chats));
    }
  }, [chats]);

  // Set up real-time channel
  useEffect(() => {
    if (!session || !supabase) return;

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const chatChannel = supabase.channel('global-chat', {
      config: {
        presence: { key: session.user.id }
      }
    });

    // Handle incoming messages
    chatChannel.on('broadcast', { event: 'message' }, (payload) => {
      const newMessage = payload.payload;
      
      // Don't add own messages again
      if (newMessage.user_id === session.user.id) return;

      // Add to messages
      setMessages(prev => {
        const chatId = newMessage.chat_id || 'global';
        const chatMessages = prev[chatId] || [];
        return {
          ...prev,
          [chatId]: [...chatMessages, {
            ...newMessage,
            status: MessageStatus.DELIVERED
          }]
        };
      });

      // Update chat last message
      setChats(prev => prev.map(chat => 
        chat.id === (newMessage.chat_id || 'global')
          ? {
              ...chat,
              lastMessage: newMessage.message,
              lastMessageTime: newMessage.timestamp,
              unreadCount: (chat.unreadCount || 0) + 1
            }
          : chat
      ));
    });

    // Handle typing indicators
    chatChannel.on('broadcast', { event: 'typing' }, (payload) => {
      const { userId, userName, chatId, isTyping } = payload.payload;
      
      if (userId !== sessionRef.current?.user?.id) {
        setTypingUsers(prev => {
          const key = chatId || 'global';
          const currentUsers = prev[key] || [];
          
          if (isTyping) {
            // Add user if not already typing
            if (!currentUsers.find(u => u.id === userId)) {
              return {
                ...prev,
                [key]: [...currentUsers, { id: userId, name: userName }]
              };
            }
            return prev;
          } else {
            // Remove user from typing
            return {
              ...prev,
              [key]: currentUsers.filter(u => u.id !== userId)
            };
          }
        });
      }
    });

    // Handle presence sync
    chatChannel.on('presence', { event: 'sync' }, () => {
      const state = chatChannel.presenceState();
      const users = Object.values(state).flat();
      setOnlineUsers(users);
    });

    // Subscribe to channel
    chatChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await chatChannel.track({
          id: session.user.id,
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          avatar: session.user.user_metadata?.avatar_url
        });
      }
    });

    channelRef.current = chatChannel;

    // Cleanup function
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [session]);

  // Send a message
  const sendMessage = useCallback(async (content, chatId = 'global', type = 'text', attachments = null) => {
    if (!session || !channelRef.current) return null;

    const sanitizedContent = sanitizeMessage(content);
    if (!sanitizedContent && type === 'text') return null;

    const tempId = generateId();
    const messageData = {
      id: tempId,
      message: sanitizedContent,
      user_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
      avatar: session.user.user_metadata?.avatar_url,
      timestamp: new Date().toISOString(),
      user_id: session.user.id,
      chat_id: chatId,
      type,
      attachments,
      status: MessageStatus.SENDING
    };

    // Add to local messages immediately
    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), messageData]
    }));

    // Update chat
    setChats(prev => prev.map(chat =>
      chat.id === chatId
        ? { ...chat, lastMessage: sanitizedContent, lastMessageTime: new Date().toISOString() }
        : chat
    ));

    try {
      // Send via Supabase
      await channelRef.current.send({
        type: 'broadcast',
        event: 'message',
        payload: messageData
      });

      // Update message status to sent
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId].map(msg =>
          msg.id === tempId ? { ...msg, status: MessageStatus.SENT } : msg
        )
      }));

      // Clear draft
      localStorage.removeItem('chat-draft');

      return messageData;
    } catch (err) {
      console.error('Failed to send message:', err);
      
      // Update message status to failed
      setMessages(prev => ({
        ...prev,
        [chatId]: prev[chatId].map(msg =>
          msg.id === tempId ? { ...msg, status: MessageStatus.FAILED } : msg
        )
      }));

      return null;
    }
  }, [session]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (chatId = 'global', isTyping = true) => {
    if (!session || !channelRef.current) return;

    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: session.user.id,
          userName: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
          chatId,
          isTyping
        }
      });
    } catch (err) {
      // Silently fail for typing indicators
    }
  }, [session]);

  // Mark messages as read
  const markAsRead = useCallback(async (chatId = 'global') => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    ));
  }, []);

  // Search messages
  const searchMessages = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const lowerQuery = query.toLowerCase();
    
    const results = [];
    Object.entries(messages).forEach(([chatId, chatMessages]) => {
      chatMessages.forEach(msg => {
        if (msg.message.toLowerCase().includes(lowerQuery)) {
          results.push({
            ...msg,
            chatId
          });
        }
      });
    });

    setSearchResults(results.slice(0, 50));
    setIsSearching(false);
  }, [messages]);

  // Get messages for active chat
  const getChatMessages = useCallback((chatId) => {
    return messages[chatId] || [];
  }, [messages]);

  // Create a new chat
  const createChat = useCallback(async (name, type = 'direct', participants = []) => {
    const newChat = {
      id: generateId(),
      name,
      type,
      participants,
      createdAt: new Date().toISOString(),
      lastMessage: '',
      lastMessageTime: null,
      unreadCount: 0,
      avatar: type === 'group' ? null : `https://api.dicebear.com/7.x/initials/svg?seed=${name}`
    };

    setChats(prev => [newChat, ...prev]);
    return newChat;
  }, []);

  // Delete a message
  const deleteMessage = useCallback(async (chatId, messageId) => {
    setMessages(prev => ({
      ...prev,
      [chatId]: prev[chatId].filter(msg => msg.id !== messageId)
    }));
  }, []);

  // Retry failed message
  const retryMessage = useCallback(async (chatId, messageId) => {
    const message = messages[chatId]?.find(m => m.id === messageId);
    if (!message || message.status !== MessageStatus.FAILED) return;

    // Remove failed message
    setMessages(prev => ({
      ...prev,
      [chatId]: prev[chatId].filter(m => m.id !== messageId)
    }));

    // Resend
    await sendMessage(message.message, chatId, message.type, message.attachments);
  }, [messages, sendMessage]);

  // Filtered chats based on search
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    
    const query = searchQuery.toLowerCase();
    return chats.filter(chat => 
      chat.name.toLowerCase().includes(query)
    );
  }, [chats, searchQuery]);

  // Typing users for active chat
  const activeChatTypingUsers = useMemo(() => {
    if (!activeChat) return [];
    return typingUsers[activeChat.id] || [];
  }, [typingUsers, activeChat]);

  // Online status check
  const isUserOnline = useCallback((userId) => {
    return onlineUsers.some(u => u.id === userId);
  }, [onlineUsers]);

  // Get user info from ID
  const getUserInfo = useCallback((userId) => {
    return onlineUsers.find(u => u.id === userId);
  }, [onlineUsers]);

  // Save draft
  const saveDraft = useCallback((chatId, text) => {
    if (text && chatId) {
      localStorage.setItem('chat-draft', JSON.stringify({ chatId, text }));
    } else {
      localStorage.removeItem('chat-draft');
    }
  }, []);

  const value = {
    // State
    chats,
    activeChat,
    messages,
    onlineUsers,
    typingUsers: activeChatTypingUsers,
    searchQuery,
    searchResults,
    isSearching,
    loading,
    error,
    darkMode,
    filteredChats,

    // Actions
    setActiveChat,
    setSearchQuery,
    sendMessage,
    sendTypingIndicator,
    markAsRead,
    searchMessages,
    createChat,
    deleteMessage,
    retryMessage,
    toggleDarkMode,
    saveDraft,
    getChatMessages,
    isUserOnline,
    getUserInfo,

    // Utilities
    MessageStatus
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
