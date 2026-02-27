import pool from './connection';

const createTableQuery = `
CREATE TABLE IF NOT EXISTS Contact (
  id SERIAL PRIMARY KEY,
  phoneNumber VARCHAR(50),
  email VARCHAR(255),
  linkedId INTEGER REFERENCES Contact(id),
  linkPrecedence VARCHAR(20) CHECK (linkPrecedence IN ('primary', 'secondary')) NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  deletedAt TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_contact_email ON Contact(email);
CREATE INDEX IF NOT EXISTS idx_contact_phone ON Contact(phoneNumber);
CREATE INDEX IF NOT EXISTS idx_contact_linkedId ON Contact(linkedId);
`;

export async function initializeDatabase() {
  try {
    await pool.query(createTableQuery);
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
      process.exit(1);
    });
}
