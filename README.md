# 💬 ChatApp — Real-Time MERN Chat Application

A full-stack, production-grade real-time chat application built with MongoDB, Express.js, React (Vite), Node.js, Socket.io, and Tailwind CSS.

---

## ✨ Features

### Real-Time (Socket.io)
- ⚡ Instant message delivery
- ✍️ Typing indicator
- 🟢 Online / offline presence
- ✓✓ Message seen / delivered status
- ✏️ Live message editing
- 🗑️ Live message deletion
- 😊 Real-time emoji reactions
- 🔔 Friend request notifications

### Chat
- 💬 1-on-1 messaging
- 🖼️ Image sharing (base64 / Cloudinary)
- ↩️ Reply to specific messages
- 😂 Emoji reactions (quick + full picker)
- 📜 Infinite scroll (load older messages)
- 🔍 User search
- 📊 Unread message counts

### User System
- 🔐 JWT authentication
- 👤 Profile with avatar, bio, username
- 👥 Friend system (send / accept / reject / remove)
- 🌙 Dark / Light mode (system preference auto-detect)

---

## 📁 Project Structure

```
chatapp/
├── server/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   └── messageController.js
│   ├── middleware/
│   │   ├── auth.js              # JWT protect + verifySocketToken
│   │   └── error.js             # AppError + asyncHandler
│   ├── models/
│   │   ├── User.js              # username, email, friends, isOnline…
│   │   ├── Message.js           # text, image, reactions, status…
│   │   └── Group.js             # Group chat model
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   └── messages.js
│   ├── socket/
│   │   └── socketHandler.js     # All real-time events
│   ├── utils/
│   │   ├── db.js
│   │   ├── cloudinary.js
│   │   └── seed.js
│   ├── index.js                 # Express + Socket.io server
│   └── .env.example
│
└── client/
    └── src/
        ├── components/
        │   ├── chat/
        │   │   ├── Sidebar.jsx        # Contact list, search, tabs, friend requests
        │   │   ├── ChatWindow.jsx     # Messages, auto-scroll, load more
        │   │   ├── MessageBubble.jsx  # Message with reactions, edit, delete, reply
        │   │   ├── MessageInput.jsx   # Text area, emoji picker, image upload
        │   │   └── ProfilePanel.jsx   # Slide-over profile view/edit
        │   └── common/
        │       ├── Avatar.jsx         # Avatar with online dot + initials fallback
        │       ├── Skeleton.jsx       # Loading skeletons + Spinner
        │       └── TypingIndicator.jsx
        ├── context/
        │   └── SocketContext.jsx      # Socket.io connection + event handlers
        ├── hooks/
        │   └── useTheme.jsx           # Dark/light mode context
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   └── ChatPage.jsx           # Main chat layout
        ├── services/
        │   └── api.js                 # Axios instance + all API functions
        ├── store/
        │   ├── index.js
        │   └── slices/
        │       ├── authSlice.js
        │       └── chatSlice.js
        ├── utils/
        │   └── helpers.js             # Dates, initials, colors, export
        ├── App.jsx
        ├── Routes.jsx
        └── main.jsx
```

---

## ⚙️ Setup

### Prerequisites
- Node.js v18+
- MongoDB Atlas (free tier) or local MongoDB
- (Optional) Cloudinary account for image uploads

---

### 1. Clone / Extract

```bash
cd chatapp
```

---

### 2. Backend Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/chatapp

JWT_SECRET=your_super_secret_min_32_chars_here
JWT_EXPIRE=7d

# Optional — leave as-is for dev (images stored as base64)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CLIENT_URL=http://localhost:5173
```

**Seed demo users:**
```bash
npm run seed
```

**Start server:**
```bash
npm run dev     # development (nodemon)
npm start       # production
```

Server runs at: `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd ../client
npm install
npm run dev
```

Frontend runs at: `http://localhost:5173`

> The Vite dev server proxies `/api` and `/socket.io` to `localhost:5000` automatically.

---

### 4. Demo Accounts (after seeding)

| Username | Email             | Password   |
|----------|-------------------|------------|
| alice    | alice@demo.com    | demo1234   |
| bob      | bob@demo.com      | demo1234   |
| charlie  | charlie@demo.com  | demo1234   |
| diana    | diana@demo.com    | demo1234   |
| eve      | eve@demo.com      | demo1234   |

