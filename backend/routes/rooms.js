const express = require('express');
const Message = require('../models/Message');
const Room = require('../models/Room');
const router = express.Router();

// GET /api/rooms - Get available chat rooms
router.get('/', async (req, res) => {
  try {
    const { includePrivate = false, username } = req.query;
    
    // Get public rooms from Room model
    const publicRooms = await Room.getPublicRooms();
    
    // Get rooms from messages (legacy support)
    const messageRooms = await Message.distinct('room');
    
    // Combine and deduplicate
    const allRoomNames = [...new Set([
      ...publicRooms.map(r => r.name),
      ...messageRooms
    ])];
    
    const roomStats = await Promise.all(
      allRoomNames.map(async (roomName) => {
        // Check if room exists in Room model
        let roomDoc = await Room.findOne({ name: roomName });
        
        // Get message statistics
        const messageCount = await Message.countDocuments({ room: roomName });
        const lastMessage = await Message.findOne({ room: roomName })
          .sort({ timestamp: -1 })
          .select('username text timestamp')
          .lean();
        
        // If room doesn't exist in Room model, create basic info
        if (!roomDoc) {
          return {
            name: roomName,
            displayName: roomName.charAt(0).toUpperCase() + roomName.slice(1).replace(/-/g, ' '),
            messageCount,
            lastMessage,
            isActive: messageCount > 0,
            isPrivate: false,
            canJoin: true
          };
        }
        
        // Check if user can join private rooms
        let canJoin = true;
        if (roomDoc.isPrivate && username) {
          const joinCheck = roomDoc.canUserJoin(username);
          canJoin = joinCheck.canJoin;
        }
        
        return {
          name: roomDoc.name,
          displayName: roomDoc.displayName,
          description: roomDoc.description,
          messageCount,
          lastMessage,
          isActive: roomDoc.isActive,
          isPrivate: roomDoc.isPrivate,
          canJoin,
          memberCount: roomDoc.userCount,
          inviteCode: roomDoc.isPrivate && canJoin ? roomDoc.inviteCode : undefined
        };
      })
    );
    
    // Filter private rooms if not requested
    let filteredRooms = roomStats;
    if (!includePrivate) {
      filteredRooms = roomStats.filter(room => !room.isPrivate || room.canJoin);
    }
    
    // Sort by activity (message count and last activity)
    filteredRooms.sort((a, b) => {
      if (a.messageCount === 0 && b.messageCount === 0) {
        return a.name.localeCompare(b.name);
      }
      return b.messageCount - a.messageCount;
    });
    
    res.json({
      success: true,
      data: {
        rooms: filteredRooms,
        totalRooms: filteredRooms.length
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
    const { name, description, isPrivate = false, password, createdBy } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Room name is required'
      });
    }
    
    if (!createdBy || !createdBy.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Creator username is required'
      });
    }
    
    const roomName = name.trim().toLowerCase().replace(/\s+/g, '-');
    const displayName = name.trim();
    
    // Check if room already exists
    const existingRoom = await Room.findOne({ name: roomName });
    if (existingRoom) {
      return res.status(409).json({
        success: false,
        error: 'Room already exists'
      });
    }
    
    // Create room document
    const roomData = {
      name: roomName,
      displayName,
      description: description?.trim() || '',
      isPrivate: Boolean(isPrivate),
      createdBy: createdBy.trim(),
      password: password?.trim() || undefined
    };
    
    const room = new Room(roomData);
    
    // Generate invite code for private rooms
    if (isPrivate) {
      room.generateInviteCode();
      // Add creator as admin member
      room.addMember(createdBy.trim(), 'admin');
    }
    
    await room.save();
    
    // Create initial system message for the room
    const welcomeText = isPrivate 
      ? `Welcome to ${displayName}! This is a private room. ${description || 'Start chatting!'}`
      : `Welcome to ${displayName}! ${description || 'Start chatting!'}`;
      
    const welcomeMessage = await Message.create({
      username: 'System',
      text: welcomeText,
      room: roomName,
      messageType: 'system',
      socketId: 'system'
    });
    
    // Update room message count
    room.messageCount = 1;
    room.lastActivity = new Date();
    await room.save();
    
    const responseRoom = {
      name: room.name,
      displayName: room.displayName,
      description: room.description,
      isPrivate: room.isPrivate,
      messageCount: room.messageCount,
      createdAt: room.createdAt,
      inviteCode: room.isPrivate ? room.inviteCode : undefined
    };
    
    // Emit room creation to all connected clients (only for public rooms)
    if (req.app.get('io')) {
      if (!isPrivate) {
        req.app.get('io').emit('room_created', {
          room: responseRoom,
          message: `New room "${displayName}" has been created!`,
          timestamp: new Date()
        });
      } else {
        // Only notify the creator for private rooms
        req.app.get('io').emit('private_room_created', {
          room: responseRoom,
          createdBy: createdBy.trim(),
          message: `Private room "${displayName}" created. Invite code: ${room.inviteCode}`,
          timestamp: new Date()
        });
      }
    }
    
    res.status(201).json({
      success: true,
      data: {
        room: responseRoom
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

// POST /api/rooms/join - Join a private room with invite code or password
router.post('/join', async (req, res) => {
  try {
    const { roomName, username, inviteCode, password } = req.body;
    
    if (!roomName || !username) {
      return res.status(400).json({
        success: false,
        error: 'Room name and username are required'
      });
    }
    
    // Find the room
    const room = await Room.findOne({ name: roomName, isActive: true });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }
    
    // Check if user can join
    const joinCheck = room.canUserJoin(username, inviteCode, password);
    
    if (!joinCheck.canJoin) {
      return res.status(403).json({
        success: false,
        error: joinCheck.reason
      });
    }
    
    // Add user to room members if it's a private room
    if (room.isPrivate) {
      await room.addMember(username);
    }
    
    // Update room activity
    await room.updateActivity();
    
    res.json({
      success: true,
      data: {
        room: {
          name: room.name,
          displayName: room.displayName,
          description: room.description,
          isPrivate: room.isPrivate
        },
        message: `Successfully joined ${room.displayName}`
      }
    });
    
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to join room'
    });
  }
});

// GET /api/rooms/invite/:inviteCode - Get room info by invite code
router.get('/invite/:inviteCode', async (req, res) => {
  try {
    const { inviteCode } = req.params;
    
    const room = await Room.findByInviteCode(inviteCode);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Invalid invite code'
      });
    }
    
    res.json({
      success: true,
      data: {
        room: {
          name: room.name,
          displayName: room.displayName,
          description: room.description,
          memberCount: room.userCount,
          createdBy: room.createdBy
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching room by invite code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room information'
    });
  }
});
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