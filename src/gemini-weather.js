import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// Inicializar Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// Função para obter dados do clima
export async function getWeatherData(city) {
  try {
    const response = await axios.get(
      'https://api.openweathermap.org/data/2.5/weather',
      {
        params: {
          q: city,
          appid: process.env.OPENWEATHER_API_KEY,
          units: 'metric',
          lang: 'pt_br',
        },
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(`Erro ao obter dados do clima: ${error.message}`);
  }
}

// Função para obter previsão de 5 dias
export async function getForecastData(city) {
  try {
    const response = await axios.get(
      'https://api.openweathermap.org/data/2.5/forecast',
      {
        params: {
          q: city,
          appid: process.env.OPENWEATHER_API_KEY,
          units: 'metric',
          lang: 'pt_br',
        },
      },
    );
    return response.data;
  } catch (error) {
    throw new Error(`Erro ao obter previsão do clima: ${error.message}`);
  }
}

// Função para extrair cidade do prompt usando Gemini
export async function extractCityFromPrompt(prompt) {
  try {
    const extractionPrompt = `
    Analise o seguinte prompt e extraia APENAS o nome da cidade mencionada. 
    Se não houver cidade mencionada, responda com "não especificada".
    Responda APENAS com o nome da cidade, sem explicações adicionais.
    
    Prompt: "${prompt}"
    `;

    const result = await model.generateContent(extractionPrompt);
    const city = result.response.text().trim();
    return city === 'não especificada' ? null : city;
  } catch (error) {
    console.error('Erro ao extrair cidade:', error);
    return null;
  }
}

// Função para determinar o tipo de consulta
export async function analyzeQuery(prompt) {
  try {
    const analysisPrompt = `
    Analise o seguinte prompt sobre clima e classifique em uma dessas categorias:
    - "atual": pergunta sobre o clima atual/agora
    - "previsao": pergunta sobre previsão do tempo/próximos dias
    - "geral": pergunta geral sobre clima
    
    Responda APENAS com uma das palavras: atual, previsao, ou geral.
    
    Prompt: "${prompt}"
    `;

    const result = await model.generateContent(analysisPrompt);
    return result.response.text().trim().toLowerCase();
  } catch (error) {
    console.error('Erro ao analisar consulta:', error);
    return 'atual';
  }
}

// Função para gerar resposta com Gemini
export async function generateWeatherResponse(prompt, weatherData, queryType) {
  try {
    let context = '';

    if (queryType === 'atual' && weatherData.current) {
      context = `
      Dados atuais do clima para ${weatherData.current.name}:
      - Temperatura: ${weatherData.current.main.temp}°C (sensação térmica: ${
        weatherData.current.main.feels_like
      }°C)
      - Condição: ${weatherData.current.weather[0].description}
      - Umidade: ${weatherData.current.main.humidity}%
      - Pressão: ${weatherData.current.main.pressure} hPa
      - Vento: ${weatherData.current.wind.speed} m/s
      - Visibilidade: ${weatherData.current.visibility / 1000} km
      - Coordenadas: ${weatherData.current.coord.lat}, ${
        weatherData.current.coord.lon
      }
      `;
    } else if (queryType === 'previsao' && weatherData.forecast) {
      context = `
      Previsão do tempo para ${weatherData.forecast.city.name} nos próximos dias:
      `;
      weatherData.forecast.list.slice(0, 8).forEach((item, index) => {
        const date = new Date(item.dt * 1000).toLocaleDateString('pt-BR');
        const time = new Date(item.dt * 1000).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        context += `
        ${date} às ${time}:
        - Temperatura: ${item.main.temp}°C
        - Condição: ${item.weather[0].description}
        - Umidade: ${item.main.humidity}%
        - Vento: ${item.wind.speed} m/s
        `;
      });
    }

    const responsePrompt = `
    Você é um assistente especializado em clima. Responda de forma natural, amigável e informativa em português brasileiro.
    
    Pergunta do usuário: "${prompt}"
    
    ${context}
    
    Baseado nos dados fornecidos, responda à pergunta do usuário de forma conversacional e útil. 
    Se apropriado, forneça dicas ou recomendações relacionadas ao clima.
    `;

    const result = await model.generateContent(responsePrompt);
    return result.response.text();
  } catch (error) {
    throw new Error(`Erro ao gerar resposta: ${error.message}`);
  }
}
