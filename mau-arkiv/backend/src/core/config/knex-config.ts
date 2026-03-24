import type { Knex } from "knex";
import  config  from 'config';

const dbConfig = config.get<any[]>('database').find((c: any) => c.name === 'Arkiv_app')?.config;

// Transform mssql config format to Knex format
const transformedConfig = dbConfig ? {
    server: dbConfig.server,
    database: dbConfig.database || dbConfig.options?.database,
    user: dbConfig.authentication?.options?.userName || dbConfig.user,
    password: dbConfig.authentication?.options?.password || dbConfig.password,
    port: dbConfig.options?.port,
    options: {
        encrypt: dbConfig.options?.encrypt || false,
        trustServerCertificate: dbConfig.options?.trustServerCertificate || true,
        enableArithAbort: true,
    }
} : {};

// Database configuration for Knex
export const knexConfig:  Knex.Config  = {
    client: "mssql",
    connection: transformedConfig,
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: "knex_migrations",
      directory: "./database/migrations", // Relative to the knex-config file location
      extension: "js",
      loadExtensions: ['.js']
    },
    seeds: {
      directory: "./database/seeds", // Relative to the knex-config file location
      extension: "js",
      loadExtensions: ['.js']
    }
};