const express = require('express');
const router = express.Router();
const aiCoachService = require('../services/aiCoachService');
const authenticateToken = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const { validateTrainingPlanPreferences, validateUserId } = require('../middleware/validation');

// Rate limiter for AI plan generation (expensive API calls)
const aiPlanRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each user to 5 AI plan generations per hour
  message: { 
    error: 'Too many AI training plan requests',
    message: 'You can generate up to 5 AI training plans per hour. Please try again later.',
    retryAfter: '1 hour'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP using ipKeyGenerator for IPv6 safety
    return req.user?.id || rateLimit.keyGeneratorIpFallback(req);
  }
});

// General rate limiter for other AI coach endpoints
const generalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each user to 30 requests per 15 minutes
  message: { 
    error: 'Too many requests',
    message: 'Please slow down and try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Generate recommendations for user
router.post('/generate/:userId', authenticateToken, validateUserId, generalRateLimiter, async (req, res) => {
  try {
    const recommendations = await aiCoachService.generateRecommendations(req.params.userId);
    res.json(recommendations);
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get active recommendations
router.get('/recommendations/:userId', authenticateToken, validateUserId, generalRateLimiter, async (req, res) => {
  try {
    const recommendations = await aiCoachService.getRecommendations(req.params.userId);
    res.json(recommendations);
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Mark recommendation as read
router.put('/recommendations/:recommendationId/read', authenticateToken, generalRateLimiter, async (req, res) => {
  try {
    await aiCoachService.markAsRead(req.params.recommendationId);
    res.json({ message: 'Recommendation marked as read' });
  } catch (error) {
    console.error('Error marking recommendation as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// Dismiss recommendation
router.delete('/recommendations/:recommendationId', authenticateToken, generalRateLimiter, async (req, res) => {
  try {
    await aiCoachService.dismissRecommendation(req.params.recommendationId);
    res.json({ message: 'Recommendation dismissed' });
  } catch (error) {
    console.error('Error dismissing recommendation:', error);
    res.status(500).json({ error: 'Failed to dismiss recommendation' });
  }
});

// Get weekly summary
router.get('/summary/:userId/weekly', authenticateToken, validateUserId, generalRateLimiter, async (req, res) => {
  try {
    const summary = await aiCoachService.generateWeeklySummary(req.params.userId);
    res.json(summary);
  } catch (error) {
    console.error('Error generating weekly summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// Generate AI-powered personalized training plan (with strict rate limiting and validation)
router.post('/generate-plan/:userId', authenticateToken, validateUserId, validateTrainingPlanPreferences, aiPlanRateLimiter, async (req, res) => {
  try {
    const { preferences } = req.body;
    const trainingPlan = await aiCoachService.generateAITrainingPlan(req.params.userId, preferences || {});
    res.json(trainingPlan);
  } catch (error) {
    console.error('Error generating AI training plan:', error);
    res.status(500).json({ 
      error: 'Failed to generate AI training plan', 
      details: error.message,
      suggestion: error.message.includes('timeout') ? 'Please try again in a few moments' : null
    });
  }
});

// In-memory conversation storage (per user)
const userConversations = new Map();

// Helper function to handle short inputs intelligently
function preprocessUserInput(input, conversationHistory) {
  const lowerInput = input.toLowerCase().trim();
  
  // Handle very short/generic responses
  if (lowerInput === 'yes' || lowerInput === 'yeah' || lowerInput === 'ok') {
    return 'User agreed. Continue with the next step or provide more detailed guidance based on our previous conversation.';
  }
  
  if (lowerInput === 'no' || lowerInput === 'nope') {
    return 'User declined. Offer an alternative approach or ask what they would prefer instead.';
  }
  
  if (lowerInput === 'hi' || lowerInput === 'hello' || lowerInput === 'hey') {
    return 'User is greeting me. Respond casually and warmly, then ask how I can help with their running journey.';
  }
  
  if (lowerInput === 'thanks' || lowerInput === 'thank you') {
    return 'User thanked me. Acknowledge warmly and offer continued support.';
  }
  
  return input;
}

// Helper function to format AI response with proper line breaks
function formatAIResponse(text) {
  if (!text) return text;
  
  let formatted = text;
  
  // Add newline after section headings (## Heading)
  formatted = formatted.replace(/(## .+)/g, '$1\n');
  
  // Separate bullet points that are on same line (• item • item)
  formatted = formatted.replace(/•/g, '\n•');
  
  // Separate numbered items that are on same line (1. x 2. y)
  formatted = formatted.replace(/(\d+\.\s)/g, '\n$1');
  
  // Remove multiple consecutive newlines (keep max 2)
  formatted = formatted.replace(/\n{3,}/g, '\n\n');
  
  // Trim whitespace
  formatted = formatted.trim();
  
  return formatted;
}

// AI Coach Chat - Interactive Q&A with Context
router.post('/chat', authenticateToken, generalRateLimiter, async (req, res) => {
  try {
    const { userId, question, context, conversationHistory } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Get user data for personalized responses
    const userData = await aiCoachService.getUserAnalytics(userId);
    
    // Preprocess short inputs
    const processedQuestion = preprocessUserInput(question, conversationHistory);
    
    // Initialize or retrieve conversation history
    if (!userConversations.has(userId)) {
      userConversations.set(userId, []);
    }
    
    const userHistory = userConversations.get(userId);
    
    // Build messages array with full conversation context
    const messages = [
      {
        role: 'system',
        content: `You are a smart and engaging AI fitness assistant.

RESPONSE GUIDELINES:
- Do NOT repeat the same response structure every time
- Avoid repeating "Welcome" in every reply
- Make responses slightly different each time
- Expand answers with useful details (not too short)
- Use bullet points only when helpful for clarity
- If user continues conversation, build on previous answer
- Keep answers engaging and natural (like a human coach)
- Always give at least 3 useful points or expand explanation slightly
- Use flexible structure depending on the question

FORMATTING (when appropriate):
- Use **bold** for important keywords
- Use bullet points for lists of tips/features
- Use numbered lists ONLY for step-by-step instructions
- Add blank lines between sections for readability
- Keep paragraphs concise (2-3 lines max)

When user says simple words like "hi", "yes", "no":
- Respond casually and naturally, not with full structured format
- Keep it conversational and friendly

User Profile:
- Fitness Level: ${userData.fitness_level || 'beginner'}
- Total Runs: ${context?.totalRuns || 0}
- Average Pace: ${context?.avgPace || 'N/A'} min/km
- Total Distance: ${context?.totalDistance || 0} km

Be encouraging, specific, and adapt your tone to the conversation flow.`
      }
    ];
    
    // Add conversation history (last 10 messages for context)
    const recentHistory = userHistory.slice(-10);
    recentHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add current user message
    messages.push({
      role: 'user',
      content: processedQuestion
    });
    
    // Call Groq API with conversation context
    const Groq = require('groq-sdk');
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      temperature: 0.8  // Slightly higher for more varied responses
    });

    let answer = completion.choices[0]?.message?.content || 'I couldn\'t process that. Try asking about training, nutrition, or running tips!';
    
    // Format the response
    answer = formatAIResponse(answer);
    
    // Store conversation in memory
    userHistory.push(
      { role: 'user', content: question },
      { role: 'assistant', content: answer }
    );
    
    // Keep only last 20 messages to prevent memory issues
    if (userHistory.length > 20) {
      userConversations.set(userId, userHistory.slice(-20));
    }

    res.json({ answer });
  } catch (error) {
    console.error('AI Coach chat error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      answer: 'Sorry, I\'m having trouble right now. Please try again later.'
    });
  }
});

module.exports = router;
