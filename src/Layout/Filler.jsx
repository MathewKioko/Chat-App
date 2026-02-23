import { useState, useEffect, useRef } from 'react'
import { FaSignOutAlt, FaSearch, FaEllipsisV, FaPaperPlane, FaSmile, FaPaperclip, FaArrowLeft, FaCheck, FaCheckDouble, FaMoon, FaSun } from 'react-icons/fa'
import { IoMdSend } from 'react-icons/io'
import { supabase } from '../Integration/Authcontext'
import EmojiPicker from 'emoji-picker-react'

const ChatApp = () => {
    const [newMessage, setNewMessage] = useState('')
    const [session, setSession] = useState(null)
    const [usersOnline, setUsersOnline] = useState([])
    const [messages, setMessages] = useState([])
    const [isTyping, setIsTyping] = useState(false)
    const [emoji, setEmoji] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isSignUp, setIsSignUp] = useState(false)
    const [authError, setAuthError] = useState('')
    const [showSidebar, setShowSidebar] = useState(true)
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('whatsapp-dark-mode')
        return saved ? JSON.parse(saved) : false
    })
    const messagesEndRef = useRef(null)
    const inputRef = useRef(null)

    // Save dark mode preference
    useEffect(() => {
        localStorage.setItem('whatsapp-dark-mode', JSON.stringify(darkMode))
        document.body.classList.toggle('dark-mode', darkMode)
    }, [darkMode])

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    const send = async (e) => {
        e.preventDefault()
        if (!newMessage.trim()) return

        const messageData = {
            message: newMessage,
            user_name: session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0],
            avatar: session?.user?.user_metadata?.avatar_url,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            user_id: session?.user?.id
        }

        supabase.channel('person1').send({
            type: 'broadcast',
            event: 'message',
            payload: messageData
        })
        
        setMessages((prevMessages) => [...prevMessages, messageData])
        setNewMessage('')
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
        })
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session)
        })
        return () => subscription.unsubscribe()
    }, [])

    const signIn = async () => {
        setAuthError('')
        if (!email || !password) {
            setAuthError('Please enter both email and password')
            return
        }
        try {
            if (isSignUp) {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: email.split('@')[0]
                        }
                    }
                })
                if (error) throw error
                alert('Check your email for confirmation link!')
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                })
                if (error) throw error
            }
        } catch (error) {
            console.error('Auth error:', error)
            setAuthError(error.message || 'Authentication failed. Please check if Email auth is enabled in Supabase.')
        }
    }

    // Sockets - PRESERVE ALL BACKEND LOGIC
    useEffect(() => {
        if (!session) {
            setUsersOnline([])
            return
        }

        const person1 = supabase.channel('person1', {
            config: {
                presence: {
                    key: session?.user?.id
                }
            }
        })

        person1.on('broadcast', { event: 'message' }, (payload) => {
            setMessages((prevMessages) => [...prevMessages, payload.payload])
        })

        person1.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await person1.track({
                    id: session?.user?.id,
                    name: session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0],
                    avatar: session?.user?.user_metadata?.avatar_url
                })
            }
        })

        person1.on('presence', { event: 'sync' }, () => {
            const state = person1.presenceState()
            const users = Object.values(state).map(user => user[0])
            setUsersOnline(users)
        })

        return () => {
            supabase.removeChannel(person1)
        }
    }, [session])

    const signOut = async () => {
        await supabase.auth.signOut()
    }

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            send(e)
        }
    }

    // ==================== LOGIN SCREEN ====================
    if (!session) {
        return (
            <div className="whatsapp-login-bg flex items-center justify-center min-h-screen">
                <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-whatsapp-green rounded-full flex items-center justify-center mx-auto mb-4">
                            <IoMdSend className="text-white text-3xl" />
                        </div>
                        <h1 className="text-3xl font-bold text-gray-800 mb-2">WhatsApp Chat</h1>
                        <p className="text-gray-500">Connect with your contacts instantly</p>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                type="email"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-whatsapp-green"
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-whatsapp-green"
                            />
                        </div>
                        
                        {authError && (
                            <p className="text-red-500 text-sm text-center">{authError}</p>
                        )}
                        
                        <button 
                            onClick={signIn}
                            className="w-full bg-whatsapp-green hover:bg-whatsapp-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors"
                        >
                            {isSignUp ? 'Sign Up' : 'Sign In'}
                        </button>
                        
                        <button 
                            onClick={() => { setIsSignUp(!isSignUp); setAuthError('') }}
                            className="w-full text-gray-600 hover:text-gray-800 py-2 text-sm"
                        >
                            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // ==================== CHAT APP - WHATSAPP STYLE ====================
    return (
        <div className="whatsapp-container">
            {/* ==================== LEFT SIDEBAR ==================== */}
            <div className={`whatsapp-sidebar ${showSidebar ? 'show' : 'hide'}`}>
                {/* Sidebar Header - User Profile */}
                <div className="whatsapp-sidebar-header">
                    <div className="user-profile">
                        <img
                            src={session?.user?.user_metadata?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${session?.user?.email}`}
                            alt="Profile"
                            className="user-avatar"
                        />
                        <span className="online-dot"></span>
                    </div>
                    <div className="header-actions">
                        <button className="action-btn" title="Status">
                            <span className="status-icon">●</span>
                        </button>
                        <button className="action-btn" title="New Chat">
                            <span className="chat-icon">💬</span>
                        </button>
                        <button onClick={signOut} className="action-btn" title="Sign Out">
                            <FaSignOutAlt />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="whatsapp-search">
                    <div className="search-container">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Search or start new chat"
                            className="search-input"
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="chat-list">
                    {/* Active Chat - Global Chat */}
                    <div className="chat-item active">
                        <div className="chat-avatar-wrapper">
                            <div className="chat-avatar group-avatar">👥</div>
                        </div>
                        <div className="chat-info">
                            <div className="chat-name-row">
                                <span className="chat-name">Global Chat</span>
                                <span className="chat-time">{messages.length > 0 ? messages[messages.length - 1]?.timestamp : ''}</span>
                            </div>
                            <div className="chat-preview-row">
                                <span className="chat-preview">
                                    {messages.length > 0 
                                        ? (messages[messages.length - 1]?.user_id === session?.user?.id ? 'You: ' : '') + messages[messages.length - 1]?.message?.substring(0, 40) + '...'
                                        : 'No messages yet'
                                    }
                                </span>
                                <span className="unread-badge">{usersOnline.length}</span>
                            </div>
                        </div>
                    </div>

                    {/* Online Users */}
                    {usersOnline.filter(u => u.id !== session?.user?.id).map((user, index) => (
                        <div key={index} className="chat-item">
                            <div className="chat-avatar-wrapper">
                                <img
                                    src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`}
                                    alt={user.name}
                                    className="chat-avatar"
                                />
                                <span className="online-indicator"></span>
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
                </div>
            </div>

            {/* ==================== RIGHT CHAT AREA ==================== */}
            <div className={`whatsapp-chat-area ${!showSidebar ? 'full-width' : ''}`}>
                {/* Chat Header */}
                <div className="whatsapp-chat-header">
                    <button 
                        className="mobile-back-btn"
                        onClick={() => setShowSidebar(true)}
                    >
                        <FaArrowLeft />
                    </button>
                    <div className="header-user-info">
                        <div className="header-avatar-wrapper">
                            <div className="header-avatar group-avatar">👥</div>
                            <span className="header-online-indicator"></span>
                        </div>
                        <div className="header-user-details">
                            <span className="header-user-name">Global Chat</span>
                            <span className="header-user-status">
                                {usersOnline.length} {usersOnline.length === 1 ? 'user' : 'users'} online
                            </span>
                        </div>
                    </div>
                    <div className="header-actions">
                        <button 
                            className="action-btn" 
                            onClick={() => setDarkMode(!darkMode)}
                            title={darkMode ? "Light Mode" : "Dark Mode"}
                        >
                            {darkMode ? <FaSun /> : <FaMoon />}
                        </button>
                        <button className="action-btn" title="Search">
                            <FaSearch />
                        </button>
                        <button className="action-btn" title="More">
                            <FaEllipsisV />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="whatsapp-messages">
                    <div className="messages-background">
                        {messages.length === 0 ? (
                            <div className="empty-chat">
                                <div className="empty-chat-icon">💬</div>
                                <h3>Welcome to Global Chat</h3>
                                <p>Send messages to connect with everyone online!</p>
                            </div>
                        ) : (
                            <div className="messages-list">
                                {messages.map((msg, index) => {
                                    const isMyMessage = msg?.user_id === session?.user?.id;
                                    const showAvatar = !isMyMessage && (index === 0 || messages[index - 1]?.user_id !== msg?.user_id);
                                    
                                    return (
                                        <div
                                            key={index}
                                            className={`message-wrapper ${isMyMessage ? 'sent' : 'received'} ${showAvatar ? 'with-avatar' : ''}`}
                                        >
                                            {!isMyMessage && (
                                                <img
                                                    src={msg.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.user_name}`}
                                                    alt={msg.user_name}
                                                    className="message-avatar"
                                                />
                                            )}
                                            <div className="message-bubble">
                                                {!isMyMessage && (
                                                    <span className="message-sender">{msg.user_name}</span>
                                                )}
                                                <p className="message-text">{msg.message}</p>
                                                <span className="message-time">
                                                    {msg.timestamp}
                                                    {isMyMessage && (
                                                        <span className="message-status">
                                                            <FaCheck className="check-icon" />
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </div>

                {/* Message Input */}
                <div className="whatsapp-input-area">
                    <button
                        type="button"
                        onClick={() => setEmoji(!emoji)}
                        className="input-action-btn emoji-btn"
                        title="Emoji"
                    >
                        <FaSmile />
                    </button>
                    
                    {emoji && (
                        <div className="emoji-picker-container">
                            <EmojiPicker
                                theme="light"
                                width={300}
                                height={400}
                                onEmojiClick={(emojiData) => {
                                    const cursorPos = inputRef.current?.selectionStart || newMessage.length;
                                    const text = newMessage.slice(0, cursorPos) + emojiData.emoji + newMessage.slice(cursorPos);
                                    setNewMessage(text);
                                    setEmoji(false);
                                    inputRef.current?.focus();
                                }}
                            />
                        </div>
                    )}
                    
                    <button
                        type="button"
                        className="input-action-btn attach-btn"
                        title="Attach"
                    >
                        <FaPaperclip />
                    </button>
                    
                    <div className="input-wrapper">
                        <input
                            ref={inputRef}
                            type="text"
                            className="message-input"
                            placeholder="Type a message"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                            onFocus={() => setIsTyping(true)}
                            onBlur={() => setIsTyping(false)}
                        />
                    </div>
                    
                    <button
                        type="button"
                        onClick={send}
                        disabled={!newMessage.trim()}
                        className={`send-btn ${newMessage.trim() ? 'active' : ''}`}
                    >
                        <IoMdSend />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ChatApp
