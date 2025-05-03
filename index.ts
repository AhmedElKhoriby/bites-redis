import express from 'express';
import restaurantsRouter from './routes/restaurants.js';
import cuisinesRouter from './routes/cuisines.js';
import { errorHandler } from './middlewares/errorHandler.js';

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

app.use('/restaurants', restaurantsRouter);
app.use('/cuisines', cuisinesRouter);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the API!' });
});

app.use(errorHandler);

app
  .listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  })
  .on('error', (err) => {
    console.error('Error starting server:', err);
    process.exit(1);
  });
