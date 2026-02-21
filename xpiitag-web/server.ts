import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/providers', (req, res) => {
  const providers = [
    { id: 'openai', name: 'OpenAI', models: ['GPT-4', 'GPT-4 Turbo', 'GPT-3.5 Turbo', 'DALL-E 3'] },
    { id: 'google', name: 'Google', models: ['Gemini Pro', 'Gemini Ultra', 'Gemini Nano'] },
    { id: 'anthropic', name: 'Anthropic', models: ['Claude 3 Opus', 'Claude 3 Sonnet', 'Claude 3 Haiku'] },
    { id: 'xai', name: 'xAI', models: ['Grok-1', 'Grok-1.5', 'Grok-2'] },
    { id: 'meta', name: 'Meta AI', models: ['Llama 2', 'Llama 3', 'Code Llama'] },
    { id: 'mistral', name: 'Mistral AI', models: ['Mistral Large', 'Mistral Medium', 'Mixtral 8x22B'] },
    { id: 'cohere', name: 'Cohere', models: ['Command', 'Command R', 'Command R+'] },
    { id: 'stability', name: 'Stability AI', models: ['Stable Diffusion XL', 'Stable Diffusion 3'] }
  ];
  res.json({ providers });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 XPIITAG Server running on port ${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});
