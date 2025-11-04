/**
 * OpenAPI Generator - Dynamically generates OpenAPI 3.0 spec from Express routes
 * This module scans public route files and generates tool definitions for Gemini AI
 */

const fs = require('fs');
const path = require('path');

/**
 * Public API routes allow-list
 * Only routes in these files will be exposed to the AI
 */
const PUBLIC_ROUTE_FILES = [
  'src/routes/roomRoutes.js',
  'src/routes/hotelRoutes.js',
  'src/routes/postRoutes.js',
  'src/routes/categoryRoutes.js'
];

/**
 * Protected routes for authenticated users (not admin-only)
 * These routes require user authentication but are available to regular users
 */
const USER_AUTHENTICATED_ROUTE_FILES = [
  'src/routes/bookingRoutes.js'
];

/**
 * Parse Express route file and extract route definitions
 * @param {string} filePath - Path to route file
 * @param {string} basePath - Base API path (e.g., '/api/rooms')
 * @returns {Array} Array of route definitions
 */
function parseRouteFile(filePath, basePath, includeProtected = false) {
  const routes = [];
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Extract route definitions using regex
  // Match: router.METHOD('path', handler) or router.METHOD('path', middleware, handler)
  const routeRegex = /router\.(get|post|put|delete|patch)\s*\(['"`]([^'"`]+)['"`]\s*,\s*([^)]+)\)/g;
  const lines = content.split('\n');
  
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    let routePath = match[2];
    const handlers = match[3] || '';
    
    // Get the full line to check for protect/adminOnly
    const lineNumber = content.substring(0, match.index).split('\n').length;
    const fullLine = lines[lineNumber] || '';
    
    const hasProtect = handlers.includes('protect') || fullLine.includes('protect');
    const hasAdminOnly = handlers.includes('adminOnly') || fullLine.includes('adminOnly');
    
    // If not including protected routes, skip all protected routes
    if (!includeProtected) {
      if (hasProtect || hasAdminOnly) {
        continue; // Skip protected routes
      }
    } else {
      // If including protected routes, only include user routes (protect but not adminOnly)
      if (hasAdminOnly) {
        continue; // Skip admin-only routes
      }
      // Include routes with protect (user authenticated routes)
    }
    
    // Build full path
    const fullPath = `${basePath}${routePath}`;
    
    // Generate operationId from path and method
    const operationId = generateOperationId(fullPath, method);
    
    // Extract parameters from path (e.g., :id, :slug)
    const pathParams = extractPathParams(routePath);
    const queryParams = inferQueryParams(filePath, routePath, method);
    
    routes.push({
      method,
      path: fullPath,
      routePath,
      operationId,
      pathParams,
      queryParams,
      description: generateDescription(filePath, routePath, method),
      requiresAuth: hasProtect && !hasAdminOnly // Mark as requires user authentication
    });
  }
  
  return routes;
}

/**
 * Extract path parameters (e.g., :id, :slug)
 */
function extractPathParams(path) {
  const params = [];
  const paramRegex = /:(\w+)/g;
  let match;
  
  while ((match = paramRegex.exec(path)) !== null) {
    params.push({
      name: match[1],
      in: 'path',
      required: true,
      schema: { type: 'string' },
      description: `${match[1]} identifier`
    });
  }
  
  return params;
}

/**
 * Infer query parameters based on common patterns
 */
function inferQueryParams(filePath, routePath, method) {
  const params = [];
  
  // Common query parameters based on route patterns
  if (routePath === '/' || routePath.includes('search') || routePath.includes('availability')) {
    params.push(
      { name: 'page', in: 'query', required: false, schema: { type: 'integer', default: 1 }, description: 'Page number' },
      { name: 'limit', in: 'query', required: false, schema: { type: 'integer', default: 10 }, description: 'Items per page' }
    );
  }
  
  if (routePath.includes('availability')) {
    const currentYear = new Date().getFullYear();
    params.push(
      { name: 'check_in', in: 'query', required: true, schema: { type: 'string', format: 'date' }, description: `Check-in date (YYYY-MM-DD format). QUAN TRỌNG: Khi người dùng nói "tới đây" hoặc chỉ nói ngày/tháng (ví dụ: "20/11"), hãy dùng năm hiện tại (${currentYear}). Nếu ngày đã qua trong năm hiện tại, dùng năm tiếp theo. Ví dụ: hôm nay là tháng 12/${currentYear}, "20/11 tới đây" = ${currentYear + 1}-11-20.` },
      { name: 'check_out', in: 'query', required: true, schema: { type: 'string', format: 'date' }, description: `Check-out date (YYYY-MM-DD format). QUAN TRỌNG: Khi người dùng nói "tới đây" hoặc chỉ nói ngày/tháng, hãy dùng năm hiện tại (${currentYear}). Nếu ngày đã qua, dùng năm tiếp theo.` },
      { name: 'guests', in: 'query', required: false, schema: { type: 'integer' }, description: 'Number of guests' },
      { name: 'hotel_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Hotel ID filter' },
      { name: 'room_type_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Room type ID filter' },
      { name: 'min_price', in: 'query', required: false, schema: { type: 'number' }, description: 'Minimum price' },
      { name: 'max_price', in: 'query', required: false, schema: { type: 'number' }, description: 'Maximum price' },
      { name: 'sort', in: 'query', required: false, schema: { type: 'string', enum: ['price_asc', 'price_desc'] }, description: 'Sort order' }
    );
  }
  
  if (filePath.includes('roomRoutes.js') && routePath === '/') {
    params.push(
      { name: 'hotel_id', in: 'query', required: false, schema: { type: 'integer' }, description: 'Filter by hotel ID' }
    );
  }
  
  return params;
}

/**
 * Generate operationId from path and method
 */
function generateOperationId(path, method) {
  // Remove leading slash and replace params with descriptive names
  let opId = path
    .replace(/^\//, '')
    .replace(/\/api\//, '')
    .replace(/:/g, '')
    .replace(/\//g, '_')
    .replace(/-/g, '_');
  
  // Convert to camelCase
  const parts = opId.split('_');
  opId = parts[0] + parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
  
  // Add method prefix if needed
  if (method !== 'GET') {
    opId = method.toLowerCase() + opId.charAt(0).toUpperCase() + opId.slice(1);
  }
  
  return opId;
}

/**
 * Generate description for route
 */
function generateDescription(filePath, routePath, method) {
  const resource = filePath.includes('room') ? 'room' : 
                   filePath.includes('hotel') ? 'hotel' :
                   filePath.includes('post') ? 'post' :
                   filePath.includes('category') ? 'category' :
                   filePath.includes('booking') ? 'booking' : 'resource';
  
  // Special handling for booking routes
  if (filePath.includes('booking')) {
    if (routePath === '/my-bookings') {
      return 'Lấy lịch sử đặt phòng của user hiện tại. Chỉ trả về các booking của chính user đã đăng nhập.';
    }
    if (routePath.includes('/code/')) {
      return 'Tra cứu thông tin đặt phòng theo mã booking code. QUAN TRỌNG: User thường chỉ có thể tra cứu booking code của chính mình. Admin có thể tra cứu bất kỳ booking code nào.';
    }
    if (routePath.includes(':id')) {
      return 'Lấy thông tin chi tiết của một booking theo ID. User chỉ có thể xem booking của chính mình.';
    }
    if (routePath.includes('temp-booking')) {
      return 'Tạo booking tạm thời (giữ chỗ) trước khi thanh toán.';
    }
    if (routePath.includes('cancel')) {
      return 'Hủy booking. User chỉ có thể hủy booking của chính mình.';
    }
    if (routePath.includes('payment-link')) {
      return 'Tạo link thanh toán PayOS cho booking.';
    }
  }
  
  if (routePath === '/') {
    return `Get list of ${resource}s`;
  }
  
  if (routePath.includes('availability') || routePath.includes('search')) {
    return `Search for available ${resource}s based on criteria`;
  }
  
  if (routePath.includes(':id') || routePath.includes(':slug')) {
    return `Get ${resource} by ID or slug`;
  }
  
  return `${method} operation for ${resource}`;
}

/**
 * Generate OpenAPI 3.0 specification from all public routes
 * @param {boolean} includeUserRoutes - Include user authenticated routes (not admin-only)
 */
function generateOpenAPISpec(includeUserRoutes = false) {
  const paths = {};
  const basePaths = {
    'src/routes/roomRoutes.js': '/api/rooms',
    'src/routes/hotelRoutes.js': '/api/hotels',
    'src/routes/postRoutes.js': '/api/posts',
    'src/routes/categoryRoutes.js': '/api/categories',
    'src/routes/bookingRoutes.js': '/api/bookings'
  };
  
  // Parse all public route files
  for (const filePath of PUBLIC_ROUTE_FILES) {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`Warning: Route file not found: ${filePath}`);
      continue;
    }
    
    const basePath = basePaths[filePath] || '/api';
    const routes = parseRouteFile(fullPath, basePath, false);
    
    // Add routes to OpenAPI paths
    for (const route of routes) {
      if (!paths[route.path]) {
        paths[route.path] = {};
      }
      
      const operation = {
        operationId: route.operationId,
        summary: route.description,
        description: route.description,
        tags: [route.path.split('/')[2] || 'api'],
        parameters: [...route.pathParams, ...route.queryParams],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object'
                }
              }
            }
          },
          '404': {
            description: 'Not found'
          },
          '500': {
            description: 'Server error'
          }
        }
      };
      
      // Add request body for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Request body'
              }
            }
          }
        };
      }
      
      paths[route.path][route.method.toLowerCase()] = operation;
    }
  }
  
  // Parse user authenticated routes if requested
  if (includeUserRoutes) {
    for (const filePath of USER_AUTHENTICATED_ROUTE_FILES) {
      const fullPath = path.join(process.cwd(), filePath);
      if (!fs.existsSync(fullPath)) {
        console.warn(`Warning: Route file not found: ${filePath}`);
        continue;
      }
      
      const basePath = basePaths[filePath] || '/api';
      const routes = parseRouteFile(fullPath, basePath, true); // Include protected routes
      
      // Add routes to OpenAPI paths
      for (const route of routes) {
        if (!paths[route.path]) {
          paths[route.path] = {};
        }
        
        const operation = {
          operationId: route.operationId,
          summary: route.description,
          description: route.description + ' (Yêu cầu đăng nhập)',
          tags: [route.path.split('/')[2] || 'api'],
          parameters: [...route.pathParams, ...route.queryParams],
          security: [{ bearerAuth: [] }], // Mark as requiring authentication
          responses: {
            '200': {
              description: 'Successful response',
              content: {
                'application/json': {
                  schema: {
                    type: 'object'
                  }
                }
              }
            },
            '401': {
              description: 'Unauthorized - Token required'
            },
            '404': {
              description: 'Not found'
            },
            '500': {
              description: 'Server error'
            }
          }
        };
        
        // Add request body for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
          operation.requestBody = {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'Request body'
                }
              }
            }
          };
        }
        
        paths[route.path][route.method.toLowerCase()] = operation;
      }
    }
  }
  
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'Hotel Booking API',
      version: '1.0.0',
      description: 'Public API endpoints available for AI chatbot'
    },
    servers: [
      {
        url: process.env.SERVER_URL || 'http://localhost:5000',
        description: 'Development server'
      }
    ],
    paths
  };
  
  // Add security definitions if user routes are included
  if (includeUserRoutes) {
    spec.components = {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    };
  }
  
  return spec;
}

/**
 * Convert OpenAPI spec to Gemini function declarations
 */
function convertToGeminiFunctions(openapiSpec) {
  const functions = [];
  
  for (const [path, methods] of Object.entries(openapiSpec.paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      const params = {
        type: 'OBJECT',
        properties: {},
        required: []
      };
      
      // Add path parameters
      if (operation.parameters) {
        for (const param of operation.parameters) {
          if (param.in === 'path') {
            params.properties[param.name] = {
              type: param.schema.type.toUpperCase(),
              description: param.description || `${param.name} parameter`
            };
            params.required.push(param.name);
          } else if (param.in === 'query') {
            params.properties[param.name] = {
              type: param.schema.type === 'integer' ? 'NUMBER' : 
                    param.schema.type === 'number' ? 'NUMBER' :
                    'STRING',
              description: param.description || `${param.name} query parameter`
            };
            if (param.required) {
              params.required.push(param.name);
            }
          }
        }
      }
      
      // Add request body for POST/PUT/PATCH
      if (operation.requestBody) {
        params.properties.body = {
          type: 'OBJECT',
          description: 'Request body data (JSON object)'
        };
      }
      
      // Enhance description for date-related operations
      let enhancedDescription = operation.description || operation.summary || `Call ${method.toUpperCase()} ${path}`;
      
      // Add date handling instructions for availability/search operations
      if (operation.operationId.includes('availability') || operation.operationId.includes('search')) {
        const currentYear = new Date().getFullYear();
        enhancedDescription += ` QUAN TRỌNG: Khi người dùng nói "tới đây" hoặc chỉ nói ngày/tháng (ví dụ: "20/11"), hãy dùng năm hiện tại (${currentYear}). Nếu ngày đã qua trong năm hiện tại (so với hôm nay), tự động dùng năm tiếp theo. Ví dụ: nếu hôm nay là tháng 12/${currentYear} và người dùng nói "20/11 tới đây", hãy dùng ${currentYear + 1}-11-20.`;
      }
      
      functions.push({
        name: operation.operationId,
        description: enhancedDescription,
        parameters: params
      });
    }
  }
  
  return functions;
}

module.exports = {
  generateOpenAPISpec,
  convertToGeminiFunctions,
  PUBLIC_ROUTE_FILES
};

