"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j;
Object.defineProperty(exports, "__esModule", { value: true });
exports.knexConfig = void 0;
const config_1 = __importDefault(require("config"));
const dbConfig = (_a = config_1.default.get('database').find((c) => c.name === 'Arkiv_app')) === null || _a === void 0 ? void 0 : _a.config;
// Transform mssql config format to Knex format
const transformedConfig = dbConfig ? {
    server: dbConfig.server,
    database: dbConfig.database || ((_b = dbConfig.options) === null || _b === void 0 ? void 0 : _b.database),
    user: ((_d = (_c = dbConfig.authentication) === null || _c === void 0 ? void 0 : _c.options) === null || _d === void 0 ? void 0 : _d.userName) || dbConfig.user,
    password: ((_f = (_e = dbConfig.authentication) === null || _e === void 0 ? void 0 : _e.options) === null || _f === void 0 ? void 0 : _f.password) || dbConfig.password,
    port: (_g = dbConfig.options) === null || _g === void 0 ? void 0 : _g.port,
    options: {
        encrypt: ((_h = dbConfig.options) === null || _h === void 0 ? void 0 : _h.encrypt) || false,
        trustServerCertificate: ((_j = dbConfig.options) === null || _j === void 0 ? void 0 : _j.trustServerCertificate) || true,
        enableArithAbort: true,
    }
} : {};
// Database configuration for Knex
exports.knexConfig = {
    client: "mssql",
    connection: transformedConfig,
    pool: {
        min: 2,
        max: 10,
    },
    migrations: {
        tableName: "knex_migrations",
        directory: "./database/migrations",
        extension: "js",
        loadExtensions: ['.js']
    },
    seeds: {
        directory: "./database/seeds",
        extension: "js",
        loadExtensions: ['.js']
    }
};
