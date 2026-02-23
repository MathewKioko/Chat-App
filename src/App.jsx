import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './Integration/Authcontext';
import { ChatProvider, useChat, MessageStatus } from './Integration/ChatContext';
import { IoMdSend } from 'react-icons/io';

// Login Component
const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      await onLogin(email, password, isSignUp);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="whatsapp-login-bg">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <IoMdSend />
          </div>
          <h1>WhatsApp Chat</h1>
          <p>Connect with your contacts instantly</p>
        </div>
        
        <form className="login-form" onSubmit={handleSubmit}>
          <input
            type="email"
            className="login-input"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            autoComplete="email"
            required
          />
          
          <input
            type="password"
            className="login-input"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            required
            minLength={6}
          />
          
          {error && <div className="login-error" role="alert">{error}</div>}
          
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
          
          <div className="login-toggle">
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }} disabled={loading}>
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Message Input Component
const MessageInput = ({ session }) => {
  const { activeChat, sendMessage, sendTypingIndicator, saveDraft } = useChat();
  const [message, setMessage] = useState('');
  const typingTimeoutRef = useRef(null);

  const handleTyping = useCallback(() => {
    const chatId = activeChat?.id || 'global';
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    sendTypingIndicator(chatId, true);
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(chatId, false);
    }, 2000);
  }, [activeChat, sendTypingIndicator]);

  const handleChange = useCallback((e) => {
    setMessage(e.target.value);
    handleTyping();
    const chatId = activeChat?.id || 'global';
    saveDraft(chatId, e.target.value);
  }, [activeChat, saveDraft, handleTyping]);

  const handleSend = useCallback(async () => {
    if (!message.trim()) return;
    const chatId = activeChat?.id || 'global';
    await sendMessage(message.trim(), chatId, 'text');
    setMessage('');
    saveDraft(chatId, '');
  }, [message, activeChat, sendMessage, saveDraft]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  useEffect(() => {
    const draft = localStorage.getItem('chat-draft');
    if (draft) {
      try {
        const draftData = JSON.parse(draft);
        const chatId = activeChat?.id || 'global';
        if (draftData.chatId === chatId && draftData.text) {
          setMessage(draftData.text);
        }
      } catch (e) {}
    }
  }, [activeChat]);

  if (!activeChat) return null;

  return (
    <div className="whatsapp-input-area">
      <button type="button" className="input-action-btn" title="Emoji">
        <span>😊</span>
      </button>
      <button type="button" className="input-action-btn" title="Attach">
        <span>📎</span>
      </button>
      <div className="input-wrapper">
        <textarea
          className="message-input"
          placeholder="Type a message"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          rows={1}
        />
      </div>
      <button
        type="button"
        onClick={handleSend}
        disabled={!message.trim()}
        className={`send-btn ${message.trim() ? 'active' : ''}`}
      >
        <IoMdSend />
      </button>
    </div>
  );
};

