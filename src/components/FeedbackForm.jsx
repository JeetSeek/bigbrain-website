import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { TIME, UI } from '../utils/constants';
import { uploadLog } from '../utils/csrfUtils';

/**
 * Feedback Form Component
 * Allows users to provide structured feedback about the application
 * Guides users through a series of questions and saves responses to the database
 */
export function FeedbackForm() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      content:
        "Hi there! I'm Dave, your AI assistant. I'd love to hear your feedback about Boiler Brain. What aspects would you like to comment on?",
      sender: 'ai',
      options: ['User Interface', 'Features', 'Performance', 'General Feedback'],
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const { user } = useAuth();

  // Questions to guide the feedback process
  const questions = [
    'Great! Could you tell me what you think about this specific aspect? What works well and what could be improved?',
    'Thank you for that feedback. On a scale of 1-10, how would you rate your overall experience with Boiler Brain?',
    "What's one feature you'd like to see added to Boiler Brain in the future?",
    "Is there anything else you'd like to share about your experience?",
  ];

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const newUserMessage = {
      id: messages.length + 1,
      content: inputText,
      sender: 'user',
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');
    setLoading(true);

    try {
      // Save feedback using CSRF-protected API
      const response = await uploadLog('feedback', {
        user_id: user?.id || 'anonymous',
        message: inputText,
        question_index: currentQuestion,
        created_at: new Date().toISOString(),
      });

      if (!response.success) throw new Error(response.error || 'Failed to submit feedback');

      // Generate AI response based on current question index
      // Add slight delay to simulate AI thinking
      setTimeout(() => {
        const questionIndex = Math.min(currentQuestion, questions.length - 1);

        const aiResponse = {
          id: messages.length + 2,
          content: questions[questionIndex],
          sender: 'ai',
          options:
            questionIndex === 1
              ? ['1-3 (Poor)', '4-6 (Average)', '7-9 (Good)', '10 (Excellent)']
              : [],
        };

        setMessages(prev => [...prev, aiResponse]);
        setCurrentQuestion(prev => prev + 1);
        setLoading(false);
      }, TIME.SECOND); // 1 second delay
    } catch (error) {
      console.error('Error saving feedback:', error);
      setLoading(false);
    }
  };

  const handleOptionSelect = option => {
    setInputText(option);
    setTimeout(() => handleSend(), UI.DEBOUNCE.BUTTON_CLICK); // Small delay after option selection
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-zinc-800 bg-zinc-900">
        <h2 className="text-xl font-light text-white">Feedback</h2>
        <p className="text-zinc-400 text-sm">
          Help us improve Boiler Brain by sharing your thoughts
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl p-3 ${
                message.sender === 'user' ? 'bg-blue-500 text-white' : 'bg-zinc-800 text-white'
              }`}
            >
              <p>{message.content}</p>

              {message.options && message.options.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.options.map(option => (
                    <button
                      key={option}
                      onClick={() => handleOptionSelect(option)}
                      className="text-sm py-1 px-3 rounded-full bg-zinc-700 hover:bg-zinc-600 text-white transition-colors"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-xl p-3 bg-zinc-800 text-white">
              <div className="flex space-x-2 items-center">
                <div className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse"></div>
                <div
                  className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse"
                  style={{ animationDelay: `${UI.ANIMATION.TYPING_INDICATOR_DELAY}s` }}
                ></div>
                <div
                  className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse"
                  style={{ animationDelay: `${UI.ANIMATION.TYPING_INDICATOR_DELAY * 2}s` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-zinc-800 bg-zinc-900">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your feedback here..."
            className="flex-1 rounded-lg px-4 py-2 bg-zinc-800 text-white placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-zinc-700"
          />
          <button
            onClick={handleSend}
            disabled={!inputText.trim() || loading}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            Send
          </button>
        </div>

        {currentQuestion >= questions.length && (
          <div className="mt-4 text-center p-3 rounded-lg bg-green-900/30 border border-green-500/30">
            <p className="text-green-400">
              Thank you for your feedback! It helps us improve Boiler Brain.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Submit feedback handler
 * @param {string} text - The feedback message to submit
 * @param {number} questionIndex - Current question index
 * @param {string} userId - User ID or 'anonymous'
 * @returns {Promise} - Promise resolving to the submission result
 */
export async function submitFeedback(text, questionIndex, userId = 'anonymous') {
  try {
    // Use CSRF-protected API endpoint instead of direct Supabase insert
    const response = await uploadLog('feedback', {
      user_id: userId,
      message: text,
      question_index: questionIndex,
      created_at: new Date().toISOString(),
    });

    if (!response.success) throw new Error(response.error || 'Failed to submit feedback');
    return response;
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return { success: false, error: error.message || String(error) };
  }
}

// Default export for backward compatibility
export default FeedbackForm;
