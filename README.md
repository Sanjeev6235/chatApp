# 💬 ChatApp — Real-Time MERN Chat Application

![MERN](https://img.shields.io/badge/MERN-Stack-green)
![Socket.io](https://img.shields.io/badge/RealTime-Socket.io-black)
![License](https://img.shields.io/badge/License-MIT-blue)
![Status](https://img.shields.io/badge/Status-Active-success)

A full-stack, production-grade **real-time chat application** built using the **MERN Stack (MongoDB, Express, React, Node.js)** with **Socket.io** for real-time communication and a modern UI powered by Tailwind CSS.

---

## 🌐 Live Demo

- 🔗 Frontend: _Add your Vercel link here_
- 🔗 Backend: _Add your Render link here_

---

## 📸 Screenshots

> Add screenshots or GIFs here to showcase your UI

---

## ✨ Features

### ⚡ Real-Time Features
- Instant messaging (Socket.io)
- Typing indicators
- Online / Offline user presence
- Message seen & delivered status (✓✓)
- Live message editing & deletion
- Real-time emoji reactions
- Friend request notifications

---

### 💬 Chat Features
- 1-to-1 private messaging
- Image sharing (Base64 / Cloudinary)
- Reply to messages
- Emoji picker integration
- Infinite scroll (chat history)
- User search functionality
- Unread message count

---

### 👤 User Features
- JWT Authentication (Login/Register)
- User profile (avatar, bio, username)
- Friend system (send / accept / reject / remove)
- Dark / Light mode (auto detect system theme)

---

## 📁 Project Structure

chatapp/
├── server/ # Backend (Node.js + Express + Socket.io)
│ ├── controllers/
│ ├── middleware/
│ ├── models/
│ ├── routes/
│ ├── socket/
│ ├── utils/
│ └── index.js
│
└── client/ # Frontend (React + Vite + Tailwind CSS)
├── src/
├── public/
└── index.html


---

## ⚙️ Installation & Setup

### 📌 Prerequisites
- Node.js v18+
- MongoDB (Atlas or Local)
- Cloudinary account (optional)

---

### 🔧 Backend Setup

```bash
cd server
npm install
cp .env.example .env
Edit .env file:

PORT=5000
NODE_ENV=development

MONGO_URI=your_mongodb_connection_string

JWT_SECRET=your_super_secret_key
JWT_EXPIRE=7d

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

CLIENT_URL=http://localhost:5173
Run backend server:

npm run dev
🎨 Frontend Setup
cd client
npm install
npm run dev
Frontend: http://localhost:5173

Backend: http://localhost:5000

👨‍💻 Demo Accounts
Username	Email	Password
alice	alice@demo.com	demo1234
bob	bob@demo.com	demo1234
charlie	charlie@demo.com	demo1234
🔌 API Reference
Base URL: http://localhost:5000/api
Auth: Authorization: Bearer <token>

🔐 Auth Routes
POST /auth/register

POST /auth/login

GET /auth/me

👤 User Routes
GET /users

PUT /users/profile

POST /users/friend-request/:id

POST /users/accept-request/:id

DELETE /users/friend/:id

💬 Message Routes
GET /messages/:userId

POST /messages/:userId

PUT /messages/:messageId

DELETE /messages/:messageId

POST /messages/:messageId/react

🔄 Socket.io Events
Client → Server
sendMessage

typing

messageSeen

editMessage

deleteMessage

reactToMessage

Server → Client
receiveMessage

messageEdited

messageDeleted

messageReacted

typing

userOnline

userOffline

🚀 Deployment
🔹 Frontend (Vercel)
Build Command: npm run build

Output Directory: dist

🔹 Backend (Render)
Build Command: npm install

Start Command: node index.js

🔹 Database
MongoDB Atlas (Free Tier)

🛠️ Tech Stack
Frontend
React (Vite)

Tailwind CSS

Redux Toolkit

Backend
Node.js

Express.js

MongoDB + Mongoose

Real-Time
Socket.io

Other Tools
JWT Authentication

Cloudinary (image upload)

Axios

emoji-picker-react

date-fns

📌 Future Improvements
👥 Group Chat Feature

🎥 Video / Voice Calling (WebRTC)

🤖 AI Chat Integration

📱 Mobile App (React Native)

🔐 End-to-End Encryption

🤝 Contributing
Contributions are welcome!

Fork → Clone → Create Branch → Commit → Push → Pull Request
📜 License
This project is licensed under the MIT License.

🙋‍♂️ Author
Sanjeev Kumar
💻 MERN Stack Developer
🚀 Passionate about building real-world applications