import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const FREE_LIMITS = {
  plan_generations: 3,
  chat_messages: 20,
  food_ai_parses: 10,
  photo_analyses: 0,
}

export const PREMIUM_LIMITS = {
  plan_generations: Infinity,
  chat_messages: Infinity,
  food_ai_parses: Infinity,
  photo_analyses: 10,
}
