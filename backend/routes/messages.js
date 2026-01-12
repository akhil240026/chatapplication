const express = require('express');
const Message = require('../models/Message');
const router = express.Router();

// GET /api/messages - Fetch chat history
router.get('/', async (req, res) => {
  try {
    const { room = 'general', limit = 50, page = 1 } = req.query;
    
    // Calculate skip for pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Fetch messages with pagination
    const messages = await Message.find({ room })
      .sort({ timestamp: -1 }) // Newest first
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v') // Exclude version field
      .lean(); // Return plain objects for better performance
    
    // Reverse to show oldest first in chat
    const orderedMessages = messages.reverse();
    
    // Get total count for pagination info
    const totalMessages = await Message.countDocuments({ room });
    const totalPages = Math.ceil(totalMessages / parseInt(limit));
    
    res.json({
      success: true,
      data: {
        messages: orderedMessages,
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
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// GET /api/messages/recent - Get recent messages (last 24 hours)
router.get('/recent', async (req, res) => {
  try {
    const { room = 'general' } = req.query;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const recentMessages = await Message.find({
      room,
      timestamp: { $gte: twentyFourHoursAgo }
    })
      .sort({ timestamp: 1 }) // Oldest first
      .select('-__v')
      .lean();
    
    res.json({
      success: true,
      data: {
        messages: recentMessages,
        count: recentMessages.length
      }
    });
    
  } catch (error) {
    console.error('Error fetching recent messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent messages'
    });
  }
});

// DELETE /api/messages/:id - Delete a message (admin feature)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedMessage = await Message.findByIdAndDelete(id);
    
    if (!deletedMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// GET /api/messages/stats - Get chat statistics
router.get('/stats', async (req, res) => {
  try {
    const { room = 'general' } = req.query;
    
    const stats = await Message.aggregate([
      { $match: { room } },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          uniqueUsers: { $addToSet: '$username' },
          firstMessage: { $min: '$timestamp' },
          lastMessage: { $max: '$timestamp' }
        }
      },
      {
        $project: {
          _id: 0,
          totalMessages: 1,
          uniqueUserCount: { $size: '$uniqueUsers' },
          uniqueUsers: 1,
          firstMessage: 1,
          lastMessage: 1
        }
      }
    ]);
    
    res.json({
      success: true,
      data: stats[0] || {
        totalMessages: 0,
        uniqueUserCount: 0,
        uniqueUsers: [],
        firstMessage: null,
        lastMessage: null
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

module.exports = router;