> Alice is friends with everyone. Log in as Alice in one tab and Bob in another to test real-time messaging!

---

## 🔌 API Reference

Base URL: `http://localhost:5000/api`  
Auth: `Authorization: Bearer <token>`

### Auth
| Method | Endpoint        | Auth | Description       |
|--------|-----------------|------|-------------------|
| POST   | /auth/register  | No   | Create account    |
| POST   | /auth/login     | No   | Login, get token  |
| POST   | /auth/logout    | Yes  | Logout            |
| GET    | /auth/me        | Yes  | Get current user  |

### Users
| Method | Endpoint                       | Description            |
|--------|--------------------------------|------------------------|
| GET    | /users?search=bob              | Search users           |
| GET    | /users/:id                     | Get user profile       |
| PUT    | /users/profile                 | Update own profile     |
| POST   | /users/friend-request/:id      | Send friend request    |
| POST   | /users/accept-request/:id      | Accept friend request  |
| POST   | /users/reject-request/:id      | Reject friend request  |
| DELETE | /users/friend/:id              | Remove friend          |

### Messages
| Method | Endpoint                    | Description            |
|--------|-----------------------------|------------------------|
| GET    | /messages/:userId           | Get conversation       |
| POST   | /messages/:userId           | Send message (REST)    |
| DELETE | /messages/:messageId        | Delete message         |
| PUT    | /messages/:messageId        | Edit message           |
| POST   | /messages/:messageId/react  | Add/toggle reaction    |
| GET    | /messages/unread/count      | Unread counts per user |

---

## 🔌 Socket.io Events

### Client → Server
| Event           | Payload                                      |
|-----------------|----------------------------------------------|
| sendMessage     | `{ receiverId, text, image, replyTo }`       |
| typing          | `{ receiverId, isTyping }`                   |
| messageSeen     | `{ senderId, messageIds }`                   |
| editMessage     | `{ messageId, text, receiverId }`            |
| deleteMessage   | `{ messageId, receiverId }`                  |
| reactToMessage  | `{ messageId, emoji, receiverId }`           |
| friendRequest   | `{ receiverId }`                             |

### Server → Client
| Event               | Payload                                  |
|---------------------|------------------------------------------|
| receiveMessage      | Full message object                      |
| messageSent         | Message sent confirmation (own tabs)     |
| messageEdited       | Updated message                          |
| messageDeleted      | `{ messageId }`                          |
| messageReacted      | `{ messageId, reactions }`               |
| messagesSeen        | `{ by, messageIds }`                     |
| messageDelivered    | `{ messageId }`                          |
| typing              | `{ senderId, isTyping }`                 |
| userOnline          | `{ userId }`                             |
| userOffline         | `{ userId, lastSeen }`                   |
| onlineUsers         | `[userId, ...]`                          |
| newFriendRequest    | User object                              |
| friendRequestAccepted | User object                            |

---

## 🚀 Deployment

### Frontend → Vercel
1. Push `client/` to GitHub
2. New project on vercel.com
3. Build command: `npm run build`
4. Output: `dist`
5. Env var: `VITE_API_URL=https://your-api.com/api`
6. Env var: `VITE_SOCKET_URL=https://your-api.com`

### Backend → Render
1. Push `server/` to GitHub
2. New Web Service on render.com
3. Build: `npm install`
4. Start: `node index.js`
5. Add all env vars from `.env.example`

### Database → MongoDB Atlas
1. Create free cluster at mongodb.com/atlas
2. Allow all IPs: `0.0.0.0/0`
3. Copy connection string → `MONGO_URI`

---

## 🛠️ Tech Stack

| Layer      | Tech                              |
|------------|-----------------------------------|
| Frontend   | React 18, Vite, Tailwind CSS 3    |
| State      | Redux Toolkit                     |
| Real-time  | Socket.io (client)                |
| HTTP       | Axios                             |
| Backend    | Node.js, Express.js               |
| Real-time  | Socket.io (server)                |
| Database   | MongoDB + Mongoose                |
| Auth       | JWT + bcryptjs                    |
| Images     | Cloudinary (optional)             |
| Emoji      | emoji-picker-react                |
| Dates      | date-fns                          |
| Fonts      | DM Sans, Syne, JetBrains Mono     |

---

*ChatApp is a demo project. Passwords hashed with bcrypt, tokens expire in 7 days.*