// Main Chat App
const ChatApp = ({ session, onSignOut }) => {
  const {
    activeChat, setActiveChat,
    filteredChats,
    searchQuery, setSearchQuery, searchMessages,
    darkMode, toggleDarkMode,
    onlineUsers, typingUsers,
    getChatMessages, markAsRead
  } = useChat();

  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);

  // Set initial active chat when session loads
  useEffect(() => {
    if (session && !activeChat) {
      setActiveChat({
        id: 'global',
        name: 'Global Chat',
        type: 'group',
        lastMessage: '',
        lastMessageTime: null,
        unreadCount: 0,
        avatar: null
      });
    }
  }, [session, activeChat, setActiveChat]);

  const messages = getChatMessages(activeChat?.id || 'global');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 50);
    }
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (activeChat) markAsRead(activeChat.id);
  }, [activeChat, markAsRead]);

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatChatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    if (now - date < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const handleSearch = useCallback((e) => {
    setSearchQuery(e.target.value);
    const timeoutId = setTimeout(() => {
      if (e.target.value.trim()) searchMessages(e.target.value);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [setSearchQuery, searchMessages]);

  const handleChatSelect = useCallback((chat) => {
    setActiveChat(chat);
    if (chat.unreadCount > 0) markAsRead(chat.id);
    if (window.innerWidth < 768) setShowSidebar(false);
  }, [setActiveChat, markAsRead]);

  const getDefaultAvatar = useCallback(() => {
    return session?.user?.user_metadata?.avatar_url || 
           `https://api.dicebear.com/7.x/initials/svg?seed=${session?.user?.email || 'user'}`;
  }, [session]);

  const displayChats = useMemo(() => {
    if (filteredChats.length === 0) {
      return [{
        id: 'global',
        name: 'Global Chat',
        type: 'group',
        lastMessage: '',
        lastMessageTime: null,
        unreadCount: 0,
        avatar: null
      }];
    }
    return filteredChats;
  }, [filteredChats]);

  const shouldShowDaySeparator = (msg, index) => {
    if (index === 0) return true;
    const currentDate = new Date(msg.timestamp).toDateString();
    const prevDate = new Date(messages[index - 1].timestamp).toDateString();
    return currentDate !== prevDate;
  };

  const onlineStatus = activeChat?.type === 'group' 
    ? `${onlineUsers.length} ${onlineUsers.length === 1 ? 'user' : 'users'} online`
    : 'Online';

  return (
    <div className="whatsapp-container">
      {/* Sidebar */}
      <aside className={`whatsapp-sidebar ${showSidebar ? 'show' : 'hide'}`}>
        <header className="whatsapp-sidebar-header">
          <div className="user-profile">
            <img src={getDefaultAvatar()} alt="Profile" className="user-avatar" />
            <span className="online-dot" />
          </div>
          <div className="header-actions">
            <button className="action-btn" title="New chat"><span>➕</span></button>
            <button className="action-btn" onClick={toggleDarkMode} title={darkMode ? 'Light mode' : 'Dark mode'}>
              <span>{darkMode ? '☀️' : '🌙'}</span>
            </button>
            <button className="action-btn" onClick={onSignOut} title="Sign out"><span>🚪</span></button>
          </div>
        </header>

        <div className="whatsapp-search">
          <div className="search-container">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search or start new chat"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
        </div>

        <nav className="chat-list">
          {displayChats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item ${activeChat?.id === chat.id ? 'active' : ''} ${chat.unreadCount > 0 ? 'unread' : ''}`}
              onClick={() => handleChatSelect(chat)}
            >
              <div className="chat-avatar-wrapper">
                {chat.avatar ? (
                  <img src={chat.avatar} alt={chat.name} className={`chat-avatar ${chat.type === 'group' ? 'group-avatar' : ''}`} />
                ) : (
                  <div className="chat-avatar group-avatar">{chat.name?.charAt(0)?.toUpperCase() || '?'}</div>
                )}
                <span className="online-indicator" />
              </div>
              <div className="chat-info">
                <div className="chat-name-row">
                  <span className="chat-name">{chat.name}</span>
                  <span className="chat-time">{formatChatTime(chat.lastMessageTime)}</span>
                </div>
                <div className="chat-preview-row">
                  <span className="chat-preview">
                    {chat.lastMessage || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No messages yet</span>}
                  </span>
                  {chat.unreadCount > 0 && <span className="unread-badge">{chat.unreadCount}</span>}
                </div>
              </div>
            </div>
          ))}

          {onlineUsers.length > 0 && (
            <>
              <div className="chat-item" style={{ cursor: 'default', backgroundColor: 'var(--hover-bg)', fontWeight: 600, fontSize: '13px', color: 'var(--text-secondary)', padding: 'var(--spacing-md)' }}>
                Online Users ({onlineUsers.length})
              </div>
              {onlineUsers.filter(u => u.id !== session?.user?.id).map((user) => (
                <div key={user.id} className="chat-item">
                  <div className="chat-avatar-wrapper">
                    <img src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt={user.name} className="chat-avatar" />
                    <span className="online-indicator" />
                  </div>
                  <div className="chat-info">
                    <div className="chat-name-row">
                      <span className="chat-name">{user.name}</span>
                    </div>
                    <div className="chat-preview-row">
                      <span className="chat-preview online-text">Online</span>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </nav>
      </aside>

      {/* Chat Area */}
      <section className={`whatsapp-chat-area ${!showSidebar ? 'full-width' : ''}`}>
        <header className="whatsapp-chat-header">
          <button className="mobile-back-btn" onClick={() => setShowSidebar(true)}>
            <span>←</span>
          </button>
          <div className="header-user-info">
            <div className="header-avatar-wrapper">
              <div className="header-avatar group-avatar">
                {activeChat?.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <span className="header-online-indicator" />
            </div>
            <div className="header-user-details">
              <span className="header-user-name">{activeChat?.name || 'Global Chat'}</span>
              <span className="header-user-status">{onlineStatus}</span>
            </div>
          </div>
          <div className="header-actions">
            <button className="action-btn" title="Search"><span>🔍</span></button>
            <button className="action-btn" title="More"><span>⋮</span></button>
          </div>
        </header>

        <div className="whatsapp-messages">
          <div className="messages-background">
            {messages.length === 0 ? (
              <div className="empty-chat">
                <div className="empty-chat-icon">💬</div>
                <h3>Welcome to {activeChat?.name || 'Global Chat'}</h3>
                <p>Send messages to connect with everyone!</p>
              </div>
            ) : (
              <div className="messages-list">
                {messages.map((msg, index) => {
                  const isMine = msg.user_id === session?.user?.id;
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showAvatar = !isMine && (!prevMsg || prevMsg.user_id !== msg.user_id);
                  
                  return (
                    <div key={msg.id || index}>
                      {shouldShowDaySeparator(msg, index) && (
                        <div className="day-separator">
                          <span>
                            {new Date(msg.timestamp).toDateString() === new Date().toDateString() 
                              ? 'Today' 
                              : new Date(msg.timestamp).toDateString() === new Date(Date.now() - 86400000).toDateString()
                                ? 'Yesterday'
                                : new Date(msg.timestamp).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
                            }
                          </span>
                        </div>
                      )}
                      <div className={`message-wrapper ${isMine ? 'sent' : 'received'} ${showAvatar ? 'with-avatar' : ''}`}>
                        {!isMine && showAvatar && (
                          <img src={msg.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.user_name}`} alt={msg.user_name} className="message-avatar" />
                        )}
                        <div className="message-bubble">
                          {!isMine && <span className="message-sender">{msg.user_name}</span>}
                          <p className="message-content">{msg.message}</p>
                          <div className="message-meta">
                            <span className="message-time">
                              {formatTime(msg.timestamp)}
                              {isMine && <span className="message-status">
                                {msg.status === MessageStatus.SENDING ? '○' : 
                                 msg.status === MessageStatus.SENT ? '✓' : 
                                 msg.status === MessageStatus.DELIVERED ? '✓✓' : 
                                 msg.status === MessageStatus.FAILED ? '⚠' : ''}
                              </span>}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {typingUsers.length > 0 && (
                  <div className="message-wrapper received">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        <MessageInput session={session} />
      </section>
    </div>
  );
};

// Main App Component
const AppContent = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      if (!supabase) {
        setAuthError('Supabase not configured. Please add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file');
        setLoading(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (err) {
        console.error('Auth check failed:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    if (supabase) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  const handleLogin = useCallback(async (email, password, isSignUp) => {
    if (!supabase) throw new Error('Supabase not configured');

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: email.split('@')[0] } }
      });
      if (error) throw error;
      alert('Check your email for confirmation link!');
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
  }, []);

  if (loading) {
    return (
      <div className="whatsapp-login-bg" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  if (authError) {
    return (
      <div className="whatsapp-login-bg">
        <div className="login-container">
          <div className="login-error" style={{ padding: '20px', textAlign: 'center' }}>
            <h3>Configuration Error</h3>
            <p>{authError}</p>
            <p style={{ marginTop: '10px', fontSize: '12px' }}>
              Please create a .env file with:
              <br />VITE_SUPABASE_URL=your_supabase_url
              <br />VITE_SUPABASE_ANON_KEY=your_anon_key
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChatProvider session={session}>
      <ChatApp session={session} onSignOut={handleSignOut} />
    </ChatProvider>
  );
};

export default AppContent;
