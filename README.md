# Real-Time Chat Application - MERN + Socket.IO

A complete, production-ready real-time chat application built with the MERN stack and Socket.IO.

## 🚀 Features

### Core Functionality
- **Real-time messaging** with Socket.IO
- **Multiple chat rooms** with room switching
- **Online user tracking** with live user lists
- **Typing indicators** showing who's currently typing
- **Message persistence** with MongoDB
- **Message history** loading on join
- **User join/leave notifications**

### Advanced Features
- **Room management** - create and switch between rooms
- **Input validation** - client and server-side validation
- **Error handling** - comprehensive error management
- **Rate limiting** - prevent spam and abuse
- **Responsive design** - works on desktop and mobile
- **Connection status** - visual connection indicators
- **Auto-reconnection** - handles network interruptions

### Technical Features
- **Production-ready** deployment configuration
- **Security** - CORS, input sanitization, rate limiting
- **Performance** - optimized for scalability
- **Monitoring** - health checks and logging
- **Documentation** - comprehensive guides and API docs

## 🛠 Tech Stack

### Frontend
- **React** - UI framework with hooks and functional components
- **Socket.IO Client** - real-time communication
- **Axios** - HTTP client for REST API calls
- **CSS3** - modern styling with flexbox and animations

### Backend
- **Node.js** - JavaScript runtime
- **Express** - web application framework
- **Socket.IO** - real-time bidirectional communication
- **MongoDB** - NoSQL database for message storage
- **Mongoose** - MongoDB object modeling

### Deployment
- **Vercel** - frontend hosting with global CDN
- **Render** - backend hosting with auto-scaling
- **MongoDB Atlas** - cloud database hosting

## 📋 Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- MongoDB (local or Atlas)
- Git

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <repository-url>
cd chat-app
```

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MongoDB URI
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
# Edit .env with your backend URL
npm start
```

### 4. Open Your Browser
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api/health

## 📁 Project Structure

```
chat-app/
├── backend/                 # Node.js + Express + Socket.IO server
│   ├── config/             # Database configuration
│   ├── middleware/         # Custom middleware (auth, logging, etc.)
│   ├── models/             # MongoDB schemas
│   ├── routes/             # REST API routes
│   └── server.js           # Main server file
├── frontend/               # React application
│   ├── public/             # Static files
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── services/       # API and Socket services
│   │   ├── utils/          # Utility functions
│   │   └── App.js          # Main React component
├── DEPLOYMENT.md           # Deployment guide
├── TESTING_CHECKLIST.md    # Testing checklist
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
```

## 🌐 API Documentation

### REST Endpoints

#### Health Check
```
GET /api/health
Response: { status: "Server is running!", timestamp: "...", uptime: 123 }
```

#### Messages
```
GET /api/messages?room=general&limit=50&page=1
GET /api/messages/recent?room=general
DELETE /api/messages/:id
GET /api/messages/stats?room=general
```

#### Rooms
```
GET /api/rooms
POST /api/rooms
GET /api/rooms/:roomName/messages
```

### Socket.IO Events

#### Client to Server
- `user_join` - Join chat with username and room
- `send_message` - Send a message to current room
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator

#### Server to Client
- `receive_message` - New message received
- `user_joined` - User joined notification
- `user_left` - User left notification
- `online_users` - Current online users list
- `users_update` - Updated users list
- `user_typing` - Typing indicator update
- `error` - Error message

## 🧪 Testing

Run the comprehensive testing checklist:

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Manual testing
# Follow TESTING_CHECKLIST.md
```

## 🚀 Deployment

### Production Deployment

1. **Backend (Render)**
   - Deploy to Render with MongoDB Atlas
   - Configure environment variables
   - Set up health checks

2. **Frontend (Vercel)**
   - Deploy to Vercel with automatic builds
   - Configure environment variables
   - Set up custom domain (optional)

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## 🔒 Security Features

- **Input validation** on client and server
- **Rate limiting** to prevent spam
- **CORS configuration** for secure cross-origin requests
- **Environment variables** for sensitive data
- **Error handling** without exposing internals
- **XSS protection** with input sanitization

## 📈 Performance Optimizations

- **Connection pooling** for database
- **Message pagination** for large histories
- **Efficient re-renders** with React.memo
- **Auto-reconnection** for network issues
- **CDN delivery** for static assets
- **Compression** for API responses

## 🛠 Development

### Available Scripts

#### Backend
```bash
npm start          # Start production server
npm run dev        # Start development server with nodemon
```

#### Frontend
```bash
npm start          # Start development server
npm run build      # Build for production
npm test           # Run tests
```

### Code Style
- ESLint configuration for consistent code style
- Prettier for code formatting
- Conventional commits for git messages

## 🐛 Troubleshooting

### Common Issues

1. **Connection Failed**
   - Check if backend server is running
   - Verify CORS configuration
   - Check environment variables

2. **Messages Not Appearing**
   - Verify Socket.IO connection
   - Check browser console for errors
   - Ensure users are in the same room

3. **Database Errors**
   - Check MongoDB connection string
   - Verify database permissions
   - Check network connectivity

See [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for detailed troubleshooting.

## 🔮 Future Enhancements

### Planned Features
- **File sharing** - upload and share images/files
- **Private messaging** - direct messages between users
- **Message reactions** - emoji reactions to messages
- **User profiles** - avatars and status messages
- **Push notifications** - browser notifications for new messages
- **Message search** - search through chat history
- **Moderation tools** - admin controls and user management

### Technical Improvements
- **Redis integration** - for session storage and scaling
- **Microservices** - split into smaller services
- **GraphQL API** - more efficient data fetching
- **PWA features** - offline support and app-like experience
- **End-to-end encryption** - secure message encryption
- **Voice/video calls** - WebRTC integration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Socket.IO team for excellent real-time communication library
- MongoDB team for robust database solution
- React team for powerful UI framework
- Vercel and Render for excellent hosting platforms

## 📞 Support

If you have any questions or need help:

1. Check the [TESTING_CHECKLIST.md](TESTING_CHECKLIST.md) for common issues
2. Review the [DEPLOYMENT.md](DEPLOYMENT.md) for deployment help
3. Open an issue on GitHub
4. Check the documentation for API details

---

**Built with ❤️ using the MERN stack and Socket.IO**