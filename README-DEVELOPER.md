# Boiler Brain - Developer Documentation

## 🏗️ Project Overview

Boiler Brain is a React-based web application that provides an AI-powered assistant for boiler troubleshooting, manual retrieval, and technical support. The project integrates with Supabase for backend functionality and the DeepSeek API for AI conversation capabilities.

## 🔧 Technical Stack

- **Frontend**: React 18 with Vite build tool
- **Styling**: Tailwind CSS
- **Backend Services**: Supabase (PostgreSQL, Auth, Storage)
- **AI Integration**: DeepSeek API
- **Routing**: React Router
- **ENV Management**: dotenv

## 📂 Project Structure

```
bigbrain_website/
├── .env                 # Environment variables
├── public/              # Static assets
├── src/
│   ├── components/      # React components
│   │   ├── ChatDock.jsx         # AI chat interface
│   │   ├── MainContent.jsx      # Main application content container
│   │   ├── ManualFinderStandalone.jsx  # Manual search interface
│   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   └── ...                  # Other components
│   ├── App.jsx          # Main application component
│   ├── index.jsx        # Application entry point
│   └── supabaseClient.js # Supabase client initialization
├── server/
│   ├── index.js         # Express server for API endpoints
│   ├── authMiddleware.js # Authentication middleware
│   └── supabaseClient.js # Server-side Supabase client
├── package.json         # Dependencies and scripts
├── tailwind.config.js   # Tailwind configuration
└── vite.config.js       # Vite configuration
```

## 🗄️ Database Schema (Supabase)

### Connecting to Supabase

To access and manage the database:
1. Navigate to [https://app.supabase.io/](https://app.supabase.io/)
2. Login with account credentials
3. Select the "boiler-brain" project
4. Use the credentials in your .env file:
   ```
   SUPABASE_URL=https://hfyfidpbtoqnqhdywdzw.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

### Direct Database Connection

To connect directly to the PostgreSQL database:
```
psql -h db.hfyfidpbtoqnqhdywdzw.supabase.co -p 5432 -d postgres -U postgres
```

Alternatively, using the pooler connection:
```
psql -h db.hfyfidpbtoqnqhdywdzw.supabase.co -p 6543 -d postgres -U postgres
```

### Tables

#### `users`
Stores user account information and subscription details.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'Free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Access patterns:**
- Lookup by ID: `SELECT * FROM users WHERE id = '...'`
- Filter by tier: `SELECT * FROM users WHERE tier = 'Pro'`

#### `boilers`
Stores information about boiler models and their manuals.

```sql
CREATE TABLE boilers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(make, model)
);
```

**Indices:**
- `CREATE INDEX idx_boilers_make ON boilers(make);`
- `CREATE INDEX idx_boilers_model ON boilers(model);`

**Access patterns:**
- Search by model: `SELECT * FROM boilers WHERE model ILIKE '%keyword%'`
- Filter by manufacturer: `SELECT * FROM boilers WHERE make = 'Worcester'`

#### `service_status`
Tracks the status of user service subscriptions.

```sql
CREATE TABLE service_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('Active', 'Pending', 'Expired')),
  last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `payment_history`
Records payment transactions for subscription management.

```sql
CREATE TABLE payment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  amount DECIMAL(10,2) NOT NULL,
  description TEXT,
  date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Success', 'Failed', 'Pending'))
);
```

**Indices:**
- `CREATE INDEX idx_payment_history_user_id ON payment_history(user_id);`
- `CREATE INDEX idx_payment_history_date ON payment_history(date);`

#### `support_tickets`
Manages customer support requests and their status.

```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Triggers:**
```sql
CREATE TRIGGER set_updated_at BEFORE UPDATE
ON support_tickets FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();
```

### Storage Buckets

#### `boiler-manuals`
Stores PDF manuals for boiler models.

**Structure:**
- Bucket name: `boiler-manuals`
- Base path: `/dhs_manuals_all`
- Organization: `/dhs_manuals_all/{manufacturer}/{model}.pdf`

**Bucket Configuration:**
1. Navigate to Storage in Supabase dashboard
2. Create bucket with public read access
3. Set CORS policy to allow access from your application domain
4. Configure file size limits (recommended: max 10MB per file)

**Accessing Files:**
```javascript
// Get URL for manual download
const { data, error } = await supabase.storage
  .from('boiler-manuals')
  .getPublicUrl('dhs_manuals_all/Worcester/CDi.pdf');

// List all files in a manufacturer folder
const { data, error } = await supabase.storage
  .from('boiler-manuals')
  .list('dhs_manuals_all/Worcester', { sortBy: { column: 'name', order: 'asc' } });
```

**File Management:**
To upload new manuals, use the Supabase dashboard or API:
```javascript
const { data, error } = await supabase.storage
  .from('boiler-manuals')
  .upload('dhs_manuals_all/Worcester/NewModel.pdf', pdfFile);
