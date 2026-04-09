import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/v1', (req, res) => {
  res.json({ message: 'Meetz API' });
});

app.use('/api/v1/auth', authRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
