import mysql from 'mysql2/promise';
import { 
  PRIVATE_DB_HOST, 
  PRIVATE_DB_PORT, 
  PRIVATE_DB_USER, 
  PRIVATE_DB_NAME, 
  PRIVATE_DB_PASSWORD 
} from '$env/static/private';

const pool = mysql.createPool({
  host: PRIVATE_DB_HOST,
  port: parseInt(PRIVATE_DB_PORT || '3306', 10),
  user: PRIVATE_DB_USER,
  password: PRIVATE_DB_PASSWORD,
  database: PRIVATE_DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Log connection status
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully!');
    connection.release();
  })
  .catch(err => {
    console.error('Error connecting to database:', err.message);
  });

// Export the pool to be used in server-side load functions and form actions
export default pool;