import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { FaSmile, FaPaperclip, FaMicrophone, FaPaperPlane, FaTimes, FaImage, FaFile, FaMicrophoneSlash } from 'react-icons/fa';
import { IoMdSend } from 'react-icons/io';
import EmojiPicker from 'emoji-picker-react';
import { useChat } from '../../Integration/ChatContext';

// Memoized attachment menu
const AttachmentMenu = memo(({ onSelect, onClose }) => {
  const options = [
    { 
      type: 'image', 
      icon: '🖼️', 
      label: 'Photos & Videos', 
      accept: 'image/*',
      description: 'Share images and videos'
    },
    { 
      type: 'file', 
      icon: '📄', 
      label: 'Document', 
      accept: '.pdf,.doc,.docx,.txt',
      description: 'Share files'
    },
    { 
      type: 'audio', 
      icon: '🎤', 
      label: 'Audio', 
      accept: 'audio/*',
      description: 'Record or share audio'
    }
  ];

  const handleSelect = (option) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = option.accept;
    input.multiple = false;
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        onSelect(option.type, file);
      }
    };
    
    input.click();
    onClose();
  };

  return (
    <div className="attachment-menu" role="menu">
      {options.map((option) => (
        <div 
          key={option.type}
          className="attachment-option"
          onClick={() => handleSelect(option)}
          role="menuitem"
        >
          <div className={`attachment-icon ${option.type}`}>
            {option.type === 'image' && <FaImage />}
            {option.type === 'file' && <FaFile />}
            {option.type === 'audio' && <FaMicrophone />}
          </div>
          <div className="attachment-text">
            <span>{option.label}</span>
            <span>{option.description}</span>
          </div>
        </div>
      ))}
      <button 
        className="message-action-btn" 
        onClick={onClose}
        style={{ position: 'absolute', top: '4px', right: '4px' }}
        aria-label="Close"
      >
        <FaTimes />
      </button>
    </div>
  );
});

AttachmentMenu.displayName = 'AttachmentMenu';

// Memoized emoji picker wrapper
const EmojiPickerWrapper = memo(({ onSelect, onClose }) => (
  <div className="emoji-picker-container">
    <EmojiPicker
      theme="light"
      width={320}
      height={400}
      previewEmoji="😊"
      skinTonesDisabled
      searchDisabled={false}
      onEmojiClick={(emojiData) => {
        onSelect(emojiData.emoji);
        onClose();
      }}
      onClickOutside={onClose}
    />
  </div>
));

EmojiPickerWrapper.displayName = 'EmojiPickerWrapper';

