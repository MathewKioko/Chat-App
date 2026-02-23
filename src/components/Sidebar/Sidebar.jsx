import { memo, useCallback, useMemo } from 'react';
import { FaSearch, FaSignOutAlt, FaEllipsisV, FaSun, FaMoon, FaPlus } from 'react-icons/fa';
import { useChat } from '../../Integration/ChatContext';

// Memoized ChatItem component
const ChatItem = memo(({ chat, isActive, onClick, searchQuery }) => {
  const { onlineUsers, markAsRead } = useChat();

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Today
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Yesterday
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // This week
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    
    // Older
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isOnline = useMemo(() => {
    return chat.type === 'direct' && onlineUsers.some(u => 
      chat.participants?.includes(u.id)
    );
  }, [chat, onlineUsers]);

  const highlightText = (text, query) => {
    if (!query || !text) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() 
        ? <mark key={i} style={{ backgroundColor: 'rgba(37, 211, 102, 0.3)', padding: '0 2px', borderRadius: '2px' }}>{part}</mark>
        : part
    );
  };

  const handleClick = () => {
    onClick(chat);
    if (chat.unreadCount > 0) {
      markAsRead(chat.id);
    }
  };

  return (
    <div 
      className={`chat-item ${isActive ? 'active' : ''} ${chat.unreadCount > 0 ? 'unread' : ''}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      aria-current={isActive ? 'true' : 'false'}
    >
      <div className="chat-avatar-wrapper">
        {chat.avatar ? (
          <img
            src={chat.avatar}
            alt={chat.name}
            className={`chat-avatar ${chat.type === 'group' ? 'group-avatar' : ''}`}
            loading="lazy"
          />
        ) : (
          <div className="chat-avatar group-avatar">
            {chat.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
        )}
        {isOnline && <span className="online-indicator" />}
      </div>
      
      <div className="chat-info">
        <div className="chat-name-row">
          <span className="chat-name">
            {highlightText(chat.name, searchQuery)}
          </span>
          <span className="chat-time">
            {formatTime(chat.lastMessageTime)}
          </span>
        </div>
        
        <div className="chat-preview-row">
          <span className="chat-preview">
            {chat.lastMessage ? (
              highlightText(
                chat.lastMessage.length > 50 
                  ? chat.lastMessage.substring(0, 50) + '...' 
                  : chat.lastMessage, 
                searchQuery
              )
            ) : (
              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No messages yet
              </span>
            )}
          </span>
          {chat.unreadCount > 0 && (
            <span className="unread-badge">{chat.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  );
});

ChatItem.displayName = 'ChatItem';

// Main Sidebar Component
const Sidebar = ({ session, onSignOut }) => {
  const {
    filteredChats,
    activeChat,
    setActiveChat,
    searchQuery,
    setSearchQuery,
    searchMessages,
    darkMode,
    toggleDarkMode,
    onlineUsers
  } = useChat();

  // Debounced search handler
  const handleSearch = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        searchMessages(query);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [setSearchQuery, searchMessages]);

  // Get default avatar URL
  const getDefaultAvatar = useCallback(() => {
    return session?.user?.user_metadata?.avatar_url || 
           `https://api.dicebear.com/7.x/initials/svg?seed=${session?.user?.email || 'user'}`;
  }, [session]);

  // Handle chat selection
  const handleChatSelect = useCallback((chat) => {
    setActiveChat(chat);
  }, [setActiveChat]);

  // If no chats exist, show default global chat
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

  return (
    <aside 
      className="whatsapp-sidebar"
      role="complementary"
      aria-label="Chat list"
    >
      {/* Header */}
      <header className="whatsapp-sidebar-header">
        <div className="user-profile" title="Your profile">
          <img
            src={getDefaultAvatar()}
            alt="Your profile"
            className="user-avatar"
          />
          <span className="online-dot" title="Online" />
        </div>
        
        <div className="header-actions">
          <button 
            className="action-btn" 
            title="New chat"
            aria-label="Start new chat"
          >
            <FaPlus />
          </button>
          <button 
            className="action-btn" 
            onClick={toggleDarkMode}
            title={darkMode ? "Light mode" : "Dark mode"}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
          <button 
            className="action-btn" 
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
          >
            <FaSignOutAlt />
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="whatsapp-search">
        <div className="search-container">
          <FaSearch className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search or start new chat"
            value={searchQuery}
            onChange={handleSearch}
            aria-label="Search chats"
          />
        </div>
      </div>

      {/* Chat List */}
      <nav className="chat-list" role="list" aria-label="Conversations">
        {displayChats.map((chat) => (
          <ChatItem
            key={chat.id}
            chat={chat}
            isActive={activeChat?.id === chat.id}
            onClick={handleChatSelect}
            searchQuery={searchQuery}
          />
        ))}
        
        {/* Online Users Section */}
        {onlineUsers.length > 0 && (
          <>
            <div 
              className="chat-item" 
              style={{ 
                cursor: 'default', 
                backgroundColor: 'var(--hover-bg)',
                fontWeight: 600,
                fontSize: '13px',
                color: 'var(--text-secondary)',
                padding: 'var(--spacing-md)'
              }}
            >
              Online Users ({onlineUsers.length})
            </div>
            {onlineUsers
              .filter(u => u.id !== session?.user?.id)
              .map((user) => (
                <div key={user.id} className="chat-item">
                  <div className="chat-avatar-wrapper">
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                      alt={user.name}
                      className="chat-avatar"
                    />
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
              ))
            }
          </>
        )}
      </nav>
    </aside>
  );
};

export default memo(Sidebar);
