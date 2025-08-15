# Boiler Brain - Beginner Guide

![Boiler Brain Logo](assets/logo.png) *(If available)*

## 👋 Welcome to Boiler Brain!

Boiler Brain is an AI-powered application designed to help heating engineers and homeowners troubleshoot boiler problems, find technical manuals, and get real-time support for heating systems. The application features a chat interface with an AI assistant named Dave who has the personality of a friendly, experienced heating engineer.

## 📱 Features

- **AI Chat Assistant**: Talk to "Dave," an AI assistant with decades of virtual experience in heating systems
- **Manual Finder**: Search and download technical manuals for various boiler makes and models 
- **Service Status**: Check the status of your Boiler Brain service subscription
- **Payment History**: View your past payments and subscription details
- **Support Tickets**: Manage support requests and track their status

## 🚀 Getting Started

### Prerequisites

Before you start, make sure you have the following installed:

- [Node.js](https://nodejs.org/) (v16 or newer)
- [npm](https://www.npmjs.com/) (v7 or newer)
- A web browser (Chrome, Firefox, Safari, or Edge)

### Installation

1. **Download the Project**:
   - Download the project files or clone the repository:
   ```
   git clone https://your-repository-url/boiler-brain.git
   cd boiler-brain
   ```

2. **Install Dependencies**:
   - Run the following command in the project directory:
   ```
   npm install
   ```

3. **Set Up Environment Variables**:
   - Create a `.env` file in the project root directory with the following variables:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_DEEPSEEK_API_KEY_1=your_deepseek_api_key
   ```

4. **Start the Development Server**:
   ```
   npm run dev
   ```

5. **Open in Browser**:
   - Open your browser and navigate to: `http://localhost:5173`

## 🔄 Using Boiler Brain

### AI Chat Assistant

1. Click on the "Chat" tab in the sidebar or the chat bubble in the bottom-right corner
2. Type your question about boiler problems or heating systems
3. Dave (the AI assistant) will respond with helpful advice and troubleshooting steps
4. Continue the conversation as needed

### Manual Finder

1. Click on the "Manual Finder" tab in the sidebar
2. Search for a boiler by model name or select a manufacturer from the dropdown
3. Click the "Download PDF" button to get the manual you need

### Service Status & Account Management

1. Access your account details through the sidebar tabs
2. View your service status, payment history, and support tickets
3. Submit new support requests if needed

## 🔐 Supabase Integration

Boiler Brain uses [Supabase](https://supabase.com/) as its backend database service. Your data is stored securely, and the application communicates with the database to retrieve:

- **User profile information**: Your name, email, and subscription tier (Free, Plus, or Pro)
- **Service status**: Whether your service is active, pending, or expired
- **Payment history**: Records of all your past transactions with dates and amounts
- **Support tickets**: Any help requests you've submitted and their current status
- **Boiler manual directory**: A searchable collection of technical manuals for various boiler models

### How the Manual Finder Works

The Manual Finder feature connects to the Supabase database to search through thousands of boiler manuals. Here's what happens when you search:

1. Your search query is sent to the Supabase database
2. The database looks for matches in the `boilers` table based on model name or manufacturer
3. Results are filtered and sorted based on your selections
4. When you click "Download PDF," the application retrieves the file from the `boiler-manuals` storage bucket

### Database Connection Details (For Reference)

If you ever need to reconnect the app to Supabase, the connection details are:

```
SUPABASE_URL=https://hfyfidpbtoqnqhdywdzw.supabase.co
SUPABASE_ANON_KEY=[your_anon_key] (Found in your .env file)
```

Note: You don't need to modify these settings for normal operation of the app.

## 🧠 DeepSeek API Integration

The AI chat functionality is powered by the [DeepSeek API](https://deepseek.ai/), which allows Dave to provide intelligent responses to your questions about heating systems. The integration works by:

1. Sending your chat messages to the DeepSeek API
2. Processing the response with a specialized prompt that gives Dave his personality
3. Displaying the response in the chat interface

## 📱 Mobile Support

Boiler Brain is fully responsive and works on all devices:

- Desktop computers
- Tablets
- Mobile phones (including screens smaller than 400px)

The interface adapts automatically to your screen size for the best user experience.

## ❓ Troubleshooting

**Problem**: The application doesn't load
- Make sure you've installed all dependencies with `npm install`
- Check that your `.env` file is configured correctly
- Verify your internet connection

**Problem**: AI chat doesn't respond
- Verify your DeepSeek API key is valid
- Check your internet connection
- Try refreshing the page

**Problem**: Can't find a manual
- Try different search terms
- Check if you've selected a manufacturer filter that might be limiting results

## 📞 Getting Help

If you need assistance with Boiler Brain:

1. Check this document for guidance
2. Visit our website at [boilerbrain.com](https://boilerbrain.com) *(placeholder)*
3. Contact support at support@boilerbrain.com *(placeholder)*

---

Happy troubleshooting with Boiler Brain! 🔧🔥
