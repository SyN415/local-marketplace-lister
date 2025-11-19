# Backend Authentication Implementation

This document outlines the complete Supabase authentication integration implemented for the backend.

## Overview

The authentication system provides a complete solution for user management including signup, login, logout, password reset, and user profile management. It integrates with Supabase for authentication and user data storage.

## Implemented Components

### 1. Authentication Service (`backend/src/services/auth.service.ts`)

**Features:**
- User registration with email/password
- User login with email/password
- JWT token generation and verification
- Logout functionality
- Password reset requests
- Token refresh functionality

**Key Methods:**
- `signup(request: SignupRequest)` - Register new user
- `login(request: LoginRequest)` - Authenticate user
- `logout(token: string)` - Logout user
- `getCurrentUser(token: string)` - Get current session
- `requestPasswordReset(request: PasswordResetRequest)` - Password reset

### 2. Authentication Middleware (`backend/src/middleware/auth.middleware.ts`)

**Middleware Functions:**
- `verifyToken` - Verify JWT token and extract user
- `requireAuth` - Ensure user is authenticated
- `requireAdmin` - Require admin role
- `requireOwnership` - Check resource ownership
- `optionalAuth` - Optional authentication
- `extractToken` - Extract token from request
- `validateRequiredFields` - Validate request body fields

### 3. User Service (`backend/src/services/user.service.ts`)

**Features:**
- Create and manage user profiles
- Get user profile information
- Update user profile data
- Search users
- Get paginated user lists
- Update user avatar
- Profile data validation

### 4. Authentication Routes (`backend/src/routes/auth.routes.ts`)

**RESTful API Endpoints:**

#### Public Endpoints
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/reset-password` - Request password reset
- `GET /api/auth/health` - Health check

#### Protected Endpoints (require authentication)
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile
- `DELETE /api/auth/account` - Delete user account

#### Token Management
- `POST /api/auth/refresh` - Refresh authentication token

## API Request/Response Examples

### Signup Request
```bash
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe",
  "phone": "+1234567890"
}
```

### Login Request
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Protected Request
```bash
GET /api/auth/me
Authorization: Bearer <your-jwt-token>
```

## Authentication Flow

1. **Signup/Login**: User provides credentials
2. **Token Generation**: System generates JWT token
3. **Token Storage**: Frontend stores token (localStorage/cookies)
4. **Protected Requests**: Include token in Authorization header
5. **Token Verification**: Middleware verifies token on protected routes
6. **Logout**: Token is invalidated

## TypeScript Types

### Auth Types (`backend/src/types/auth.types.ts`)
- `User` - Supabase user object
- `UserProfile` - Extended user profile data
- `SessionUser` - Complete user session with profile
- `LoginRequest` / `SignupRequest` - Request body types
- `AuthResponse` - Authentication response format
- `ApiResponse<T>` - Generic API response wrapper

## Configuration

### Environment Variables
```env
# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Security
JWT_SECRET=your-jwt-secret-key
COOKIE_SECRET=your-cookie-secret-key
```

### Supabase Client (`backend/src/config/supabase.ts`)
- Configured with service key for server-side operations
- Auto-refresh disabled for server context
- Session persistence disabled

## Security Features

### JWT Token Management
- Custom JWT tokens generated with user ID and email
- 24-hour token expiry
- Secure token verification
- Token refresh mechanism

### Input Validation
- Email format validation
- Password strength requirements
- Profile data validation
- Required field validation

### Error Handling
- Consistent error responses
- Security-conscious error messages
- Proper HTTP status codes
- Comprehensive error logging

## Database Schema

### User Profiles Table (`user_profiles`)
```sql
- id (uuid, primary key)
- user_id (uuid, foreign key to auth.users)
- full_name (text)
- avatar_url (text)
- bio (text)
- phone (text)
- location (text)
- created_at (timestamp)
- updated_at (timestamp)
```

## Usage Examples

### Frontend Integration
```javascript
// Login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { success, data, error } = await response.json();
if (success) {
  localStorage.setItem('token', data.session.access_token);
}

// Protected API call
const getUser = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
};
```

### Error Handling
```javascript
try {
  const response = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  const data = await response.json();
  
  if (!data.success) {
    switch (data.error) {
      case 'Invalid or expired token':
        // Redirect to login
        break;
      case 'Authentication required':
        // Show login modal
        break;
    }
  }
} catch (error) {
  console.error('API Error:', error);
}
```

## Development Notes

### Server Startup
```bash
cd backend
npm install
npm run dev
```

### Testing Endpoints
```bash
# Health check
curl http://localhost:3000/api/auth/health

# Test signup (requires Supabase running)
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Dependencies Added

- `@supabase/supabase-js` - Supabase client
- `jsonwebtoken` - JWT token handling
- `@types/jsonwebtoken` - TypeScript types for JWT

## Architecture Benefits

1. **Separation of Concerns** - Services handle business logic, middleware handles authentication, routes handle HTTP
2. **Type Safety** - Full TypeScript support with proper interfaces
3. **Error Handling** - Comprehensive error handling and logging
4. **Security** - JWT token management, input validation, proper HTTP status codes
5. **Scalability** - Modular design allows for easy extensions
6. **Testing** - Well-structured code for unit and integration testing

## Future Enhancements

- Email verification workflow
- Social login providers (Google, Facebook, etc.)
- Role-based access control (RBAC)
- Two-factor authentication (2FA)
- Account lockout after failed attempts
- Email notification system
- User activity logging
- Session management and concurrent login limits