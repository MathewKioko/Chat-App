import { memo, useEffect, useRef, useMemo, useCallback } from 'react';
import { FaArrowLeft, FaSearch, FaEllipsisV, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useChat, MessageStatus } from '../../Integration/ChatContext';

// Memoized message component
const Message = memo(({ message, isMine, showAvatar, previousMessage, nextMessage, onRetry, onDelete }) => {
  const messageRef = useRef(null);

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Check if should show day separator
  const showDaySeparator = useMemo(() => {
    if (!previousMessage) return true;
    const currentDate = new Date(message.timestamp).toDateString();
    const prevDate = new Date(previousMessage.timestamp).toDateString();
    return currentDate !== prevDate;
  }, [message.timestamp, previousMessage]);

  // Get status icon
  const StatusIcon = useMemo(() => {
    switch (message.status) {
      case MessageStatus.SENDING:
        return <span className="message-status sending">○</span>;
      case MessageStatus.SENT:
        return <FaCheck className="check-icon" />;
      case MessageStatus.DELIVERED:
        return <FaCheckDouble className="check-icon" />;
      case MessageStatus.READ:
        return <FaCheckDouble className="check-icon read" />;
      case MessageStatus.FAILED:
        return <span className="message-status failed" title="Failed to send">⚠</span>;
      default:
        return null;
    }
  }, [message.status]);

  return (
    <>
      {showDaySeparator && (
        <div className="day-separator">
          <span>
            {new Date(message.timestamp).toDateString() === new Date().toDateString() 
              ? 'Today' 
              : new Date(message.timestamp).toDateString() === new Date(Date.now() - 86400000).toDateString()
                ? 'Yesterday'
                : new Date(message.timestamp).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })
            }
          </span>
        </div>
      )}
      
      <div 
        ref={messageRef}
        className={`message-wrapper ${isMine ? 'sent' : 'received'} ${showAvatar ? 'with-avatar' : ''}`}
      >
        {!isMine && showAvatar && (
          <img
            src={message.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${message.user_name}`}
            alt={message.user_name}
            className="message-avatar"
            loading="lazy"
          />
        )}
        
        <div className="message-bubble">
          {!isMine && (
            <span className="message-sender">{message.user_name}</span>
          )}
          
          {/* Message content - handle different types */}
          {message.type === 'image' && message.attachments?.url ? (
            <img 
              src={message.attachments.url} 
              alt="Shared image" 
              className="message-image"
              onClick={() => window.open(message.attachments.url, '_blank')}
            />
          ) : (
            <p className="message-content">
              {message.message}
            </p>
          )}
          
          <div className="message-meta">
            <span className="message-time">
              {formatTime(message.timestamp)}
              {isMine && <span className="message-status">{StatusIcon}</span>}
            </span>
          </div>
          
          {/* Message actions on hover */}
          <div className="message-actions">
            {message.status === MessageStatus.FAILED && (
              <button 
                className="message-action-btn" 
                onClick={() => onRetry(message.id)}
                title="Retry"
              >
                ↻
              </button>
            )}
            <button 
              className="message-action-btn" 
              onClick={() => onDelete(message.id)}
              title="Delete"
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

Message.displayName = 'Message';

// Memoized typing indicator
const TypingIndicator = memo(() => (
  <div className="message-wrapper received">
    <div className="typing-indicator">
      <span></span>
      <span></span>
      <span></span>
    </div>
  </div>
));

TypingIndicator.displayName = 'TypingIndicator';

// Main ChatWindow Component
const ChatWindow = ({ onBack, session }) => {
  const {
    activeChat,
    getChatMessages,
    typingUsers,
    onlineUsers,
    deleteMessage,
    retryMessage,
    markAsRead
  } = useChat();

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const isUserScrolling = useRef(false);
  const scrollTimeout = useRef(null);

  // Get messages for active chat
  const messages = useMemo(() => {
    const chatId = activeChat?.id || 'global';
    return getChatMessages(chatId);
  }, [activeChat, getChatMessages]);

  // Scroll to bottom on new messages
  const scrollToBottom = useCallback((smooth = true) => {
    if (isUserScrolling.current) return;
    
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'end'
    });
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Clear existing timeout
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }

    // Check if user is near bottom
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    isUserScrolling.current = !isNearBottom;

    // Reset after scrolling stops
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 1000);
  }, []);

  // Scroll to bottom on messages change
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => scrollToBottom(), 50);
    }
  }, [messages.length, scrollToBottom]);

  // Mark as read when chat is opened
  useEffect(() => {
    if (activeChat) {
      markAsRead(activeChat.id);
    }
  }, [activeChat, markAsRead]);

  // Format online status
  const onlineStatus = useMemo(() => {
    if (!activeChat) return '';
    
    if (activeChat.type === 'group') {
      return `${onlineUsers.length} ${onlineUsers.length === 1 ? 'user' : 'users'} online`;
    }
    
    const isOnline = onlineUsers.some(u => 
      activeChat.participants?.includes(u.id)
    );
    
    return isOnline ? 'Online' : 'Offline';
  }, [activeChat, onlineUsers]);

  // Get default chat info
  const chatInfo = useMemo(() => {
    if (!activeChat) {
      return {
        name: 'Global Chat',
        avatar: null,
        status: `${onlineUsers.length} users online`
      };
    }
    
    return {
      name: activeChat.name,
      avatar: activeChat.avatar,
      status: onlineStatus
    };
  }, [activeChat, onlineUsers, onlineStatus]);

  // Handle delete message
  const handleDelete = useCallback((messageId) => {
    const chatId = activeChat?.id || 'global';
    deleteMessage(chatId, messageId);
  }, [activeChat, deleteMessage]);

  // Handle retry message
  const handleRetry = useCallback((messageId) => {
    const chatId = activeChat?.id || 'global';
    retryMessage(chatId, messageId);
  }, [activeChat, retryMessage]);

  // Handle empty chat
  if (!activeChat) {
    return (
      <div className="whatsapp-chat-area">
        <div className="whatsapp-chat-header">
          <button 
            className="mobile-back-btn"
            onClick={onBack}
            aria-label="Go back"
          >
            <FaArrowLeft />
          </button>
        </div>
        
        <div className="whatsapp-messages">
          <div className="messages-background">
            <div className="empty-chat">
              <div className="empty-chat-icon">💬</div>
              <h3>Select a chat</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section 
      className="whatsapp-chat-area"
      role="main"
      aria-label="Chat conversation"
    >
      {/* Chat Header */}
      <header className="whatsapp-chat-header">
        <button 
          className="mobile-back-btn"
          onClick={onBack}
          aria-label="Go back to chat list"
        >
          <FaArrowLeft />
        </button>
        
        <div className="header-user-info">
          <div className="header-avatar-wrapper">
            {chatInfo.avatar ? (
              <img
                src={chatInfo.avatar}
                alt={chatInfo.name}
                className={`header-avatar ${activeChat?.type === 'group' ? 'group-avatar' : ''}`}
              />
            ) : (
              <div className="header-avatar group-avatar">
                {chatInfo.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <span className="header-online-indicator" />
          </div>
          
          <div className="header-user-details">
            <span className="header-user-name">{chatInfo.name}</span>
            <span className={`header-user-status ${chatInfo.status === 'Online' ? 'online' : ''}`}>
              {chatInfo.status}
            </span>
          </div>
        </div>
        
        <div className="header-actions">
          <button 
            className="action-btn" 
            title="Search messages"
            aria-label="Search in conversation"
          >
            <FaSearch />
          </button>
          <button 
            className="action-btn" 
            title="More options"
            aria-label="More options"
          >
            <FaEllipsisV />
          </button>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        className="whatsapp-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        role="log"
        aria-label="Message history"
        aria-live="polite"
      >
        <div className="messages-background">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <div className="empty-chat-icon">💬</div>
              <h3>Welcome to {chatInfo.name}</h3>
              <p>Send messages to connect with everyone!</p>
            </div>
          ) : (
            <div className="messages-list">
              {messages.map((msg, index) => {
                const isMyMessage = msg.user_id === session?.user?.id;
                const previousMessage = index > 0 ? messages[index - 1] : null;
                const showAvatar = !isMyMessage && (!previousMessage || previousMessage.user_id !== msg.user_id);
                
                return (
                  <Message
                    key={msg.id || index}
                    message={msg}
                    isMine={isMyMessage}
                    showAvatar={showAvatar}
                    previousMessage={previousMessage}
                    nextMessage={index < messages.length - 1 ? messages[index + 1] : null}
                    onRetry={handleRetry}
                    onDelete={handleDelete}
                  />
                );
              })}
              
              {/* Typing Indicator */}
              {typingUsers.length > 0 && (
                <TypingIndicator />
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default memo(ChatWindow);
