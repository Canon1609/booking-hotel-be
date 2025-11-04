const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const moment = require('moment-timezone');
const { v4: uuidv4 } = require('uuid');
const { generateOpenAPISpec, convertToGeminiFunctions } = require('./openapi.generator');
const { SERVER_URL } = require('../config/config');
const { ChatSession, User } = require('../models');
const { verifyToken } = require('../utils/jwt.util');

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-exp';
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

console.log(`✅ Gemini model configured: ${MODEL_NAME}`);

/**
 * Generate OpenAPI spec and convert to Gemini functions
 * This runs once at startup for public routes
 * User authenticated routes will be added dynamically when user is authenticated
 */
let openapiSpecPublic;
let geminiFunctionsPublic;
let functionMapPublic = {}; // Map operationId -> {method, path}

// User authenticated routes (generated dynamically)
let openapiSpecUser;
let geminiFunctionsUser;
let functionMapUser = {};

try {
  // Generate public routes
  openapiSpecPublic = generateOpenAPISpec(false);
  geminiFunctionsPublic = convertToGeminiFunctions(openapiSpecPublic);
  
  // Build function map for quick lookup
  for (const [path, methods] of Object.entries(openapiSpecPublic.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      functionMapPublic[operation.operationId] = {
        method: method.toUpperCase(),
        path: path,
        operation
      };
    }
  }
  
  // Generate user authenticated routes
  openapiSpecUser = generateOpenAPISpec(true);
  geminiFunctionsUser = convertToGeminiFunctions(openapiSpecUser);
  
  // Build user function map
  for (const [path, methods] of Object.entries(openapiSpecUser.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      functionMapUser[operation.operationId] = {
        method: method.toUpperCase(),
        path: path,
        operation
      };
    }
  }
  
  console.log(`✅ Generated ${geminiFunctionsPublic.length} public API tools`);
  console.log(`✅ Generated ${geminiFunctionsUser.length} user authenticated API tools`);
  console.log(`📋 Public tools:`, geminiFunctionsPublic.map(f => f.name).join(', '));
  console.log(`📋 User tools:`, geminiFunctionsUser.map(f => f.name).join(', '));
} catch (error) {
  console.error('❌ Error generating OpenAPI spec:', error);
  geminiFunctionsPublic = [];
  geminiFunctionsUser = [];
}

/**
 * Dynamic API Tool Executor
 * Executes function calls by making HTTP requests to the server's own API
 * @param {Object} functionCall - Function call from Gemini
 * @param {string} authToken - Optional authentication token
 */
