import express from 'express';
import {
  analyzeQuery,
  extractCityFromPrompt,
  generateWeatherResponse,
  getForecastData,
  getWeatherData,
} from './gemini-weather.js';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Endpoint principal
app.post('/weather-chat', async (req, res) => {
  try {
    const { prompt, city: providedCity } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt é obrigatório' });
    }

    // Extrair cidade do prompt se não fornecida
    let city = providedCity;
    if (!city) {
      city = await extractCityFromPrompt(prompt);
    }

    if (!city) {
      return res.status(400).json({
        error:
          'Não foi possível identificar a cidade. Por favor, especifique uma cidade.',
      });
    }

    // Analisar tipo de consulta
    const queryType = await analyzeQuery(prompt);

    // Obter dados do clima baseado no tipo de consulta
    let weatherData = {};

    try {
      if (queryType === 'previsao') {
        weatherData.forecast = await getForecastData(city);
      } else {
        weatherData.current = await getWeatherData(city);
      }
    } catch (weatherError) {
      return res.status(404).json({
        error: `Cidade "${city}" não encontrada ou erro nos dados meteorológicos.`,
      });
    }

    // Gerar resposta com IA
    const response = await generateWeatherResponse(
      prompt,
      weatherData,
      queryType,
    );

    res.json({
      city,
      queryType,
      response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro no endpoint:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Endpoint para informações da API
app.get('/info', (req, res) => {
  res.json({
    name: 'Agente de IA de Clima',
    version: '1.0.0',
    description:
      'API que combina OpenWeatherMap com Gemini AI para consultas inteligentes sobre clima',
    endpoints: {
      'POST /weather-chat':
        'Envie um prompt sobre clima e obtenha uma resposta inteligente',
    },
    example: {
      prompt: 'Como está o clima em São Paulo hoje?',
      city: 'São Paulo', // opcional
    },
  });
});

// Middleware de tratamento de erros
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// Iniciar servidor
app.listen(port, () => {
  console.log(`🌤️  Servidor rodando na porta ${port}`);
  console.log(`📍 Acesse http://localhost:${port}/info para mais informações`);

  // Verificar variáveis de ambiente
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY não configurada');
  }
  if (!process.env.OPENWEATHER_API_KEY) {
    console.warn('⚠️  OPENWEATHER_API_KEY não configurada');
  }
});
