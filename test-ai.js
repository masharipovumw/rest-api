require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listModels() {
  try {
    // For listing models with the JS SDK, we need to make a raw fetch call because 
    // getGenerativeModel doesn't have a list method directly exposed in the same way.
    const apiKey = process.env.GEMINI_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();
    
    if (data.models) {
      console.log('Available models:');
      data.models.forEach(m => {
        if (m.supportedGenerationMethods.includes('generateContent')) {
          console.log(`- ${m.name}`);
        }
      });
    } else {
      console.log('Error fetching models:', data);
    }
  } catch (error) {
    console.error('Network error:', error.message);
  }
}

listModels();
