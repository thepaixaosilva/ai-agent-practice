import express from 'express';
import { gemini } from './gemini.js';

const app = express();
const port = 3000;

app.use(express.json());

app.post('/gemini', async (req, res) => {
  const { prompt } = req.body;
  const result = await gemini(prompt);
  res.send(result);
});

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});