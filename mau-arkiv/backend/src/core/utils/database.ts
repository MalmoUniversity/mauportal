import knex, { Knex } from 'knex';

import { knexConfig } from '../config/knex-config';


// Create and export the Knex instance
const db: Knex = knex(knexConfig);
export default db;
