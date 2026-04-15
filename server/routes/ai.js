const router = require('express').Router();
const { chat, clearHistory } = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

// POST /api/ai/chat — send message to AI
router.post('/chat', protect, chat);

// POST /api/ai/clear — clear conversation history
router.post('/clear', protect, clearHistory);

module.exports = router;
