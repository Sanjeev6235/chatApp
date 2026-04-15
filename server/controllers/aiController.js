const { asyncHandler, AppError } = require('../middleware/error');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// In-memory conversation history per user (userId -> messages[])
const conversationHistory = new Map();

const SYSTEM_PROMPT = `You are Aria, a friendly and helpful AI assistant integrated into ChatApp. 
You are warm, conversational, and concise. You can help users with:
- Answering questions on any topic
- Writing, editing, and brainstorming
- Coding help and debugging
- General advice and recommendations
- Casual conversation

Keep your responses friendly and appropriately concise. Use markdown formatting when helpful (code blocks, lists, etc).
You're chatting through a messaging app, so adapt your tone to be conversational.`;

const ALLOWED_MODELS = new Set([
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
]);

exports.chat = asyncHandler(async (req, res) => {
  const { message, conversationId, model: reqModel } = req.body;
  const userId = req.user._id.toString();
  const model = ALLOWED_MODELS.has(reqModel) ? reqModel : 'llama-3.3-70b-versatile';

  if (!message || !message.trim()) {
    throw new AppError('Message is required', 400);
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new AppError('AI service is not configured. Please add GROQ_API_KEY to server .env', 503);
  }

  // Get or initialize conversation history for this user
  const historyKey = `${userId}-${conversationId || 'default'}`;
  if (!conversationHistory.has(historyKey)) {
    conversationHistory.set(historyKey, []);
  }
  const history = conversationHistory.get(historyKey);

  // Add user message to history
  history.push({ role: 'user', content: message.trim() });

  // Keep history to last 20 messages to avoid token limits
  const recentHistory = history.slice(-20);

  const payload = {
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      ...recentHistory,
    ],
    max_tokens: 1024,
    temperature: 0.7,
  };

  const groqRes = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${groqKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!groqRes.ok) {
    const errData = await groqRes.json().catch(() => ({}));
    console.error('Groq API error:', errData);
    throw new AppError(
      errData?.error?.message || 'AI service error. Check your GROQ_API_KEY.',
      groqRes.status === 401 ? 401 : 502
    );
  }

  const data = await groqRes.json();
  const aiReply = data.choices?.[0]?.message?.content;

  if (!aiReply) {
    throw new AppError('No response from AI service', 502);
  }

  // Add AI response to history
  history.push({ role: 'assistant', content: aiReply });

  // Trim stored history to avoid memory leaks
  if (history.length > 40) {
    history.splice(0, history.length - 40);
  }

  res.json({
    success: true,
    reply: aiReply,
    model: data.model || 'llama-3.3-70b-versatile',
  });
});

exports.clearHistory = asyncHandler(async (req, res) => {
  const userId = req.user._id.toString();
  const { conversationId } = req.body;
  const historyKey = `${userId}-${conversationId || 'default'}`;
  conversationHistory.delete(historyKey);
  res.json({ success: true, message: 'Conversation history cleared' });
});
