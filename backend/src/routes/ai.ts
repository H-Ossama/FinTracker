import { Router, Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import axios from 'axios';

import { createError } from '../middleware/errorHandler';

const router = Router();

const getGeminiApiKey = (): string | null => {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || '').trim();
  return key.length > 0 ? key : null;
};

const getGeminiModel = (): string => {
  return (process.env.GEMINI_MODEL || 'gemini-2.5-flash').trim();
};

router.post(
  '/gemini',
  [
    body('prompt').isString().isLength({ min: 1, max: 20000 }),
    body('options.responseMimeType').optional().isIn(['text/plain', 'application/json']),
    body('options.temperature').optional().isFloat({ min: 0, max: 2 }),
    body('options.maxOutputTokens').optional().isInt({ min: 1, max: 8192 }),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw createError('Validation failed', 400);
      }

      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        throw createError('AI service is not configured', 503);
      }

      const prompt: string = req.body.prompt;
      const options = req.body.options || {};

      const model = getGeminiModel();
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const responseMimeType: 'text/plain' | 'application/json' =
        options.responseMimeType === 'application/json' ? 'application/json' : 'text/plain';
      const temperature: number = typeof options.temperature === 'number' ? options.temperature : 0.7;
      const maxOutputTokens: number = typeof options.maxOutputTokens === 'number' ? options.maxOutputTokens : 500;

      const result = await axios.post(
        url,
        {
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature,
            topK: 40,
            topP: 0.95,
            maxOutputTokens,
            responseMimeType,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          timeout: 20000,
        }
      );

      const content: unknown = result?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (typeof content !== 'string' || !content.trim()) {
        throw createError('AI response was empty', 502);
      }

      res.json({ content });
    } catch (error: any) {
      // Preserve Gemini rate-limit signal where possible.
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        return res.status(429).json({ error: 'Rate limited. Please try again later.' });
      }
      return next(error);
    }
  }
);

export default router;
