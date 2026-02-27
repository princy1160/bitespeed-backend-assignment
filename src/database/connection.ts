import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Support both DATABASE_URL (Render) and individual variables (local)
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'identity_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };

export const pool = new Pool(poolConfig);

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
