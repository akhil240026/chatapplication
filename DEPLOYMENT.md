# Deployment Guide

This guide covers deploying the real-time chat application to production using Render (backend) and Vercel (frontend).

## Prerequisites

- GitHub account
- Render account (free tier available)
- Vercel account (free tier available)
- MongoDB Atlas account (free tier available)

## Backend Deployment (Render)

### 1. Setup MongoDB Atlas

1. Create a MongoDB Atlas account at https://www.mongodb.com/atlas
2. Create a new cluster (free M0 tier)
3. Create a database user with read/write permissions
4. Whitelist all IP addresses (0.0.0.0/0) for Render
5. Get your connection string: `mongodb+srv://username:password@cluster.mongodb.net/chatapp`

### 2. Deploy to Render

1. Push your backend code to GitHub
2. Go to https://render.com and create a new Web Service
3. Connect your GitHub repository
4. Configure the service:
   - **Name**: `chat-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`

5. Add environment variables:
   ```
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
   FRONTEND_URL=https://your-frontend-domain.vercel.app
   ```

6. Deploy and wait for the build to complete
7. Note your backend URL: `https://your-backend-name.onrender.com`

### 3. Test Backend Deployment

Visit `https://your-backend-name.onrender.com/api/health` to verify the server is running.

## Frontend Deployment (Vercel)

### 1. Update Environment Variables

Update `frontend/.env.production`:
```
REACT_APP_API_URL=https://your-backend-name.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend-name.onrender.com
```

### 2. Deploy to Vercel

1. Push your frontend code to GitHub
2. Go to https://vercel.com and import your project
3. Configure the project:
   - **Framework Preset**: Create React App
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

4. Add environment variables in Vercel dashboard:
   ```
   REACT_APP_API_URL=https://your-backend-name.onrender.com/api
   REACT_APP_SOCKET_URL=https://your-backend-name.onrender.com
   ```

5. Deploy and wait for the build to complete
6. Note your frontend URL: `https://your-project-name.vercel.app`

### 3. Update Backend CORS

Update the `FRONTEND_URL` environment variable in Render with your Vercel URL:
```
FRONTEND_URL=https://your-project-name.vercel.app
```

Redeploy the backend service.

## Post-Deployment Configuration

### 1. Test the Application

1. Visit your Vercel URL
2. Create a username and join the chat
3. Open another browser/incognito window
4. Test real-time messaging between users
5. Test room switching and user lists

### 2. Monitor Performance

- **Render**: Check logs and metrics in the Render dashboard
- **Vercel**: Monitor function invocations and build times
- **MongoDB Atlas**: Monitor database performance and usage

### 3. Custom Domain (Optional)

#### For Vercel (Frontend):
1. Go to your project settings in Vercel
2. Add your custom domain
3. Configure DNS records as instructed

#### For Render (Backend):
1. Go to your service settings in Render
2. Add your custom domain
3. Configure DNS records as instructed

## Environment Variables Reference

### Backend (Render)
```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

### Frontend (Vercel)
```
REACT_APP_API_URL=https://your-backend-domain.onrender.com/api
REACT_APP_SOCKET_URL=https://your-backend-domain.onrender.com
```

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `FRONTEND_URL` is correctly set in backend
   - Check that both HTTP and HTTPS URLs are handled
   - Verify Vercel domain is correct

2. **Socket.IO Connection Failed**
   - Check that `REACT_APP_SOCKET_URL` points to backend
   - Ensure WebSocket connections are allowed
   - Try different transport methods

3. **Database Connection Issues**
   - Verify MongoDB Atlas connection string
   - Check IP whitelist includes 0.0.0.0/0
   - Ensure database user has correct permissions

4. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are in package.json
   - Review build logs for specific errors

### Debugging Steps

1. **Check Service Logs**
   - Render: View logs in service dashboard
   - Vercel: Check function logs and build logs

2. **Test API Endpoints**
   ```bash
   curl https://your-backend.onrender.com/api/health
   ```

3. **Test Socket.IO Connection**
   - Use browser dev tools Network tab
   - Look for WebSocket connection attempts
   - Check for CORS or connection errors

4. **Monitor Database**
   - Check MongoDB Atlas metrics
   - Verify connection count and queries

## Performance Optimization

### Backend (Render)
- Use connection pooling for MongoDB
- Implement caching for frequently accessed data
- Add compression middleware
- Monitor memory usage and optimize

### Frontend (Vercel)
- Optimize bundle size with code splitting
- Use React.memo for expensive components
- Implement lazy loading for routes
- Add service worker for offline support

### Database (MongoDB Atlas)
- Create indexes for frequently queried fields
- Monitor slow queries and optimize
- Use aggregation pipelines efficiently
- Consider read replicas for scaling

## Security Considerations

1. **Environment Variables**
   - Never commit secrets to version control
   - Use different secrets for production
   - Rotate secrets regularly

2. **CORS Configuration**
   - Restrict origins to known domains
   - Don't use wildcards in production
   - Validate all origins

3. **Rate Limiting**
   - Implement rate limiting on API endpoints
   - Add Socket.IO connection limits
   - Monitor for abuse patterns

4. **Input Validation**
   - Validate all user inputs
   - Sanitize message content
   - Implement message length limits

## Scaling Considerations

### Horizontal Scaling
- Use Redis for session storage
- Implement Socket.IO Redis adapter
- Load balance multiple server instances

### Database Scaling
- Use MongoDB sharding
- Implement read replicas
- Consider caching layers

### CDN and Caching
- Use Vercel's built-in CDN
- Implement API response caching
- Cache static assets aggressively

## Monitoring and Alerts

1. **Application Monitoring**
   - Set up error tracking (Sentry)
   - Monitor response times
   - Track user engagement metrics

2. **Infrastructure Monitoring**
   - Monitor server resources
   - Set up uptime monitoring
   - Track database performance

3. **Alerts**
   - Set up alerts for service downtime
   - Monitor error rates
   - Track unusual traffic patterns