```

## 🔌 API Integrations

### Supabase Integration

The application uses Supabase for data storage, user authentication, and file storage. The integration is set up in `src/supabaseClient.js`:

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

Key Supabase features used:
- **Database**: CRUD operations on tables
- **Storage**: PDF file storage for manuals
- **Auth**: User authentication (planned but not fully implemented)
- **Realtime**: Subscriptions for real-time updates

### DeepSeek AI Integration

The application uses DeepSeek API for the AI assistant. This integration is handled through the backend server in `server/index.js`:

```javascript
app.post('/api/chat', async (req, res) => {
  const { history } = req.body;
  // Process chat history and send to DeepSeek API
  // Format and return the response
});
```

The system is designed with fallback mechanisms to use multiple API keys in case of rate limits or failures.

## 🚀 Development Setup

### Prerequisites

- Node.js v16+
- npm v7+
- Supabase account
- DeepSeek API key(s)

### Getting Started

1. **Clone the repository**:
   ```
   git clone https://your-repository-url/bigbrain_website.git
   cd bigbrain_website
   ```

2. **Install dependencies**:
   ```
   npm install
   ```

3. **Set up environment variables**:
   Create a `.env` file in the project root with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_DEEPSEEK_API_KEY_1=your_deepseek_api_key
   # Additional DeepSeek API keys for fallback
   VITE_DEEPSEEK_API_KEY_2=second_api_key
   VITE_DEEPSEEK_API_KEY_3=third_api_key
   ```

4. **Start development server**:
   ```
   npm run dev
   ```

### Project Configuration

#### Vite Configuration

The project uses Vite for fast development and optimized production builds. Configuration is in `vite.config.js`:

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

#### Tailwind Configuration

Styling is done with Tailwind CSS. Configuration is in `tailwind.config.js`:

```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

## 💬 AI Chat Implementation

The AI chat functionality is one of the core features of Boiler Brain. Here's how it works:

1. The `ChatDock.jsx` component handles the UI for the chat interface
2. User messages are stored in a `history` state array
3. When a user sends a message, it's added to the history and sent to the backend
4. The backend formats the message history with a system prompt that gives "Dave" his personality
5. This formatted message is sent to the DeepSeek API
6. The API response is added to the history and displayed to the user

The system prompt is crucial for maintaining the character persona:

```javascript
const systemPrompt = {
  role: 'system',
  content: `You are Dave, a senior heating engineer with 25+ years of experience working on all types of boilers and heating systems. You're having a casual but helpful conversation with a fellow engineer who's asked for your help.

  CHARACTER TRAITS:
  - Friendly and approachable - use casual language, contractions, and occasional humor
  - Experienced but humble - share your knowledge without being condescending
  - Practical problem-solver - suggest real-world troubleshooting steps based on experience
  ...
  `
};
```

## 📱 Responsive Design Implementation

The UI is designed to be fully responsive using Tailwind CSS breakpoints:

- Mobile-first approach with `sm:`, `md:`, and `lg:` breakpoints
- Sidebar collapses to a mobile menu on small screens
- Touch-friendly elements with appropriate sizing
- Flexible layouts that adapt to screen size

Key responsive components:
- Sidebar navigation (becomes a hamburger menu on mobile)
- ManualFinder search and results (stacks vertically on mobile)
- ChatDock component (adjusts size and position on different screens)

## 🔒 Authentication & Authorization

**Note:** The authentication system is partially implemented but not fully integrated. The current implementation uses:

- Supabase Auth for user management (configured but not fully implemented)
- Admin authentication middleware in the Express server (stubbed)

To complete the authentication implementation:
1. Finish the user authentication flow in `src/components/Auth.jsx`
2. Implement proper session management and protection for admin routes
3. Update the `adminAuth` middleware in `server/index.js` to verify admin roles

## 🧠 AI Conversation Management

The chat component handles conversation history and AI responses. Key considerations:

- Chat history is maintained in component state (could be moved to global state or persistent storage)
- Messages are limited to the 10 most recent for context window efficiency
- Multiple API keys are used with fallback mechanisms
- Error handling for API failures is implemented

## 📦 Build & Deployment

### Building for Production

```
npm run build
```

This will generate optimized assets in the `dist` directory.

### Deployment Options

1. **Static Hosting**: Deploy the `dist` directory to any static hosting service (Netlify, Vercel, etc.)
2. **Server Component**: The Express server in `server/` should be deployed separately as a Node.js application
3. **Environment Setup**: Ensure all environment variables are configured in your deployment platform

## 🧪 Testing

Currently, the project doesn't have automated tests. Areas to add testing:

1. Unit tests for components using Jest or Vitest
2. Integration tests for Supabase interactions
3. E2E tests for critical user flows

## 🔄 Future Development

Areas for further development:

1. **Authentication**: Complete user authentication and role-based access control
2. **Profile Management**: Add user profile editing capabilities
3. **Manual Upload**: Direct manual upload through the UI for admins
4. **Enhanced Chat Features**: Audio input/output, chat history persistence
5. **Mobile App**: Package as a Progressive Web App or native mobile app
6. **Analytics**: Add usage analytics for business intelligence

## 📚 Additional Resources

- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [Supabase Documentation](https://supabase.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [DeepSeek API Documentation](https://deepseek.ai/docs) (Replace with actual URL)

---

## 🔄 Application State Flow

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│  UI Components  │◄────►│  API Services   │◄────►│  Supabase DB    │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
         ▲                        ▲
         │                        │
         ▼                        ▼
┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │
│  UI State       │      │  DeepSeek API   │
│                 │      │                 │
└─────────────────┘      └─────────────────┘
```

This document provides technical information for developers taking over the Boiler Brain project. For any questions not covered here, please contact the original development team.
