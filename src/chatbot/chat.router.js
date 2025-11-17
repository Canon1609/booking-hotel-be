const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');
const moment = require('moment-timezone');
const { generateOpenAPISpec, convertToGeminiFunctions } = require('./openapi.generator');
const { SERVER_URL, INTERNAL_API_URL } = require('../config/config');
const { SYSTEM_INSTRUCTION } = require('../config/hotel.knowledge');
const { ChatSession, User } = require('../models');
const { verifyToken } = require('../utils/jwt.util');

const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-2.0-flash-exp';
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  systemInstruction: SYSTEM_INSTRUCTION
});

console.log(`✅ Gemini model configured: ${MODEL_NAME}`);
console.log(`🌐 SERVER_URL for chatbot API calls: ${SERVER_URL || 'http://localhost:5000'}`);
console.log(`🔗 INTERNAL_API_URL for chatbot (Docker internal): ${INTERNAL_API_URL || 'not set (will use SERVER_URL)'}`);

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
  // Only require auth if the function exists ONLY in user map (not public)
  if (!authToken && functionMapUser[name] && !functionMapPublic[name]) {
    // Return error response instead of throwing, so Gemini can handle it gracefully
    return {
      error: true,
      status: 401,
      message: 'Bạn cần đăng nhập để sử dụng chức năng này. Vui lòng đăng nhập trước.',
      requiresAuth: true
    };
  }
  
  const { method, path, operation } = funcDef;
  
  // Priority: INTERNAL_API_URL (Docker internal) > SERVER_URL > localhost
  // INTERNAL_API_URL is used for internal Docker network calls (app:5000)
  // This ensures chatbot can call APIs without going through public URL which may have auth issues
  const internalApiUrl = INTERNAL_API_URL || null;
  const configuredServerUrl = SERVER_URL || 'http://localhost:5000';
  
  // Build base URLs list with priority: INTERNAL_API_URL first, then SERVER_URL, then localhost
  const baseUrls = [];
  if (internalApiUrl) {
    baseUrls.push(internalApiUrl);
  }
  baseUrls.push(configuredServerUrl);
  if (configuredServerUrl !== 'http://localhost:5000') {
    baseUrls.push('http://localhost:5000');
  }
  // Remove duplicates
  const uniqueBaseUrls = [...new Set(baseUrls)].filter(Boolean);
  
  console.log(`🌐 INTERNAL_API_URL (Docker): ${internalApiUrl || 'not set'}`);
  console.log(`🌐 SERVER_URL (public): ${configuredServerUrl}`);
  console.log(`🌐 Base URLs to try (priority order): ${uniqueBaseUrls.join(', ')}`);
  
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
  
  // Build axios config with auth header if token provided
  const axiosConfig = {};
  if (authToken) {
    axiosConfig.headers = {
      'Authorization': `Bearer ${authToken}`
    };
  }
  
  const errors = [];
  let attempt = 0;
  
  for (const baseUrl of uniqueBaseUrls) {
    attempt += 1;
    const sanitizedBaseUrl = baseUrl.replace(/\/$/, '');
    const fullUrl = `${sanitizedBaseUrl}${url}`;
    
    console.log(`🔧 Executing API tool (attempt ${attempt}/${uniqueBaseUrls.length}): ${method} ${fullUrl}`);
    console.log(`📤 Args:`, JSON.stringify(args, null, 2));
    console.log(`🔐 Auth:`, authToken ? 'Yes (user authenticated)' : 'No (public)');
    
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
      
      console.log(`✅ API response status (${fullUrl}): ${response.status}`);
      // Detect accidental HTML (frontend) response instead of JSON API
      const contentType = (response.headers && (response.headers['content-type'] || response.headers['Content-Type'])) || '';
      const isHtml = typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<!doctype html');
      if (contentType.includes('text/html') || isHtml) {
        console.error(`⚠️ Received HTML instead of JSON from ${fullUrl}. This likely points to the frontend domain. Will try next base URL if available.`);
        errors.push({
          baseUrl: sanitizedBaseUrl,
          url: fullUrl,
          error: { message: 'Received HTML instead of JSON (likely wrong SERVER_URL domain)' }
        });
        if (attempt < uniqueBaseUrls.length) {
          console.log(`🔁 Trying next base URL due to HTML response (remaining attempts: ${uniqueBaseUrls.length - attempt})`);
          continue;
        }
        return {
          error: true,
          status: 500,
          message: 'SERVER_URL có thể đang trỏ tới domain frontend (trả HTML). Hãy dùng API domain.',
          attempts: errors.map(e => ({
            baseUrl: e.baseUrl,
            status: e.error.response?.status || e.error.code || 'HTML',
            message: e.error.response?.data?.message || e.error.message || 'HTML response'
          }))
        };
      }
      return response.data;
    } catch (error) {
      console.error(`❌ API call failed on ${fullUrl}:`, error.message);
      console.error(`❌ Full error:`, error);
      
      errors.push({
        baseUrl: sanitizedBaseUrl,
        url: fullUrl,
        error
      });
      
      // If there are more base URLs to try, continue loop
      if (attempt < uniqueBaseUrls.length) {
        console.log(`🔁 Trying next base URL (remaining attempts: ${uniqueBaseUrls.length - attempt})`);
        continue;
      }
      
      // If this was the last attempt and error has response, format and return
      if (error.response) {
        return {
          error: true,
          status: error.response.status,
          message: error.response.data?.message || error.message,
          data: error.response.data,
          attempts: errors.map(e => ({
            baseUrl: e.baseUrl,
            status: e.error.response?.status || e.error.code || 'UNKNOWN',
            message: e.error.response?.data?.message || e.error.message
          }))
        };
      }
      
      // Network errors or connection issues
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('localhost')) {
        console.error(`⚠️ WARNING: API call to ${fullUrl} failed. Check SERVER_URL configuration!`);
        return {
          error: true,
          status: 500,
          message: `Không thể kết nối đến server. Vui lòng kiểm tra cấu hình SERVER_URL. (Attempted: ${fullUrl})`,
          data: null,
          attempts: errors.map(e => ({
            baseUrl: e.baseUrl,
            status: e.error.response?.status || e.error.code || 'UNKNOWN',
            message: e.error.response?.data?.message || e.error.message
          }))
        };
      }
      
      throw error;
    }
  }
  
  // Fallback in case no baseUrl could be used successfully
  if (errors.length > 0) {
    return {
      error: true,
      status: errors[errors.length - 1].error.response?.status || errors[errors.length - 1].error.code || 500,
      message: errors.map(e => `${e.baseUrl}: ${e.error.response?.data?.message || e.error.message}`).join(' | '),
      attempts: errors.map(e => ({
        baseUrl: e.baseUrl,
        status: e.error.response?.status || e.error.code || 'UNKNOWN',
        message: e.error.response?.data?.message || e.error.message
      }))
    };
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

  // For unauthenticated users, still expose authenticated tools so the AI knows they exist
  // The actual API call will enforce authentication inside executeApiTool
  return [{
    functionDeclarations: [...geminiFunctionsPublic, ...geminiFunctionsUser]
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
      // Create new session (dynamic import for ESM-only uuid)
      const { v4: uuidv4 } = await import('uuid');
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

    // Get tools based on authentication status
    const tools = getToolsForUser(isAuthenticated);
    const toolConfig = createToolConfig(MODEL_NAME);
    
    const totalTools = isAuthenticated 
      ? geminiFunctionsPublic.length + geminiFunctionsUser.length 
      : geminiFunctionsPublic.length;
    
    console.log(`🔧 Starting chat with ${totalTools} available tools (${isAuthenticated ? 'authenticated' : 'public'})`);
    
    const chat = model.startChat({
      history: chatHistory,
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
          // Format error message for better user experience
          let errorMessage = error.message || 'Không thể thực hiện yêu cầu';
          if (error.message && error.message.includes('authentication')) {
            errorMessage = 'Bạn cần đăng nhập để sử dụng chức năng này. Vui lòng đăng nhập trước.';
          } else if (error.message && error.message.includes('ECONNREFUSED')) {
            errorMessage = 'Không thể kết nối đến server. Vui lòng thử lại sau.';
          }
          
          functionResults.push({
            functionResponse: {
              name: name,
              response: { 
                error: true,
                status: error.status || 500,
                message: errorMessage,
                requiresAuth: error.message && error.message.includes('authentication')
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
          // If we have successful results, format them nicely
          if (firstResult.rooms && Array.isArray(firstResult.rooms)) {
            const roomCount = firstResult.rooms.length;
            const roomsInfo = firstResult.rooms.map(room => {
              let priceText = 'Liên hệ';
              if (room.prices?.[0]?.price_per_night) {
                const price = parseFloat(room.prices[0].price_per_night);
                priceText = new Intl.NumberFormat('vi-VN').format(price) + ' VNĐ/đêm';
              }
              return `- Phòng ${room.room_num} (${room.room_type}): ${priceText} - ${room.hotel_name || room.name || 'Khách sạn'}`;
            }).join('\n');
            finalText = `Tôi đã tìm thấy ${roomCount} phòng phù hợp:\n\n${roomsInfo}\n\nBạn có muốn đặt phòng nào không?`;
          } else if (firstResult.data && Array.isArray(firstResult.data)) {
            finalText = `Tôi đã tìm thấy ${firstResult.data.length} kết quả. ${JSON.stringify(firstResult.data.slice(0, 3), null, 2)}`;
          } else {
            finalText = `Đã thực hiện yêu cầu của bạn. Kết quả: ${JSON.stringify(firstResult, null, 2)}`;
          }
        } else if (firstResult?.error) {
          // Handle authentication errors specifically
          if (firstResult.requiresAuth || firstResult.message?.includes('đăng nhập')) {
            finalText = `Để tra cứu thông tin đặt phòng, bạn cần đăng nhập trước. Sau khi đăng nhập, tôi sẽ có thể truy cập thông tin chi tiết về đặt phòng của bạn. Bạn muốn đăng nhập ngay bây giờ không?`;
          } else {
            finalText = `Xin lỗi, có lỗi xảy ra khi tìm kiếm: ${firstResult.message || 'Không thể thực hiện yêu cầu'}. Vui lòng thử lại hoặc cung cấp thêm thông tin.`;
          }
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
            text = parts.map(part => {
              if (part.text) return part.text;
              return '';
            }).join(' ').trim();
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
