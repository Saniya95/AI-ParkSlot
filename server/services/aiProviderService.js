import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Configurable AI Provider Service
 * Supports Google Gemini (default) and OpenAI-compatible endpoints (OpenAI, Groq, OpenRouter, Ollama).
 * All keys and provider choices are read strictly server-side from environment variables.
 */

export const getAiProviderConfig = () => {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
  
  if (provider === 'openai') {
    const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY || '';
    const model = process.env.AI_MODEL || 'gpt-4o-mini';
    const backupModel = process.env.AI_BACKUP_MODEL || 'gpt-3.5-turbo';
    const baseUrl = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
    return {
      provider: 'openai',
      apiKey,
      model,
      backupModel,
      baseUrl,
      isConfigured: Boolean(apiKey)
    };
  }

  // Default to Gemini
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.AI_API_KEY || '';
  const model = process.env.AI_MODEL || 'gemini-3.5-flash';
  const backupModel = process.env.AI_BACKUP_MODEL || (model === 'gemini-flash-lite-latest' ? 'gemini-3.1-flash-lite' : 'gemini-flash-lite-latest');
  return {
    provider: 'gemini',
    apiKey,
    model,
    backupModel,
    isConfigured: Boolean(apiKey)
  };
};

/**
 * Calls the configured AI Provider to generate a response.
 *
 * @param {Object} params
 * @param {string} params.systemPrompt - Server-compiled system instructions with live db context
 * @param {string} params.userMessage - Validated user query
 * @param {Array<{sender: string, text: string}>} [params.conversationHistory=[]] - Limited past turns
 * @param {number} [params.timeoutMs=25000] - Timeout limit in milliseconds
 * @returns {Promise<{reply: string, provider: string, model: string}>}
 */
export const callAiProvider = async ({
  systemPrompt,
  userMessage,
  conversationHistory = [],
  timeoutMs = 25000
}) => {
  const config = getAiProviderConfig();

  if (!config.isConfigured) {
    console.warn(`[AI Provider Error] provider=${config.provider} status=503 code=MISSING_API_KEY message="AI API key not configured in environment"`);
    const error = new Error('AI service is not configured. Please contact the system administrator.');
    error.code = 'MISSING_API_KEY';
    error.status = 503;
    throw error;
  }

  if (config.provider === 'openai') {
    return await callOpenAiCompatible({
      apiKey: config.apiKey,
      model: config.model,
      baseUrl: config.baseUrl,
      systemPrompt,
      userMessage,
      conversationHistory,
      timeoutMs
    });
  }

  // Gemini Provider with bounded single backup failover for retryable errors
  try {
    return await callGemini({
      apiKey: config.apiKey,
      model: config.model,
      systemPrompt,
      userMessage,
      conversationHistory,
      timeoutMs
    });
  } catch (primaryErr) {
    // Non-retryable authentication/permission errors should fail fast without looping
    if (primaryErr.isAuthError || primaryErr.code === 'AUTH_ERROR') {
      throw primaryErr;
    }

    const backupModel = config.backupModel;
    if (backupModel && backupModel !== config.model) {
      console.warn(`[AI Provider] Primary model '${config.model}' failed (${primaryErr.code || 'ERROR'}: ${primaryErr.message}). Retrying once with backup model '${backupModel}'...`);
      try {
        return await callGemini({
          apiKey: config.apiKey,
          model: backupModel,
          systemPrompt,
          userMessage,
          conversationHistory,
          timeoutMs: 15000
        });
      } catch (backupErr) {
        console.error(`[AI Provider Error] provider=gemini backup_model=${backupModel} status=${backupErr.status || 502} code=${backupErr.code || 'AI_PROVIDER_ERROR'} message="${backupErr.message}"`);
        throw primaryErr;
      }
    }

    throw primaryErr;
  }
};

/**
 * Calls Google Gemini API using @google/generative-ai SDK with timeout and structured error handling.
 */
