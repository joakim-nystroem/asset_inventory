import mysql from 'mysql2/promise';
import { env } from '$env/dynamic/private';

const pool = mysql.createPool({
  host: env.PRIVATE_DB_HOST,
  port: parseInt(env.PRIVATE_DB_PORT || '3306', 10),
  user: env.PRIVATE_DB_USER,
  password: env.PRIVATE_DB_PASSWORD,
  database: env.PRIVATE_DB_NAME,
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