import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializeDatabase } from './database/init';
import { ContactService } from './services/contactService';
import { IdentifyRequest } from './types';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const contactService = new ContactService();
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', message: 'Identity Reconciliation Service is running' });
});

app.post('/identify', async (req: Request, res: Response) => {
  try {
    const request: IdentifyRequest = req.body;

    if (!request.email && !request.phoneNumber) {
      return res.status(400).json({
        error: 'At least one of email or phoneNumber must be provided'
      });
    }

    const response = await contactService.identifyContact(request);

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error in /identify endpoint:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`Identify endpoint: http://localhost:${PORT}/identify`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
