
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY not found in .env');
    return;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  try {
    const result = await model.generateContent('Olá, você está ativo? Responda "SIM" se estiver.');
    const response = await result.response;
    console.log('Gemini Response:', response.text());
  } catch (error) {
    console.error('Error calling Gemini:', error);
  }
}

test();