async function callGemini({ apiKey, model, systemPrompt, userMessage, conversationHistory, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const contents = [];

    for (const msg of conversationHistory) {
      if (!msg?.text || typeof msg.text !== 'string') continue;
      const role = msg.sender === 'ai' || msg.sender === 'model' || msg.sender === 'assistant' ? 'model' : 'user';
      contents.push({
        role,
        parts: [{ text: msg.text.slice(0, 1000) }]
      });
    }

    // Add current user query
    contents.push({
      role: 'user',
      parts: [{ text: userMessage.slice(0, 1000) }]
    });

    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
      model: model || 'gemini-3.5-flash',
      systemInstruction: systemPrompt
    });

    const generatePromise = geminiModel.generateContent({
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 800
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      controller.signal.addEventListener('abort', () => {
        const err = new Error('AI provider request timed out. Please try again.');
        err.code = 'AI_TIMEOUT';
        err.status = 504;
        reject(err);
      });
    });

    const result = await Promise.race([generatePromise, timeoutPromise]);
    const response = await result.response;
    const replyText = response.text();

    if (!replyText || !replyText.trim()) {
      throw new Error('AI provider returned an empty response.');
    }

    return {
      reply: replyText.trim(),
      provider: 'gemini',
      model
    };
  } catch (err) {
    if (err.name === 'AbortError' || err.code === 'AI_TIMEOUT') {
      console.error(`[AI Provider Error] provider=gemini model=${model} status=504 code=AI_TIMEOUT message="Request timed out after ${timeoutMs}ms"`);
      const timeoutErr = new Error('The AI assistant took too long to respond. Please try again in a moment.');
      timeoutErr.code = 'AI_TIMEOUT';
      timeoutErr.status = 504;
      throw timeoutErr;
    }

    // Classify error code and status
    const message = err.message || '';
    let status = err.status || 502;
    let code = 'AI_PROVIDER_ERROR';
    let friendlyMessage = 'Failed to get a response from AI provider.';
    let isAuthError = false;

    if (
      status === 401 ||
      status === 403 ||
      message.includes('API_KEY_INVALID') ||
      message.includes('API key not valid') ||
      message.includes('401') ||
      message.includes('403') ||
      !apiKey ||
      apiKey.length < 10
    ) {
      status = 401;
      code = 'AUTH_ERROR';
      isAuthError = true;
      friendlyMessage = 'AI assistant authentication failed. Please verify provider credentials.';
    } else if (
      status === 429 ||
      message.includes('RESOURCE_EXHAUSTED') ||
      message.includes('429') ||
      message.includes('quota')
    ) {
      status = 429;
      code = 'RATE_LIMIT_EXCEEDED';
      friendlyMessage = 'AI assistant is currently experiencing high traffic. Please try again in a few moments.';
    } else if (
      status === 404 ||
      message.includes('model not found') ||
      message.includes('404') ||
      (message.includes('models/') && message.includes('not found'))
    ) {
      status = 404;
      code = 'MODEL_NOT_FOUND';
      friendlyMessage = `Configured AI model '${model}' is currently unavailable.`;
    } else if (status === 400 || message.includes('400')) {
      status = 400;
      code = 'INVALID_REQUEST';
      friendlyMessage = 'Invalid request payload sent to AI provider.';
    } else if (
      status === 500 ||
      status === 503 ||
      message.includes('500') ||
      message.includes('503') ||
      message.includes('Service Unavailable') ||
      message.includes('high demand')
    ) {
      status = 503;
      code = 'PROVIDER_UNAVAILABLE';
      friendlyMessage = 'AI provider service is temporarily unavailable. Please try again shortly.';
    } else if (message.includes('SAFETY') || message.includes('blocked')) {
      status = 400;
      code = 'SAFETY_FILTER';
      friendlyMessage = 'The query was flagged by content safety filters. Please rephrase your question.';
    }

    const cleanMsg = message.replace(/[\r\n]+/g, ' ').replace(apiKey, '[REDACTED]').slice(0, 160);
    console.error(`[AI Provider Error] provider=gemini model=${model} status=${status} code=${code} message="${cleanMsg}"`);

    const providerErr = new Error(friendlyMessage);
    providerErr.code = code;
    providerErr.status = status;
    providerErr.isAuthError = isAuthError;
    throw providerErr;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Calls OpenAI or OpenAI-compatible endpoint (Groq, OpenRouter, Ollama) via native fetch.
 */
async function callOpenAiCompatible({ apiKey, model, baseUrl, systemPrompt, userMessage, conversationHistory, timeoutMs }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    for (const msg of conversationHistory) {
      if (!msg?.text || typeof msg.text !== 'string') continue;
      const role = msg.sender === 'ai' || msg.sender === 'assistant' ? 'assistant' : 'user';
      messages.push({
        role,
        content: msg.text.slice(0, 1000)
      });
    }

    messages.push({
      role: 'user',
      content: userMessage.slice(0, 1000)
    });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model || 'gpt-4o-mini',
        messages,
        temperature: 0.3,
        max_tokens: 800
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const errText = await response.text();
      let errorMsg = `OpenAI API returned status ${response.status}.`;
      if (response.status === 401) {
        errorMsg = 'Invalid OPENAI_API_KEY provided in server/.env.';
      } else if (response.status === 429) {
        errorMsg = 'OpenAI API rate limit or quota exceeded. Please check your plan or try again later.';
      }
      const err = new Error(errorMsg);
      err.code = 'AI_PROVIDER_ERROR';
      err.status = 502;
      throw err;
    }

    const data = await response.json();
    const replyText = data.choices?.[0]?.message?.content;

    if (!replyText || !replyText.trim()) {
      throw new Error('AI provider returned an empty response.');
    }

    return {
      reply: replyText.trim(),
      provider: 'openai',
      model
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeoutErr = new Error('The AI model request timed out. Please try again.');
      timeoutErr.code = 'AI_TIMEOUT';
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
