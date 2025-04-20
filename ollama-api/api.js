// ollama-openai-api.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Constants
const OLLAMA_BASE_URL = 'http://localhost:11434';
const AVAILABLE_MODELS = ['qwen2.5:0.5b', 'deepseek-r1:1.5b'];

// Helper function to transform OpenAI-style requests to Ollama format
function transformToOllamaRequest(openaiRequest, model) {
  // Support both chat.completions (messages) and unified /responses (input items)
  let messages = [];
  if (Array.isArray(openaiRequest.messages)) {
    messages = openaiRequest.messages;
  } else if (Array.isArray(openaiRequest.input)) {
    // Include instructions as a system message if provided
    if (openaiRequest.instructions) {
      messages.push({ role: 'system', content: openaiRequest.instructions });
    }
    // Map unified input items to messages
    openaiRequest.input.forEach((item) => {
      if (item.type === 'input_text' && item.text != null) {
        messages.push({ role: 'user', content: item.text });
      } else if (item.type === 'function_call_output' && item.output != null) {
        messages.push({ role: 'assistant', content: item.output });
      }
    });
  } else {
    messages = Array.isArray(openaiRequest.messages) ? openaiRequest.messages : [];
  }
  return {
    model: model,
    prompt: messages.map(msg => `${msg.role}: ${msg.content}`).join('\n'),
    stream: openaiRequest.stream || false,
    options: {
      temperature: openaiRequest.temperature || 0.7,
      top_p: openaiRequest.top_p || 1.0,
      max_tokens: openaiRequest.max_tokens || 2048
    }
  };
}

