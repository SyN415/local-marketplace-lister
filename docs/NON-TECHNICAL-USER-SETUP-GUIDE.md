# Non-Technical User Setup Guide for Local Marketplace Lister

This guide is for users who want to get the app running without deep technical knowledge. We'll walk through the "Next Steps" required after the core development, focusing on configuration.

## Step 1: Copy Environment Files
1. Copy `backend/.env.example` to `backend/.env`
2. Copy `frontend/.env.example` to `frontend/.env` (if it exists)

## Step 2: Configure Environment Variables (.env Files)

These variables tell the app how to connect to external services. **Never commit .env files to Git**.

### Backend .env Variables (backend/.env)

```
# Supabase Database (get from your Supabase dashboard)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# JWT Secret (generate a strong random string, 32+ characters)
JWT_SECRET=your-super-secret-jwt-key-here-change-this

# Frontend URL (where your frontend runs)
FRONTEND_URL=http://localhost:5173

# Google API (for Gmail proxy emails AND user Google login)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/google/callback

# SMTP (for forwarding emails to users - use Gmail App Password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-forwarding@gmail.com
SMTP_PASS=your-16-char-app-password

# Encryption (generate once and keep secret)
ENCRYPTION_KEY=your-44-char-base64-key-here
```

### Frontend .env Variables (frontend/.env)
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_URL=http://localhost:3001
```

## Step 3: How to Get Each Variable

### 1. Supabase Credentials
1. Go to [supabase.com/dashboard](https://supabase.com/dashboard)
2. Create new project or use existing
3. Go to **Settings > API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY` 
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### 2. JWT_SECRET
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output (64 hex characters).

### 3. Google API Credentials (REQUIRED for Gmail proxy & Google login)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable **Gmail API** (APIs & Services > Library)
4. Go to **APIs & Services > Credentials**
5. Create **OAuth 2.0 Client ID** (Web application)
6. **Authorized redirect URIs**: Add `http://localhost:3001/api/auth/google/callback`
7. Copy **Client ID** and **Client Secret**

### 4. SMTP Credentials (Gmail App Password - RECOMMENDED)
1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Turn on **2-Step Verification** if not already
3. Select **Mail** → **Other** → Name it "Marketplace Lister"
4. Copy the **16-character password** (e.g., `abcd efgh ijkl mnop`)

### 5. ENCRYPTION_KEY
```
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Copy the output (44 base64 characters). **Keep this secret!**

## Step 4: Add Gmail Proxy Accounts (REQUIRED)
**Yes, this means manually creating 5-10 free Gmail accounts, then authorizing each one through the admin endpoint.**

1. Create 5-10 free Gmail accounts at [accounts.google.com](https://accounts.google.com) (use different names/IPs to avoid Google's spam detection)
2. Start the backend: `cd backend && npm run dev`
3. Create an admin user or login as existing admin
4. Open `http://localhost:3001/api/admin/proxy-pool/auth-url`
5. Click the Google URL → Login with **one Gmail account** → Authorize
6. Repeat steps 4-5 for each Gmail account (5-10 total recommended for good coverage)

## Step 5: Run the App
```
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`

## Step 6: Test the System
1. **Sign up/Login** (use Google or email)
2. **Connect Craigslist** → Enter your email/phone
3. **Create a test listing** → Check dashboard for proxy email
4. **Wait 2 minutes** → Send test email to proxy → Check if forwarded

## Troubleshooting
- **Emails not forwarding?** Check backend console for errors, verify SMTP credentials
- **Google login fails?** Check redirect URI matches exactly
- **Proxy emails not assigned?** Add more Gmail accounts to pool via admin
- **Encryption errors?** Generate new ENCRYPTION_KEY

## Production Deployment on Render.com (Single Web Service)

The frontend and backend are combined into **one Render Web Service** (Node.js app that serves both API and static frontend).

1. **Fork/Clone Repo** to your GitHub
2. **Create Render Account** at [render.com](https://render.com)
3. **Deploy Combined App** (Web Service):
   - Connect GitHub repo (root directory)
   - **Runtime**: Node
   - **Build Command**:
     ```
     npm ci && npm run build:frontend && npm run build
     ```
   - **Start Command**: `npm start`
   - **Environment Variables**: Add **all** from Step 2 (Backend + Frontend vars prefixed with `VITE_` for frontend)
   - Plan: Starter ($7/mo)
4. **Run Database Migrations** (one-time):
   - Render Dashboard → Shell → Run:
     ```
     npx supabase db push
     ```
5. **Add Gmail Proxies**:
   - Go to `https://your-app.onrender.com/api/admin/proxy-pool/auth-url`
   - Authorize 5-10 Gmail accounts
6. **Update Google Console**:
   - Authorized redirect URIs: `https://your-app.onrender.com/api/auth/google/callback`
7. **Test**: Visit `https://your-app.onrender.com`

**Total Cost**: ~$7/mo (Render Starter) + Supabase Free tier

**Note**: Render free tier sleeps after 15min - Starter plan keeps alive.

**Support:** Check console logs or TASK.md for detailed status.