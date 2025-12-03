const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'google-api-key');

async function test() {
  try {
    console.log('Testing Gemini API...');
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent('Say hello in Vietnamese');
    const response = await result.response;
    const text = response.text();
    console.log('Success!', text);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
