const express = require('express');
const Message = require('../models/Message');
const router = express.Router();

// GET /api/rooms - Get available chat rooms
router.get('/', async (req, res) => {
  try {
    // Get distinct rooms from messages
    const rooms = await Message.distinct('room');
    
    // Get room statistics
    const roomStats = await Promise.all(
      rooms.map(async (room) => {
        const messageCount = await Message.countDocuments({ room });
        const lastMessage = await Message.findOne({ room })
          .sort({ timestamp: -1 })
          .select('username text timestamp')
          .lean();
        
        return {
          name: room,
          messageCount,
          lastMessage,
          isActive: messageCount > 0
        };
      })
    );
    
    // Sort by activity (message count)
    roomStats.sort((a, b) => b.messageCount - a.messageCount);
    
    res.json({
      success: true,
      data: {
        rooms: roomStats,
        totalRooms: roomStats.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rooms'
    });
  }
});

// POST /api/rooms - Create a new room
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Room name is required'
      });
    }
    
    const roomName = name.trim().toLowerCase().replace(/\s+/g, '-');
    
    // Check if room already exists
    const existingRoom = await Message.findOne({ room: roomName });
    
    if (existingRoom) {
      return res.status(409).json({
        success: false,
        error: 'Room already exists'
      });
    }
    
    // Create initial system message for the room
    const welcomeMessage = await Message.create({
      username: 'System',
      text: `Welcome to ${name}! ${description || 'Start chatting!'}`,
      room: roomName,
      messageType: 'system',
      socketId: 'system'
    });
    
    const roomData = {
      name: roomName,
      displayName: name,
      description,
      messageCount: 1,
      createdAt: welcomeMessage.timestamp
    };
    
    // Emit room creation to all connected clients
    if (req.app.get('io')) {
      req.app.get('io').emit('room_created', {
        room: roomData,
        message: `New room "${name}" has been created!`,
        timestamp: new Date()
      });
    }
    
    res.status(201).json({
      success: true,
      data: {
        room: roomData
      }
    });
    
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create room'
    });
  }
});

// GET /api/rooms/:roomName/messages - Get messages for a specific room
router.get('/:roomName/messages', async (req, res) => {
  try {
    const { roomName } = req.params;
    const { limit = 50, page = 1 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const messages = await Message.find({ room: roomName })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v')
      .lean();
    
    const totalMessages = await Message.countDocuments({ room: roomName });
    const totalPages = Math.ceil(totalMessages / parseInt(limit));
    
    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        room: roomName,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalMessages,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching room messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room messages'
    });
  }
});

module.exports = router;