// Main MessageInput Component
const MessageInput = ({ session }) => {
  const {
    activeChat,
    sendMessage,
    sendTypingIndicator,
    saveDraft
  } = useChat();

  const [message, setMessage] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttachment, setShowAttachment] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [attachments, setAttachments] = useState([]);
  
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load draft on mount
  useEffect(() => {
    const loadDraft = () => {
      const draft = localStorage.getItem('chat-draft');
      if (draft) {
        try {
          const draftData = JSON.parse(draft);
          const chatId = activeChat?.id || 'global';
          if (draftData.chatId === chatId && draftData.text) {
            setMessage(draftData.text);
          }
        } catch (e) {
          // Ignore
        }
      }
    };
    
    loadDraft();
  }, [activeChat]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px';
    }
  }, [message]);

  // Send typing indicator with debounce
  const handleTyping = useCallback(() => {
    const chatId = activeChat?.id || 'global';
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Send typing start
    sendTypingIndicator(chatId, true);
    
    // Send typing stop after 2 seconds of no typing
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(chatId, false);
    }, 2000);
  }, [activeChat, sendTypingIndicator]);

  // Handle message change
  const handleChange = useCallback((e) => {
    const value = e.target.value;
    setMessage(value);
    handleTyping();
    
    // Save draft
    const chatId = activeChat?.id || 'global';
    saveDraft(chatId, value);
  }, [activeChat, saveDraft, handleTyping]);

  // Handle emoji selection
  const handleEmojiSelect = useCallback((emoji) => {
    const cursorPos = inputRef.current?.selectionStart || message.length;
    const newMessage = message.slice(0, cursorPos) + emoji + message.slice(cursorPos);
    setMessage(newMessage);
    inputRef.current?.focus();
  }, [message]);

  // Handle attachment selection
  const handleAttachment = useCallback((type, file) => {
    if (!file) return;

    // Create preview URL for images
    const attachment = {
      type,
      file,
      name: file.name,
      size: file.size,
      preview: type === 'image' ? URL.createObjectURL(file) : null
    };

    setAttachments(prev => [...prev, attachment]);
    setShowAttachment(false);
  }, []);

  // Remove attachment
  const removeAttachment = useCallback((index) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      if (newAttachments[index]?.preview) {
        URL.revokeObjectURL(newAttachments[index].preview);
      }
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  }, []);

  // Handle send
  const handleSend = useCallback(async () => {
    const chatId = activeChat?.id || 'global';
    const trimmedMessage = message.trim();
    
    // Send text message
    if (trimmedMessage) {
      await sendMessage(trimmedMessage, chatId, 'text');
    }
    
    // Send attachments
    for (const attachment of attachments) {
      // In a real app, you'd upload the file first and get a URL
      // For now, we'll just send a message about the attachment
      await sendMessage(
        `[${attachment.type}: ${attachment.name}]`,
        chatId,
        attachment.type,
        { name: attachment.name, size: attachment.size }
      );
    }
    
    // Clear input and attachments
    setMessage('');
    setAttachments([]);
    saveDraft(chatId, '');
    inputRef.current?.focus();
  }, [message, attachments, activeChat, sendMessage, saveDraft]);

  // Handle key press
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // Handle focus
  const handleFocus = useCallback(() => {
    setShowEmoji(false);
    setShowAttachment(false);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.emoji-picker-container') && 
          !e.target.closest('.emoji-btn')) {
        setShowEmoji(false);
      }
      if (!e.target.closest('.attachment-menu') && 
          !e.target.closest('.attach-btn')) {
        setShowAttachment(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Don't render if no active chat (use fallback from parent)
  if (!activeChat) {
    return null;
  }

  const canSend = message.trim() || attachments.length > 0;

  return (
    <div className="whatsapp-input-area" role="form" aria-label="Message input">
      {/* Emoji Button */}
      <button
        type="button"
        className="input-action-btn emoji-btn"
        onClick={(e) => {
          e.stopPropagation();
          setShowEmoji(!showEmoji);
          setShowAttachment(false);
        }}
        title="Emoji"
        aria-label="Add emoji"
        aria-expanded={showEmoji}
      >
        <FaSmile />
      </button>
      
      {/* Emoji Picker */}
      {showEmoji && (
        <EmojiPickerWrapper 
          onSelect={handleEmojiSelect}
          onClose={() => setShowEmoji(false)}
        />
      )}
      
      {/* Attachment Button */}
      <button
        type="button"
        className="input-action-btn attach-btn"
        onClick={(e) => {
          e.stopPropagation();
          setShowAttachment(!showAttachment);
          setShowEmoji(false);
        }}
        title="Attach"
        aria-label="Add attachment"
        aria-expanded={showAttachment}
      >
        <FaPaperclip />
      </button>
      
      {/* Attachment Menu */}
      {showAttachment && (
        <AttachmentMenu
          onSelect={handleAttachment}
          onClose={() => setShowAttachment(false)}
        />
      )}
      
      {/* Input Wrapper */}
      <div className="input-wrapper">
        {/* Attachment Previews */}
        {attachments.length > 0 && (
          <div 
            style={{ 
              display: 'flex', 
              gap: '8px', 
              marginBottom: '8px',
              flexWrap: 'wrap'
            }}
          >
            {attachments.map((att, index) => (
              <div 
                key={index}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'var(--hover-bg)',
                  padding: '4px 8px',
                  borderRadius: '16px',
                  fontSize: '12px'
                }}
              >
                {att.preview && (
                  <img 
                    src={att.preview} 
                    alt="" 
                    style={{ width: '24px', height: '24px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                )}
                <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {att.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeAttachment(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  aria-label={`Remove ${att.name}`}
                >
                  <FaTimes style={{ fontSize: '10px' }} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        <textarea
          ref={inputRef}
          className="message-input"
          placeholder="Type a message"
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyPress}
          onFocus={handleFocus}
          rows={1}
          aria-label="Message text"
        />
      </div>
      
      {/* Send Button */}
      <button
        type="button"
        onClick={handleSend}
        disabled={!canSend}
        className={`send-btn ${canSend ? 'active' : ''}`}
        title={canSend ? "Send message" : "Type a message"}
        aria-label="Send message"
      >
        <IoMdSend />
      </button>
    </div>
  );
};

export default memo(MessageInput);
