# WhatsApp-Style Chat Application

A production-grade real-time chat application built with React, Supabase, and Tailwind CSS. Features a modern WhatsApp-inspired interface with premium UX.

![Chat App](https://img.shields.io/badge/React-19.x-blue) ![Supabase](https://img.shields.io/badge/Supabase-2.x-green) ![Tailwind-4.x](https://img.shields.io/badge/Tailwind-4.x-cyan)

## ✨ Features

### Core Messaging
- **Real-time messaging** via Supabase Realtime
- **Online presence** indicators
- **Typing indicators**
- **Message delivery states** (sending, sent, delivered, read)
- **Message persistence** in localStorage

### UI/UX
- **WhatsApp-inspired design** with premium aesthetics
- **Responsive layout** (mobile, tablet, desktop)
- **Dark mode** support
- **Smooth animations** and transitions
- **Custom scrollbars**

### Chat Features
- **Chat list** with search functionality
- **Unread message badges**
- **Day separators** in message view
- **Avatar support** with initials fallback
- **Online status indicators**

### Input Features
- **Auto-growing textarea**
- **Emoji picker** integration
- **File attachment** support (UI ready)
- **Draft message** persistence

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd supabase-chat-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to **Project Settings > API**
   - Copy the **Project URL** and **anon public** key

4. **Configure environment**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Edit .env with your Supabase credentials
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

5. **Enable Authentication**
   - In Supabase Dashboard, go to **Authentication > Providers**
   - Enable **Email** provider

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open in browser**
   ```
   http://localhost:5173
   ```

## 📁 Project Structure

```
src/
├── App.jsx                    # Main application component
├── main.jsx                   # React entry point
├── index.css                  # Global styles & design system
├── components/
│   ├── Auth/
│   │   └── Login.jsx          # Login/Signup form
│   ├── ChatWindow/
│   │   └── ChatWindow.jsx     # Message display area
│   ├── Input/
│   │   └── MessageInput.jsx   # Message input with emoji
│   └── Sidebar/
│       └── Sidebar.jsx        # Chat list sidebar
└── Integration/
    ├── Authcontext.jsx        # Supabase authentication
    └── ChatContext.jsx        # Chat state management
```

## 🎨 Design System

### Color Palette
| Variable | Light Mode | Dark Mode |
|----------|-----------|-----------|
| Primary Green | `#25D366` | `#25D366` |
| Header | `#075E54` | `#075E54` |
| Background | `#ECE5DD` | `#0D0D0D` |
| Sent Bubble | `#DCF8C6` | `#056162` |
| Received Bubble | `#FFFFFF` | `#2D2D2D` |

### Typography
- Font Family: `"Segoe UI", Roboto, system-ui`
- Base Size: 16px
- Scale: Consistent spacing (4px, 8px, 12px, 16px, 20px, 24px)

## 🔧 Configuration

### Supabase Setup

1. **Create tables** (optional - app works without DB for local testing)
   ```sql
   -- Messages table for persistence
   create table messages (
     id uuid default uuid_generate_v4() primary key,
     message text not null,
     user_id uuid references auth.users(id),
     user_name text,
     chat_id text default 'global',
     created_at timestamp with time zone default now()
   );
   
   -- Enable realtime
   alter publication supabase_realtime add table messages;
   ```

2. **Set up RLS policies**
   ```sql
   -- Allow authenticated users to read/write messages
   create policy "Enable read access for authenticated users"
     on messages for select to authenticated using (true);
   
   create policy "Enable insert for authenticated users"
     on messages for insert to authenticated with check (true);
   ```

## 📱 Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Full-screen chat, slide-in sidebar |
| Tablet | 768-1024px | 35% sidebar, 65% chat |
| Desktop | > 1024px | 30% sidebar, 70% chat |
| Wide | > 1600px | Centered with max-width |

## 🔐 Security Features

- **Input sanitization** on all user inputs
- **XSS prevention** via React's default escaping
- **Secure file upload** validation
- **Session management** via Supabase Auth

## 🧪 Testing

```bash
# Run linter
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm run build
# Deploy the dist folder
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - feel free to use this project for any purpose.

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) for the amazing realtime infrastructure
- [emoji-picker-react](https://github.com/wedgies/jquery-watermark) for emoji support
- [React Icons](https://react-icons.github.io/react-icons/) for iconography