// Transform Ollama response to OpenAI-like format
function transformToOpenAIResponse(ollamaResponse, model) {
  // Log the raw Ollama response
  console.log('\n\n===== MODEL RESPONSE FROM OLLAMA =====');
  console.log(`Using model: ${model}`);
  console.log(`Response content: ${ollamaResponse.response}`);
  console.log('======================================\n\n');

  return {
    id: `chatcmpl-${Date.now()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant',
          content: ollamaResponse.response
        },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: ollamaResponse.prompt_eval_count || 0,
      completion_tokens: ollamaResponse.eval_count || 0,
      total_tokens: (ollamaResponse.prompt_eval_count || 0) + (ollamaResponse.eval_count || 0)
    }
  };
}

// List available models (OpenAI-style endpoint)
app.get('/v1/models', (req, res) => {
  const formattedModels = AVAILABLE_MODELS.map(model => ({
    id: model,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'local-user'
  }));

  res.json({
    object: 'list',
    data: formattedModels
  });
});

// Chat completions endpoint (OpenAI-style) and unified /responses compatibility
app.post(['/v1/chat/completions', '/v1/responses'], async (req, res) => {
  try {
    const model = req.body.model || 'qwen2.5:0.5b';
    
    // Log the incoming request
    console.log('\n===== INCOMING REQUEST =====');
    console.log(`Endpoint: ${req.path}`);
    console.log(`Model requested: ${model}`);
    console.log(`Request body: ${JSON.stringify(req.body, null, 2)}`);
    console.log('============================\n');
    
    // Validate model
    if (!AVAILABLE_MODELS.includes(model)) {
      return res.status(400).json({ 
        error: {
          message: `Model ${model} not found. Available models: ${AVAILABLE_MODELS.join(', ')}`,
          type: 'invalid_request_error'
        }
      });
    }

    // Replace your streaming section with this OpenAI-compatible version
if (req.body.stream === true) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const ollamaRequest = transformToOllamaRequest(req.body, model);
  
  console.log('\n===== STREAMING REQUEST TO OLLAMA =====');
  console.log(`Model: ${model}`);
  console.log(`Prompt: ${ollamaRequest.prompt}`);
  console.log('======================================\n');
  
  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, ollamaRequest, {
      responseType: 'stream'
    });

    console.log('===== STREAMING RESPONSE STARTED =====');
    let fullResponse = '';
    let buffer = '';
    
    // Check if this is a request from Codex-CLI
    const isCodexRequest = req.path === '/v1/responses';
    
    response.data.on('data', (chunk) => {
      try {
        // Add the new chunk to our buffer
        buffer += chunk.toString();
        
        // Try to extract complete JSON objects from the buffer
        let processBuffer = () => {
          // Find the position of the first complete JSON object
          const jsonEndIndex = buffer.indexOf('\n');
          
          // If we found a complete line (which should be a JSON object)
          if (jsonEndIndex !== -1) {
            // Extract the JSON string
            const jsonStr = buffer.substring(0, jsonEndIndex);
            // Remove the processed part from the buffer
            buffer = buffer.substring(jsonEndIndex + 1);
            
            try {
              // Parse the JSON
              const data = JSON.parse(jsonStr);
              
              // Process the data
              fullResponse += data.response || '';
              
              // Different SSE format based on request type
              if (isCodexRequest) {
                // Format for Codex-CLI /v1/responses endpoint
                const sseData = {
                  type: "response.output_text.delta",
                  output_index: 0,
                  content_index: 0,
                  delta: data.response || ''
                };
                res.write(`data: ${JSON.stringify(sseData)}\n\n`);
              } else {
                // Standard OpenAI chat completions format
                const sseData = {
                  id: `chatcmpl-${Date.now()}`,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: model,
                  choices: [{
                    index: 0,
                    delta: {
                      content: data.response || ''
                    },
                    finish_reason: data.done ? 'stop' : null
                  }]
                };
                res.write(`data: ${JSON.stringify(sseData)}\n\n`);
              }
              
              if (data.done) {
                console.log('\n===== COMPLETE STREAMED RESPONSE =====');
                console.log(fullResponse);
                console.log('=====================================\n');
                
                // Send the final [DONE] message
                res.write('data: [DONE]\n\n');
                res.end();
                return;
              }
              
              // Recursively process more complete JSON objects if they exist
              processBuffer();
            } catch (e) {
              console.error('Error parsing JSON:', e);
              console.error('Problematic JSON string:', jsonStr);
              // Continue with the rest of the buffer
              processBuffer();
            }
          }
        };
        
        // Start processing the buffer
        processBuffer();
      } catch (e) {
        console.error('Error processing stream chunk:', e);
      }
    });

    response.data.on('error', (err) => {
      console.error('Stream error:', err);
      res.end();
    });
    
    response.data.on('end', () => {
      // Handle any remaining data in the buffer if the stream ends
      if (buffer.length > 0) {
        try {
          const data = JSON.parse(buffer);
          fullResponse += data.response || '';
          
          // Different SSE format based on request type
          if (isCodexRequest) {
            // Format for Codex-CLI
            const sseData = {
              type: "response.output_text.delta",
              output_index: 0,
              content_index: 0,
              delta: data.response || ''
            };
            res.write(`data: ${JSON.stringify(sseData)}\n\n`);
          } else {
            // Standard OpenAI format
            const sseData = {
              id: `chatcmpl-${Date.now()}`,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: model,
              choices: [{
                index: 0,
                delta: {
                  content: data.response || ''
                },
                finish_reason: data.done ? 'stop' : null
              }]
            };
            res.write(`data: ${JSON.stringify(sseData)}\n\n`);
          }
          
          if (data.done) {
            res.write('data: [DONE]\n\n');
          }
        } catch (e) {
          console.error('Error processing final buffer:', e);
        }
      }
      
      // End the response if not already ended
      try {
        res.end();
      } catch (err) {
        console.error('Error ending response:', err);
      }
    });
  } catch (error) {
    console.error('Error initiating streaming request:', error);
    res.status(500).json({
      error: {
        message: 'An error occurred while processing your streaming request',
        type: 'server_error',
        details: error.message
      }
    });
  }
    } else {
      // Regular non-streaming request
      const ollamaRequest = transformToOllamaRequest(req.body, model);
      
      console.log('\n===== REQUEST TO OLLAMA =====');
      console.log(`Model: ${model}`);
      console.log(`Prompt: ${ollamaRequest.prompt}`);
      console.log('============================\n');
      
      const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, ollamaRequest);
      const openAIResponse = transformToOpenAIResponse(response.data, model);
      res.json(openAIResponse);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: {
        message: 'An error occurred while processing your request',
        type: 'server_error',
        details: error.message
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', models: AVAILABLE_MODELS });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Ollama OpenAI-compatible API running on port ${PORT}`);
  console.log(`Available models: ${AVAILABLE_MODELS.join(', ')}`);
  console.log(`Make requests to http://localhost:${PORT}/v1/chat/completions`);
});