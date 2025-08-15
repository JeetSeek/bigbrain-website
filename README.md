# Boiler Brain

Boiler Brain is a modern, AI-powered dashboard designed to help you manage your services, payments, and support tickets with the help of advanced AI chat and data APIs.

---

## 🧠 What is Boiler Brain?
Boiler Brain is a web app that combines a beautiful, responsive dashboard with smart AI chat features. It lets you:
- View your service status, payment history, and support tickets.
- Use AI chat (powered by HP ChatGPT API and DeepSeek API) for questions, support, or data queries.
- Securely access and query your data with AI agents using protected API endpoints.

---

## 🛠️ Tech Stack
- **Frontend:** React + Vite + Tailwind CSS
- **Backend:** Node.js + Express + Supabase
- **Database:** Supabase (PostgreSQL with real-time capabilities)
- **AI APIs:** OpenAI GPT + DeepSeek API (with fallback rotation)
- **Authentication:** Supabase Auth
- **Deployment:** Vite build + Node.js server

---

## 🚀 Setup Instructions

### 1. Clone and Install Dependencies
```sh
cd ~/CascadeProjects/bigbrain_website
npm install
cd server
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory using `.env.example` as a template:

**Required Environment Variables:**
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# AI API Keys
OPENAI_API_KEY=your_openai_api_key
DEEPSEEK_API_KEY_1=your_deepseek_api_key_1
DEEPSEEK_API_KEY_2=your_deepseek_api_key_2
DEEPSEEK_API_KEY_3=your_deepseek_api_key_3

# Frontend Variables (VITE_ prefix required)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3001

# Server Configuration
PORT=3001
USE_MODEL=openai
```

### 3. Database Setup
The application uses Supabase for data persistence. Ensure your Supabase project has:
- `chat_sessions` table for conversation persistence
- Proper RLS policies for authenticated access
- Vector extensions enabled (if using embeddings)

### 4. Start the Backend Server
```sh
cd ~/CascadeProjects/bigbrain_website/server
npm run dev
```
- Backend runs at `http://localhost:3001`
- API endpoints available at `/api/*`

### 5. Start the Frontend Application
```sh
cd ~/CascadeProjects/bigbrain_website
npm run dev -- --port 5179
```
- Frontend runs at `http://localhost:5179`
- Chat interface accessible immediately after login

---

## 🤖 Boiler Brain AI Chat
- The dashboard includes an AI chat interface as the default main panel.
- The chat uses the DeepSeek API for real-time AI responses.
- If an API key fails, the chat will automatically try the next available key.
- If all keys fail, friendly fallback answers are shown.
- **Usage:**
  - Type your question in the chat panel and press Send.
  - Use the sidebar to switch between Service Status, Payment History, Support Tickets, Manual Finder, and Boiler Brain Chat.

### Troubleshooting
- If the chat does not work or you see a blank page, ensure:
  - All DeepSeek API keys in `.env` use the `VITE_` prefix.
  - You restart the frontend dev server after changing `.env`.
  - You are running the frontend on port 5179 (or update the URL as needed).
- Check browser console for errors about missing environment variables or CORS issues.

---

## 🧑‍💻 Development Notes
- **Tech Stack:** React, Vite, Tailwind CSS, Node.js (backend), Supabase (local DB)
- **Branding:** The dashboard is branded as "Boiler Brain" with an AI-inspired, accessible design.
- **Extending AI:** You can add more AI providers by extending the fallback chain in `ChatDock.jsx`.
- **Security:** Never expose secret keys in frontend code or public repos.

---

For any issues or feature requests, open an issue or contact the project maintainer.

---

## 🌊 Supabase Database Queries
- The backend uses Supabase as the local database (file: `dashboard.db`).
- AI agents (with a valid token) can query user data securely through the `/api/ai/` routes.
- Example: The chat can ask for payment history, and the backend will fetch it from the database.

---

## 🔐 API Routes Overview

### Open Routes (for dashboard UI)
- `GET /api/user-data` — Returns service status, payment history, and support tickets for the dashboard.

### Secure AI Agent Routes (require Bearer token)
- `GET /api/ai/user-data` — Returns all user data (for AI agents).
- `GET /api/ai/users` — Returns a list of users (expandable).
- All `/api/ai/*` routes require an `Authorization: Bearer <token>` header.

### Example: Query with Token
```sh
curl -H "Authorization: Bearer supersecretaikey123" http://localhost:3001/api/ai/user-data
```

---

## 🖥️ Project Structure
```
bigbrain_website/
├── src/               # React frontend
├── server/            # Express backend & Supabase DB
├── index.html         # Main HTML entry
├── tailwind.config.js # Tailwind CSS config
└── README.md          # This file
```

---

## 🧑‍💻 Learning Notes
- **Frontend**: Built with React (UI), Vite (fast dev server), and Tailwind CSS (for easy, modern styling).
- **Backend**: Node.js Express API handles data and security. Supabase is a simple file-based database (no setup needed).
- **AI Chat**: Connects to external APIs (HP ChatGPT, DeepSeek) for smart responses and data access.
- **Security**: AI agent routes are protected by a Bearer token middleware. Never share your token publicly!

---

## 💡 Tips
- If you want to add more users, services, or AI features, expand the backend and database as needed.
- You can swap Supabase for Postgres/MySQL for production.
- For production, always use strong, secret tokens and secure your API keys.

---

## 🏁 Need Help?
If you get stuck, check your terminal for errors, make sure both servers are running, and that your API keys are correct.

Enjoy building with Boiler Brain! 🧠✨
