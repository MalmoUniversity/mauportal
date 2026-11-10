"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchController = void 0;
const tsyringe_1 = require("tsyringe");
const navigation_manager_1 = __importDefault(require("../models/navigation/navigation-manager"));
const config_1 = __importDefault(require("config"));
const logger_1 = __importDefault(require("../core/utils/logger"));
const base_controller_1 = require("./base-controller");
const request_context_service_1 = require("../services/request-context.service");
const mssql_1 = __importDefault(require("mssql"));
let SearchController = class SearchController extends base_controller_1.BaseController {
    constructor(requestContext) {
        super(requestContext);
    }
    search(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const uidParam = req.params.uid;
            if (!uidParam || Array.isArray(uidParam)) {
                res.status(400).json({ error: 'Bad Request', message: 'uid parameter is required' });
                return;
            }
            const uid = uidParam;
            // Access current user if needed
            if (this.currentUser) {
                logger_1.default.info('Search request from authenticated user', {
                    uid,
                    user: this.currentUser.email
                });
            }
            let pool;
            try {
                const { formId, params, orderBy, page, pageSize } = req.body;
                const form = this.getForm(uid, res);
                logger_1.default.info('Received search request for form ID', { uid });
                if (!form) {
                    logger_1.default.warn('Form with ID not found', { uid });
                    res.status(404).json({ error: 'Form not found' });
                    return;
                }
                logger_1.default.info('Found form with ID', { uid: form.uid });
                if (!form.database) {
                    logger_1.default.error('Database configuration not found for form', { uid });
                    res.status(500).json({
                        error: 'Configuration error',
                        message: 'Database configuration is missing in the form configuration'
                    });
                    return;
                }
                logger_1.default.debug('Form database configuration', { databaseConfig: form.database });
                if (!form.database.statement || !form.database.countStatement) {
                    logger_1.default.error('SQL statements not found in configuration for form', { uid });
                    res.status(500).json({
                        error: 'Configuration error',
                        message: 'SQL statements are missing in the form configuration'
                    });
                    return;
                }
                logger_1.default.info('Creating SQL connection pool...');
                const rawDbConfig = (_a = config_1.default.get('database').find((c) => c.name === form.database.connection)) === null || _a === void 0 ? void 0 : _a.config;
                if (!rawDbConfig) {
                    logger_1.default.error('Database configuration for connection not found', { connection: form.database.connection });
                    res.status(500).json({
                        error: 'Configuration error',
                        message: `Database configuration for connection '${form.database.connection}' is missing`
                    });
                    return;
                }
                const dbConfig = Object.assign({}, rawDbConfig);
                logger_1.default.debug('Database configuration used for connection', { dbConfig });
                pool = yield mssql_1.default.connect(dbConfig);
                logger_1.default.info('Connection pool created successfully');
                const request = pool.request();
                const effectiveOrderBy = this.getEffectiveOrderBy(orderBy, form);
                const effectivePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1;
                const effectivePageSize = this.getEffectivePageSize(form, pageSize);
                let sqlQuery = form.database.statement;
                logger_1.default.debug('Original SQL query', { sqlQuery });
                sqlQuery = this.applyPagingAndOrder(sqlQuery, effectiveOrderBy, effectivePage, effectivePageSize);
                sqlQuery = this.applyParameters(request, params, sqlQuery);
                logger_1.default.debug('Processed SQL query', { sqlQuery });
                logger_1.default.info('Executing SQL query...');
                const result = yield request.query(sqlQuery);
                logger_1.default.info('Query result recordset length', { length: result.recordset.length });
                const countRequest = pool.request(); // Reset the request for the count query
                let countQuery = form.database.countStatement;
                countQuery = this.applyParameters(countRequest, params, countQuery);
                logger_1.default.debug('Executing count query', { countQuery });
                const countResult = yield countRequest.query(countQuery);
                let totalCount = 0;
                if (countResult.recordset && countResult.recordset.length > 0) {
                    totalCount = countResult.recordset[0][Object.keys(countResult.recordset[0])[0]] || 0;
                }
                logger_1.default.info('Total count', { totalCount });
                const processedRecords = this.processRecordsUrls(uid, form, result);
                // Close the connection
                yield pool.close();
                logger_1.default.info('Connection pool closed');
                const response = {
                    rows: processedRecords,
                    totalCount: totalCount,
                    page: effectivePage,
                    pageSize: effectivePageSize
                };
                logger_1.default.info('Sending response with record count', { recordCount: response.rows.length });
                res.json(response);
            }
            catch (error) {
                logger_1.default.error('Search operation failed', {
                    errorMessage: error.message,
                    errorStack: error.stack,
                    requestBody: req.body,
                    uid
                });
                if (pool) {
                    try {
                        yield pool.close();
                        logger_1.default.info('Connection pool closed');
                    }
                    catch (closeError) {
                        logger_1.default.error('Error closing connection pool', { closeError });
                    }
                }
                res.status(500).json({
                    error: 'Database error',
                    message: error.message
                });
            }
        });
    }
    // This method processes the URLs in the result records based on the form configuration and the parent UID. It modifies the recordset to include the correct URLs for each record.
    processRecordsUrls(uid, form, result) {
        var _a;
        const parentUid = (_a = navigation_manager_1.default.getValue().find(x => x.uid === uid)) === null || _a === void 0 ? void 0 : _a.parentUid;
        const urlIndices = form.resultColumns.filter((col) => col.href).map((col) => col.href);
        const dataKeys = result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [];
        form.resultColumns.forEach((col, index) => {
            col.dbName = dataKeys[index];
        });
        const urlColumns = urlIndices.map((index) => dataKeys[index]);
        const processedRecords = result.recordset.map((record) => {
            var _a;
            const xslTransform = (_a = config_1.default.get('archive.xslTransform')) !== null && _a !== void 0 ? _a : 'server';
            urlColumns.forEach((colName) => {
                if (record[colName]) {
                    const fileUri = record[colName];
                    record[colName] = `/archive/${parentUid}/${fileUri}`;
                    const isXml = fileUri.toLowerCase().endsWith('.xml');
                    if (isXml) {
                        if (xslTransform !== 'client') { // Default to server-side transform if not explicitly set to "client"
                            record[colName] = `/api/render/${parentUid}/${fileUri}`;
                        }
                    }
                }
            });
            return record;
        });
        return processedRecords;
    }
    // This method determines the effective page size based on the form configuration and the provided pageSize parameter. 
    // Page size is the one user has selected if user has not selected any page size then it will take the one from form configuration otherwise the default is 10.
    getEffectivePageSize(form, pageSize) {
        const configuredPageSize = (form.database.paging && form.database.paging.pageSize) || 10;
        const effectivePageSize = Number.isInteger(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : configuredPageSize;
        return effectivePageSize;
    }
    getEffectiveOrderBy(orderBy, form) {
        var _a, _b;
        const options = (_a = form.orderBy) === null || _a === void 0 ? void 0 : _a.options;
        if (!Array.isArray(options) || options.length === 0) {
            return ''; // no allowlist configured, ignore client value
        }
        const allowed = options.map((o) => o.value);
        if (orderBy && allowed.includes(orderBy)) {
            return orderBy;
        }
        return ((_b = options[form.orderBy.defaultOption || 0]) === null || _b === void 0 ? void 0 : _b.value) || '';
    }
    applyPagingAndOrder(sqlQuery, effectiveOrderBy, effectivePage, effectivePageSize) {
        sqlQuery = sqlQuery.replace(/\{0\}/g, `${effectiveOrderBy || ''}`);
        sqlQuery = sqlQuery.replace(/\{1\}/g, `${effectivePage}`);
        sqlQuery = sqlQuery.replace(/\{2\}/g, `${effectivePageSize}`);
        return sqlQuery;
    }
    // TODO: Should be moved to NavigationManager
    getForm(uid, res) {
        const item = navigation_manager_1.default.getItemByUid(uid);
        if (!item) {
            res.status(404).json({ error: "Form not found" });
            logger_1.default.error('Form with ID not found', { uid });
            return;
        }
        const form = item === null || item === void 0 ? void 0 : item.form;
        if (!form) {
            res.status(404).json({ error: "Form configuration not found" });
            logger_1.default.error('Form configuration for ID not found', { uid });
            return;
        }
        return form;
    }
    applyParameters(request, params, sqlQuery) {
        if (Array.isArray(params) && params.length > 0) {
            const safeParamLength = Math.min(params.length, 100); // Limit to 100 parameters to prevent excessive replacements
            for (let i = 1; i <= safeParamLength; i++) {
                const safeName = `__param_${i}`;
                const paramValue = params[i - 1].value || '';
                sqlQuery = sqlQuery.replace("?", `@${safeName}`);
                request.input(safeName, paramValue);
            }
        }
        return sqlQuery;
    }
};
exports.SearchController = SearchController;
exports.SearchController = SearchController = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [request_context_service_1.RequestContext])
], SearchController);
