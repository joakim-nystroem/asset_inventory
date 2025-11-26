import { createPool } from 'mysql2'; // You keep using mysql2!
import { Kysely, MysqlDialect } from 'kysely'

import type { Database } from './db_types';

import { 
  PRIVATE_DB_HOST, 
  PRIVATE_DB_PORT, 
  PRIVATE_DB_USER, 
  PRIVATE_DB_NAME, 
  PRIVATE_DB_PASSWORD 
} from '$env/static/private';


const dialect = new MysqlDialect({
  pool: createPool({
    host: PRIVATE_DB_HOST,
    port: parseInt(PRIVATE_DB_PORT || '3306', 10),
    user: PRIVATE_DB_USER,
    password: PRIVATE_DB_PASSWORD,
    database: PRIVATE_DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  })
});

export const db = new Kysely<Database>({
  dialect,
});