async function executeApiTool(functionCall, authToken = null) {
  const { name, args } = functionCall;
  
  // Look up function in public map first, then user map
  let funcDef = functionMapPublic[name] || functionMapUser[name];
  if (!funcDef) {
    throw new Error(`Unknown function: ${name}`);
  }
  
  // Check if function requires auth but no token provided
  if (functionMapUser[name] && !authToken) {
    throw new Error(`Function ${name} requires authentication. Please login first.`);
  }
  
  const { method, path, operation } = funcDef;
  const baseUrl = SERVER_URL || 'http://localhost:5000';
  
  // Validate and fix date parameters (check_in, check_out)
  if (args) {
    const today = moment().tz('Asia/Ho_Chi_Minh');
    const currentYear = today.year();
    
    // Fix check_in date if it's in the past
    if (args.check_in) {
      let checkInDate = moment(args.check_in).tz('Asia/Ho_Chi_Minh');
      if (checkInDate.isValid() && checkInDate.isBefore(today, 'day')) {
        // Date is in the past, check if it's from previous year
        const checkInYear = checkInDate.year();
        if (checkInYear < currentYear) {
          // It's from a previous year, assume user means this year
          checkInDate = checkInDate.year(currentYear);
          // If still in the past, use next year
          if (checkInDate.isBefore(today, 'day')) {
            checkInDate = checkInDate.add(1, 'year');
          }
        } else {
          // Same year but past date, assume next year
          checkInDate = checkInDate.add(1, 'year');
        }
        args.check_in = checkInDate.format('YYYY-MM-DD');
        console.log(`📅 Fixed check_in date to: ${args.check_in}`);
      }
    }
    
    // Fix check_out date if it's in the past
    if (args.check_out) {
      let checkOutDate = moment(args.check_out).tz('Asia/Ho_Chi_Minh');
      if (checkOutDate.isValid() && checkOutDate.isBefore(today, 'day')) {
        const checkOutYear = checkOutDate.year();
        if (checkOutYear < currentYear) {
          checkOutDate = checkOutDate.year(currentYear);
          if (checkOutDate.isBefore(today, 'day')) {
            checkOutDate = checkOutDate.add(1, 'year');
          }
        } else {
          checkOutDate = checkOutDate.add(1, 'year');
        }
        args.check_out = checkOutDate.format('YYYY-MM-DD');
        console.log(`📅 Fixed check_out date to: ${args.check_out}`);
      }
    }
    
    // Ensure check_out is after check_in
    if (args.check_in && args.check_out) {
      const checkIn = moment(args.check_in);
      const checkOut = moment(args.check_out);
      if (checkOut.isSameOrBefore(checkIn, 'day')) {
        // If check_out is same or before check_in, add 1 day
        args.check_out = checkIn.add(1, 'day').format('YYYY-MM-DD');
        console.log(`📅 Fixed check_out to be after check_in: ${args.check_out}`);
      }
    }
  }
  
  // Build URL with path parameters
  let url = path;
  if (args) {
    // Replace path parameters (e.g., :id, :slug)
    for (const param of operation.parameters || []) {
      if (param.in === 'path' && args[param.name]) {
        url = url.replace(`:${param.name}`, args[param.name]);
      }
    }
    
    // Build query string from query parameters
    const queryParams = [];
    for (const param of operation.parameters || []) {
      if (param.in === 'query' && args[param.name] !== undefined && args[param.name] !== null) {
        queryParams.push(`${param.name}=${encodeURIComponent(args[param.name])}`);
      }
    }
    
    if (queryParams.length > 0) {
      url += '?' + queryParams.join('&');
    }
  }
  
  const fullUrl = `${baseUrl}${url}`;
  
  console.log(`🔧 Executing API tool: ${method} ${fullUrl}`);
  console.log(`📤 Args:`, JSON.stringify(args, null, 2));
  console.log(`🔐 Auth:`, authToken ? 'Yes (user authenticated)' : 'No (public)');
  
  // Build axios config with auth header if token provided
  const axiosConfig = {};
  if (authToken) {
    axiosConfig.headers = {
      'Authorization': `Bearer ${authToken}`
    };
  }
  
  try {
    let response;
    
    // Make HTTP request based on method
    switch (method) {
      case 'GET':
        response = await axios.get(fullUrl, axiosConfig);
        break;
      case 'POST':
        response = await axios.post(fullUrl, args.body || {}, axiosConfig);
        break;
      case 'PUT':
        response = await axios.put(fullUrl, args.body || {}, axiosConfig);
        break;
      case 'DELETE':
        response = await axios.delete(fullUrl, axiosConfig);
        break;
      case 'PATCH':
        response = await axios.patch(fullUrl, args.body || {}, axiosConfig);
        break;
      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
    
    console.log(`✅ API response status: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error(`❌ API call failed:`, error.message);
    if (error.response) {
      // Return error response from API
      return {
        error: true,
        status: error.response.status,
        message: error.response.data?.message || error.message,
        data: error.response.data
      };
    }
    throw error;
  }
}

/**
 * Get tools based on authentication status
 */
function getToolsForUser(hasAuth) {
  if (hasAuth) {
    // Return both public and user authenticated tools
    return [{
      functionDeclarations: [...geminiFunctionsPublic, ...geminiFunctionsUser]
    }];
  }
  // Return only public tools
  return [{
    functionDeclarations: geminiFunctionsPublic
  }];
}

/**
 * Helper function to create tool config based on model
 */
function createToolConfig(modelName) {
  // Use AUTO mode so Gemini can choose to answer directly or call functions
  // AUTO mode allows Gemini to decide when to use tools vs answer directly
  return {
    functionCallingConfig: {
      mode: 'AUTO' // AUTO allows Gemini to answer general questions without calling functions
    }
  };
}

/**
 * Save chat history to database
 * Returns the session_id (new or existing)
 */
async function saveChatHistory(sessionId, userId, existingHistory, userMessage, aiResponse) {
  try {
    // Build updated history
    const updatedHistory = [
      ...existingHistory,
      { role: 'user', text: userMessage },
      { role: 'ai', text: aiResponse }
    ];

    let chatSession;
    let finalSessionId = sessionId;
    
    if (sessionId) {
      // Update existing session
      chatSession = await ChatSession.findByPk(sessionId);
      if (chatSession) {
        chatSession.chat_history = updatedHistory;
        await chatSession.save();
        console.log(`✅ Updated session ${sessionId} with ${updatedHistory.length} messages`);
      } else {
        // Session not found, create new
        chatSession = await ChatSession.create({
          session_id: sessionId,
          user_id: userId,
          chat_history: updatedHistory
        });
        finalSessionId = sessionId;
        console.log(`✅ Created new session ${sessionId} with ${updatedHistory.length} messages`);
      }
    } else {
      // Create new session
      finalSessionId = uuidv4();
      chatSession = await ChatSession.create({
        session_id: finalSessionId,
        user_id: userId,
        chat_history: updatedHistory
      });
      console.log(`✅ Created new session ${finalSessionId} with ${updatedHistory.length} messages`);
    }
    
    return finalSessionId;
  } catch (error) {
    console.error('❌ Error saving chat history:', error);
    // Return sessionId if available, otherwise return null
    // Chat should still work even if DB save fails
    return sessionId || null;
  }
}

/**
 * Get last session ID for user (helper function)
 */
async function getLastSessionId(userId) {
  try {
    if (!userId) return null;
    const lastSession = await ChatSession.findOne({
      where: { user_id: userId },
      order: [['updated_at', 'DESC']]
    });
    return lastSession?.session_id || null;
  } catch (error) {
    console.error('❌ Error getting last session ID:', error);
    return null;
  }
}

/**
 * GET /api/chat/sessions
 * Get all chat sessions for authenticated user
 */
router.get('/chat/sessions', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Vui lòng đăng nhập để xem lịch sử chat',
        statusCode: 401
      });
    }

    const token = authHeader.split(' ')[1];
    let userId = null;
    try {
      const userInfo = verifyToken(token);
      userId = userInfo.id || userInfo.user_id;
    } catch (error) {
      return res.status(401).json({
        message: 'Token không hợp lệ',
        statusCode: 401
      });
    }

    const sessions = await ChatSession.findAll({
      where: { user_id: userId },
      order: [['updated_at', 'DESC']],
      attributes: ['session_id', 'created_at', 'updated_at', 'chat_history'],
      limit: 50 // Limit to last 50 sessions
    });

    // Format sessions to include preview
    const formattedSessions = sessions.map(session => {
      const history = session.chat_history || [];
      const firstMessage = history.find(msg => msg.role === 'user')?.text || '';
      const lastMessage = history[history.length - 1]?.text || '';
      
      return {
        session_id: session.session_id,
        created_at: session.created_at,
        updated_at: session.updated_at,
        message_count: history.length,
        preview: {
          first_message: firstMessage.substring(0, 100),
          last_message: lastMessage.substring(0, 100)
        }
      };
    });

    return res.status(200).json({
      message: 'Lấy danh sách sessions thành công',
      statusCode: 200,
      sessions: formattedSessions,
      total: formattedSessions.length
    });
  } catch (error) {
    console.error('Error getting chat sessions:', error);
    return res.status(500).json({
      message: 'Có lỗi xảy ra',
      statusCode: 500,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/sessions/by-user/:user_id
 * Get chat sessions by user id
 * - User (non-admin): chỉ xem được user_id của chính mình; nếu user_id === 'null' → trả rỗng
 * - Admin: xem được tất cả; nếu user_id === 'null' → trả sessions có user_id IS NULL; nếu 'all' → tất cả
 */
router.get('/chat/sessions/by-user/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'Vui lòng đăng nhập để xem lịch sử chat',
        statusCode: 401
      });
    }

    // Decode token
    let requesterId = null;
    let requesterRole = 'customer';
    try {
      const token = authHeader.split(' ')[1];
      const info = verifyToken(token);
      requesterId = info.id || info.user_id;
      requesterRole = info.role || 'customer';
    } catch (e) {
      return res.status(401).json({ message: 'Token không hợp lệ', statusCode: 401 });
    }

    const isAdmin = requesterRole === 'admin';

    // Non-admin can only access their own user_id, and never null/all
    if (!isAdmin) {
      if (user_id === 'null' || user_id === 'all') {
        return res.status(200).json({ message: 'OK', statusCode: 200, sessions: [], total: 0 });
      }
      if (String(requesterId) !== String(user_id)) {
        return res.status(403).json({ message: 'Bạn không có quyền xem lịch sử chat của user này', statusCode: 403 });
      }

      const sessions = await ChatSession.findAll({
        where: { user_id: requesterId },
        order: [['updated_at', 'DESC']],
        attributes: ['session_id', 'created_at', 'updated_at', 'chat_history']
      });

      return res.status(200).json({
        message: 'Lấy danh sách sessions thành công',
        statusCode: 200,
        sessions,
        total: sessions.length
      });
    }

    // Admin logic
    const where = {};
    if (user_id === 'null') {
      where.user_id = null;
    } else if (user_id === 'all') {
      // no filter
    } else {
      where.user_id = user_id;
    }

    const sessions = await ChatSession.findAll({
      where,
      order: [['updated_at', 'DESC']],
      attributes: ['session_id', 'user_id', 'created_at', 'updated_at', 'chat_history']
    });

    return res.status(200).json({
      message: 'Lấy danh sách sessions thành công',
      statusCode: 200,
      sessions,
      total: sessions.length
    });
  } catch (error) {
    console.error('Error getting chat sessions by user:', error);
    return res.status(500).json({
      message: 'Có lỗi xảy ra',
      statusCode: 500,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/sessions/:session_id
 * Get full chat history for a specific session
 */
router.get('/chat/sessions/:session_id', async (req, res) => {
  try {
    const { session_id } = req.params;
    const authHeader = req.headers.authorization;
    
    let userId = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const userInfo = verifyToken(token);
        userId = userInfo.id || userInfo.user_id;
      } catch (error) {
        // Continue as guest
      }
    }

    const session = await ChatSession.findByPk(session_id);
    if (!session) {
      return res.status(404).json({
        message: 'Không tìm thấy session',
        statusCode: 404
      });
    }

    // Check permission: user can only access their own sessions
    if (userId && session.user_id && session.user_id !== userId) {
      return res.status(403).json({
        message: 'Bạn không có quyền truy cập session này',
        statusCode: 403
      });
    }

    return res.status(200).json({
      message: 'Lấy lịch sử chat thành công',
      statusCode: 200,
      session: {
        session_id: session.session_id,
        user_id: session.user_id,
        created_at: session.created_at,
        updated_at: session.updated_at,
        chat_history: session.chat_history || []
      }
    });
  } catch (error) {
    console.error('Error getting chat session:', error);
    return res.status(500).json({
      message: 'Có lỗi xảy ra',
      statusCode: 500,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/chat/tools
 * List all available tools for debugging
 */
router.get('/chat/tools', (req, res) => {
  // Check if user is authenticated
  const authHeader = req.headers.authorization;
  const isAuthenticated = authHeader && authHeader.startsWith('Bearer ');
  
  const tools = isAuthenticated 
    ? [...geminiFunctionsPublic, ...geminiFunctionsUser]
    : geminiFunctionsPublic;
  
  const allPaths = isAuthenticated
    ? [...Object.keys(openapiSpecPublic?.paths || {}), ...Object.keys(openapiSpecUser?.paths || {})]
    : Object.keys(openapiSpecPublic?.paths || {});
  
  return res.status(200).json({
    message: 'Available API tools',
    statusCode: 200,
    authenticated: isAuthenticated,
    tools: {
      public: geminiFunctionsPublic.map(f => ({
        name: f.name,
        description: f.description
      })),
      user: isAuthenticated ? geminiFunctionsUser.map(f => ({
        name: f.name,
        description: f.description
      })) : []
    },
    openapi: {
      paths: allPaths,
      totalOperations: tools.length,
      publicOperations: geminiFunctionsPublic.length,
      userOperations: isAuthenticated ? geminiFunctionsUser.length : 0
    }
  });
});

/**
 * POST /api/chat
 * Main chat endpoint with dynamic function calling
 */
router.post('/chat', async (req, res) => {
  console.log('🚀 POST /api/chat endpoint called');
  console.log('📨 Request body:', JSON.stringify(req.body, null, 2));
  
  try {
    const { message, history = [], session_id } = req.body;
    console.log('📝 Message received:', message);
    console.log('📜 History length:', history.length);
    console.log('🆔 Session ID:', session_id || 'none (will create new)');
    
    // Extract authentication token from Authorization header
    const authHeader = req.headers.authorization;
    let authToken = null;
    let isAuthenticated = false;
    let userId = null;
    let userInfo = null;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      authToken = authHeader.split(' ')[1];
      try {
        userInfo = verifyToken(authToken);
        userId = userInfo.id || userInfo.user_id;
        isAuthenticated = true;
        console.log('🔐 User authenticated, user_id:', userId);
      } catch (tokenError) {
        console.log('⚠️ Invalid token, proceeding as guest');
      }
    } else {
      console.log('🔓 No authentication, using public tools only');
    }

    // Load or create chat session
    let chatSession = null;
    let currentSessionId = session_id;
    let chatHistoryFromDB = [];

    if (currentSessionId) {
      // Load existing session
      chatSession = await ChatSession.findByPk(currentSessionId);
      if (chatSession) {
        // Verify user owns this session (if authenticated)
        if (userId && chatSession.user_id && chatSession.user_id !== userId) {
          return res.status(403).json({
            message: 'Bạn không có quyền truy cập session này',
            statusCode: 403
          });
        }
        chatHistoryFromDB = chatSession.chat_history || [];
        console.log(`📂 Loaded session ${currentSessionId}, history length: ${chatHistoryFromDB.length}`);
      } else {
        console.log(`⚠️ Session ${currentSessionId} not found, will create new`);
        currentSessionId = null;
      }
    }

    // Use DB history if available, otherwise use request history
    const effectiveHistory = chatHistoryFromDB.length > 0 ? chatHistoryFromDB : history;

    if (!message || typeof message !== 'string') {
      console.log('❌ Invalid message format');
      return res.status(400).json({
        message: 'Vui lòng cung cấp message hợp lệ',
        statusCode: 400
      });
    }

    // Build chat history for Gemini
    const chatHistory = effectiveHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text || msg.content }]
    }));

    // System instruction for Gemini
    const systemInstruction = `Bạn là trợ lý AI thông minh cho hệ thống đặt phòng khách sạn. Nhiệm vụ của bạn:

1. **Khi cần thông tin cụ thể từ hệ thống** (như tìm phòng, tra cứu booking, thông tin khách sạn):
   - Sử dụng các function tools có sẵn để lấy dữ liệu chính xác
   - Sau khi có kết quả, trả lời một cách thân thiện và dễ hiểu bằng tiếng Việt

2. **Khi là câu hỏi chung, không cần dữ liệu từ hệ thống** (như hỏi về du lịch, ăn uống, địa điểm, lời khuyên):
   - Trả lời trực tiếp bằng kiến thức của bạn
   - Trả lời một cách thân thiện, hữu ích bằng tiếng Việt
   - Bạn có thể đưa ra lời khuyên, gợi ý về du lịch, ăn uống, văn hóa địa phương

3. **Luôn trả lời bằng tiếng Việt**, trừ khi người dùng yêu cầu ngôn ngữ khác.

4. **Khi người dùng nói "tới đây" hoặc chỉ nói ngày/tháng**, hãy hiểu là năm hiện tại (${new Date().getFullYear()}). Nếu ngày đã qua trong năm, dùng năm tiếp theo.`;

    // Get tools based on authentication status
    const tools = getToolsForUser(isAuthenticated);
    const toolConfig = createToolConfig(MODEL_NAME);
    
    const totalTools = isAuthenticated 
      ? geminiFunctionsPublic.length + geminiFunctionsUser.length 
      : geminiFunctionsPublic.length;
    
    console.log(`🔧 Starting chat with ${totalTools} available tools (${isAuthenticated ? 'authenticated' : 'public'})`);
    
    // Update system instruction if user is authenticated
    let finalSystemInstruction = systemInstruction;
    if (isAuthenticated) {
      finalSystemInstruction += `\n\n5. **User đã đăng nhập**: Bạn có thể giúp user tra cứu booking của chính họ, xem lịch sử đặt phòng, và các thông tin cá nhân khác.`;
    }
    
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: finalSystemInstruction }]
        },
        {
          role: 'model',
          parts: [{ text: isAuthenticated 
            ? 'Tôi hiểu rồi. Tôi sẽ giúp bạn với các câu hỏi về đặt phòng, tra cứu booking của bạn, và các câu hỏi chung khác.'
            : 'Tôi hiểu rồi. Tôi sẽ giúp bạn với các câu hỏi về đặt phòng và các câu hỏi chung khác. Bạn có thể đăng nhập để tra cứu booking của mình.' }]
        },
        ...chatHistory
      ],
      tools: tools,
      toolConfig: toolConfig
    });

    console.log('💬 Sending message to Gemini...');
    
    // Send message to Gemini
    const result = await chat.sendMessage(message);
    const response = await result.response;
    
    console.log('✅ Got response from Gemini');

    // Check if Gemini wants to call a function
    let functionCalls = response.functionCalls;
    
    // Try to find function calls in candidates if not in response
    if ((!functionCalls || functionCalls.length === 0) && response.candidates && response.candidates[0]?.content?.parts) {
      const parts = response.candidates[0].content.parts;
      const functionCallParts = parts.filter(part => part.functionCall);
      if (functionCallParts.length > 0) {
        console.log('🔍 Found function calls in candidates parts');
        functionCalls = functionCallParts.map(part => part.functionCall);
      }
    }

    if (functionCalls && functionCalls.length > 0) {
      console.log(`🔧 Function calls detected: ${functionCalls.length}`);
      
      // Process each function call
      const functionResults = [];

      for (const functionCall of functionCalls) {
        const name = functionCall.name || functionCall.function?.name;
        const args = functionCall.args || functionCall.function?.args || {};
        
        console.log(`📞 Calling function: ${name} with args:`, args);

        try {
          // Execute API tool dynamically with auth token if available
          const functionResult = await executeApiTool({ name, args }, authToken);
          
          console.log(`✅ Function result received`);
          
          functionResults.push({
            functionResponse: {
              name: name,
              response: functionResult
            }
          });
        } catch (error) {
          console.error(`❌ Error calling function ${name}:`, error);
          functionResults.push({
            functionResponse: {
              name: name,
              response: { 
                error: true,
                message: error.message || 'Function execution failed'
              }
            }
          });
        }
      }

      console.log(`📤 Sending function results back to Gemini...`);
      
      // Send function results back to Gemini as parts array
      const parts = functionResults.map(fr => ({
        functionResponse: {
          name: fr.functionResponse.name,
          response: fr.functionResponse.response
        }
      }));
      
      const followUpResult = await chat.sendMessage(parts);
      const followUpResponse = await followUpResult.response;

      // Get the final text response
      let finalText = '';
      try {
        finalText = followUpResponse.text();
        console.log(`📥 Final response text length: ${finalText.length}`);
      } catch (error) {
        console.error(`❌ Error getting text from response:`, error);
        if (followUpResponse.candidates && followUpResponse.candidates[0]) {
          const candidateParts = followUpResponse.candidates[0].content?.parts;
          if (candidateParts && candidateParts.length > 0) {
            finalText = candidateParts.map(part => part.text || '').join(' ');
          }
        }
      }

      // Fallback if response is empty
      if (!finalText || finalText.trim() === '') {
        console.warn(`⚠️ Response is empty, providing fallback message`);
        const firstResult = functionResults[0]?.functionResponse?.response;
        if (firstResult && typeof firstResult === 'object' && !firstResult.error) {
          finalText = `Đã thực hiện yêu cầu của bạn. Kết quả: ${JSON.stringify(firstResult, null, 2)}`;
        } else if (firstResult?.error) {
          finalText = `Xin lỗi, có lỗi xảy ra: ${firstResult.message || 'Không thể thực hiện yêu cầu'}`;
        } else {
          finalText = 'Đã xử lý yêu cầu của bạn.';
        }
      }

      // Save chat history to DB and get session_id
      const savedSessionId = await saveChatHistory(currentSessionId, userId, effectiveHistory, message, finalText);
      
      return res.status(200).json({
        message: 'Chat thành công',
        statusCode: 200,
        response: finalText,
        session_id: savedSessionId,
        functionCalls: functionCalls.map(fc => ({
          name: fc.name || fc.function?.name,
          args: fc.args || fc.function?.args || {}
        }))
      });
    } else {
      // Gemini responded with text directly (no function calls)
      console.log('📝 No function calls, Gemini responded with text directly');
      let text = '';
      try {
        text = response.text();
        console.log(`📥 Text response (${text.length} chars):`, text.substring(0, 200));
      } catch (error) {
        console.error('❌ Error getting text:', error);
        if (response.candidates && response.candidates[0]) {
          const parts = response.candidates[0].content?.parts;
          if (parts && parts.length > 0) {
            text = parts.map(part => part.text || '').join(' ');
          }
        }
      }

      if (!text || text.trim() === '') {
        console.warn('⚠️ Empty text response, trying to get response again...');
        
        // Try to extract from candidates if text() fails
        if (response.candidates && response.candidates[0]) {
          const parts = response.candidates[0].content?.parts;
          if (parts && parts.length > 0) {
            text = parts.map(part => {
              if (part.text) return part.text;
              return '';
            }).join(' ').trim();
          }
        }
        
        // If still empty, provide a helpful fallback
        if (!text || text.trim() === '') {
          text = 'Xin chào! Tôi có thể giúp bạn:\n- Tìm phòng trống\n- Tra cứu thông tin đặt phòng\n- Hỏi về khách sạn, du lịch, ăn uống\n- Và nhiều câu hỏi khác\n\nBạn muốn hỏi gì?';
        }
      }

      // Save chat history to DB and get session_id
      const savedSessionId = await saveChatHistory(currentSessionId, userId, effectiveHistory, message, text);
      
      return res.status(200).json({
        message: 'Chat thành công',
        statusCode: 200,
        response: text,
        session_id: savedSessionId
      });
    }
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    
    // Handle specific error cases
    if (error.status === 429) {
      return res.status(429).json({
        message: 'API đã vượt quá giới hạn request. Vui lòng thử lại sau vài giây.',
        statusCode: 429,
        error: 'Too Many Requests - Rate limit exceeded'
      });
    }
    
    return res.status(500).json({
      message: 'Có lỗi xảy ra khi xử lý chat',
      statusCode: 500,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
