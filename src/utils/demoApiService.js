/**
 * Demo API Service
 * Simulates API responses for the demo environment
 * This allows the app to work without a backend server
 */
import { TIME, DEMO } from './constants';

const DEMO_RESPONSES = [
  "That's a common issue with Worcester Bosch models. In my experience, the pressure switch can get a bit temperamental. Have you checked if the pressure gauge is reading between 1 and 2 bar?",

  "Sounds like it could be a faulty diverter valve. Those symptoms are pretty classic for that problem. I'd check that first before digging any deeper.",

  "Hmm, if it's firing up but then cutting out after a few minutes, I'd be looking at either the flame sensor or maybe a blocked flue. Those are the usual suspects with Vaillant models.",

  "Yeah, with those Baxi units, they've got a common problem with the PCB. Sometimes it's just a loose connection, but it might need replacing if it's more than 5 years old.",

  "Hot water but no heating? That's almost always the diverter valve or the heating pump. Worth checking both - start with the pump, see if it's running when the heating is called for.",

  "Those symptoms sound like a classic airlock in the system. Have you tried bleeding the radiators? I'd start with the highest point in the system and work your way down.",

  "If it's making that knocking noise, it's probably kettling. That's usually caused by limescale build-up on the heat exchanger. A powerflush might sort it, but if it's an old system, you might be looking at a replacement.",

  "That's a bit of a tricky one. Given what you've described, I'd be checking the gas valve first. Those can get sticky and cause the intermittent heating you're describing.",

  "I've dealt with something similar last month. Turned out the condensate pipe had frozen over. It's a common problem in the winter. Try pouring some warm (not boiling) water over the external pipe.",

  "With those symptoms, I'd check the expansion vessel. If it's lost its charge, that would explain the pressure dropping. It's a relatively easy fix if that's the case.",
];

const DEMO_ANSWERS = {
  'how are you':
    "I'm doing great! Ready to help with any boiler or heating questions you might have. What can I assist you with today?",

  "what's your name":
    "I'm Dave, been working on boilers and heating systems for over 25 years now. What can I help you with?",

  help: "I'm here to help with any boiler or heating system questions. You can ask me about troubleshooting problems, maintenance tips, or specific model information. What's the issue you're facing?",

  "my boiler isn't working":
    'Sorry to hear that. Could you give me a bit more detail? Is it not turning on at all, or is it turning on but not heating? And do you know what make and model it is?',

  'pressure dropping':
    "Pressure dropping is usually down to a few things: a leak somewhere in the system, a faulty expansion vessel, or just normal air release. First, check for any visible leaks around pipes, radiators, and the boiler itself. If it's dropping slowly over weeks, it's probably just normal. If it's rapid, we need to look at the expansion vessel or potential leaks.",

  'no hot water':
    "No hot water but heating works? That's often a diverter valve issue. If neither hot water nor heating works, check if the boiler's getting power and if the gas supply is on. Also worth checking if the programmer/timer is set correctly. What make of boiler is it?",

  'radiator cold':
    "If just one radiator is cold, it's likely air trapped (try bleeding it) or a stuck valve. If multiple radiators are cold, especially upper floors, you might need to check your circulation pump or increase the system pressure. Is it just one radiator or multiple?",

  'boiler making noise':
    'Boiler noises can be several things. A kettling sound (like boiling water) suggests limescale buildup on the heat exchanger. Gurgling might be trapped air. Banging or tapping could be pump issues or pipes expanding. Can you describe the noise a bit more?',
};

const GREETING_MESSAGES = [
  "Hi there! I'm Dave, your heating engineer assistant. How can I help you today?",
  "Hello! I'm Dave, with 25+ years of experience in heating systems. What can I help you with?",
  "Welcome to Boiler Brain! I'm Dave, your virtual heating engineer. What questions do you have about your system?",
  "Good day! I'm Dave, here to help with any boiler or heating questions. What's on your mind?",
];

/**
 * Sends a message to the demo API service and receives a simulated response
 * @param {Array} history - Chat history including the current message
 * @returns {Promise<string>} - The simulated response
 */
export async function sendMessage(history) {
  // Add a small delay to simulate network request
  await new Promise(resolve => setTimeout(resolve, DEMO.NETWORK_DELAY));

  // If this is the first message, return a greeting
  if (history.length === 1) {
    return getRandomItem(GREETING_MESSAGES);
  }

  // Get the last user message
  const lastUserMessage = history[history.length - 1].text.toLowerCase();

  // Check if we have a prepared answer for this query
  for (const [keyword, response] of Object.entries(DEMO_ANSWERS)) {
    if (lastUserMessage.includes(keyword)) {
      return response;
    }
  }

  // Return a random response if no keyword matches
  return getRandomItem(DEMO_RESPONSES);
}

/**
 * Helper function to get a random item from an array
 * @param {Array} array - The array to pick from
 * @returns {any} - A random item from the array
 */
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Export as an object for backward compatibility
export const demoApiService = {
  sendMessage,
};

// Default export for backward compatibility
export default demoApiService;
