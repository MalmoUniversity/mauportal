import { Request, Response } from "express";
import { injectable } from "tsyringe";
import navigationManager from "../models/navigation/navigation-manager";
import config from "config";
import { SearchResult } from "@mau-arkiv/shared";

import logger from "../core/utils/logger";
import { BaseController } from "./base-controller";
import { RequestContext } from "../services/request-context.service";

@injectable()
export class SearchController extends BaseController {
    constructor(requestContext: RequestContext) {
        super(requestContext);
    }

    async search(req: Request, res: Response): Promise<void> {
        const sql = require('mssql');

        const uid = req.params.uid;

        // Access current user if needed
        if (this.currentUser) {
            logger.info('Search request from authenticated user', { 
                uid,
                user: this.currentUser.email 
            });
        }

        let pool;
        try {
            const { formId, params, orderBy, page, pageSize } = req.body;
            const form = this.getForm(uid, res);
        

            logger.info('Received search request for form ID', { uid });

            if (!form) {
                logger.warn('Form with ID not found', { uid });
                res.status(404).json({ error: 'Form not found' });
                return;
            }

            
            
            logger.info('Found form with ID', { uid: form.uid });
            if (!form.database) {
                logger.error('Database configuration not found for form', { uid });
                res.status(500).json({
                    error: 'Configuration error',
                    message: 'Database configuration is missing in the form configuration'
                });
                return;
            }

            logger.debug('Form database configuration', { databaseConfig: form.database });

            if (!form.database.statement || !form.database.countStatement) {
                logger.error('SQL statements not found in configuration for form', { uid });
                res.status(500).json({
                    error: 'Configuration error',
                    message: 'SQL statements are missing in the form configuration'
                });
                return;
            }
            logger.info('Creating SQL connection pool...');
            const dbConfig = config.get<any[]>('database').find((c: any) => c.name === form.database.connection)?.config;
            
            if (!dbConfig) {
                logger.error('Database configuration for connection not found', { connection: form.database.connection });
                res.status(500).json({
                    error: 'Configuration error',
                    message: `Database configuration for connection '${form.database.connection}' is missing`
                });
                return;
            }
            logger.debug('Database configuration used for connection', { dbConfig });

            pool = await sql.connect(dbConfig);
            logger.info('Connection pool created successfully');
            const request = pool.request();
            let effectiveOrderBy = orderBy;
            if (!effectiveOrderBy && form.orderBy && form.orderBy.options) {
                effectiveOrderBy = form.orderBy.options[form.orderBy.defaultOption || 0]?.value;
            }

            const effectivePage = page || 1;
            const effectivePageSize = pageSize ||
                (form.database.paging && form.database.paging.pageSize) || 10;
            let sqlQuery = form.database.statement;
            logger.debug('Original SQL query', { sqlQuery });
            
            sqlQuery = sqlQuery.replace(/\{0\}/g, effectiveOrderBy);
            sqlQuery = sqlQuery.replace(/\{1\}/g, effectivePage);
            sqlQuery = sqlQuery.replace(/\{2\}/g, effectivePageSize);   
            
            sqlQuery = this.applyParameters(params, sqlQuery); 

            logger.debug('Processed SQL query', { sqlQuery });
           
            logger.info('Executing SQL query...');
            const result = await request.query(sqlQuery);
            logger.info('Query result recordset length', { length: result.recordset.length });
            let countQuery = form.database.countStatement;
            countQuery = this.applyParameters(params, countQuery);
            logger.debug('Executing count query', { countQuery });
            const countResult = await request.query(countQuery);
            let totalCount = 0;
            if (countResult.recordset && countResult.recordset.length > 0) {
                totalCount = countResult.recordset[0][Object.keys(countResult.recordset[0])[0]] || 0;
            }
            logger.info('Total count', { totalCount });

            const parentUid = navigationManager.getValue().find(x => x.uid  === uid)?.parentUid;
            
            const urlIndices = form.resultColumns.filter((col: any) => col.href).map((col: any) => col.href);
            const dataKeys = result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [];
            form.resultColumns.forEach((col: any, index: number) => {
                col.dbName = dataKeys[index];
            });
            const urlColumns = urlIndices.map((index: number) => dataKeys[index]);

            const processedRecords = result.recordset.map((record: any) => {
                
                urlColumns.forEach((colName: string) => {
                    if (record[colName]) {
                        record[colName] = `/archive/${parentUid}/${record[colName]}`;
                    }
                });
                
                return record;
             });
             
            // Close the connection
            await pool.close();
            logger.info('Connection pool closed');
            const response = {
                rows: processedRecords,
                totalCount: totalCount,
                page: effectivePage,
                pageSize: effectivePageSize

            } as SearchResult;
            logger.info('Sending response with record count', { recordCount: response.rows.length });
            res.json(response);
        } catch (error: any) {
            logger.error('Search operation failed', {
                errorMessage: error.message,
                errorStack: error.stack,
                requestBody: req.body,
                uid
            });
            if (pool) {
                try {
                    await pool.close();
                    logger.info('Connection pool closed');
                } catch (closeError) {
                    logger.error('Error closing connection pool', { closeError });
                }
            }
            res.status(500).json({
                error: 'Database error',
                message: error.message
            });
        }
    }

    // TODO: Should be moved to NavigationManager
    private getForm(uid: string, res: Response): any {
        const items = navigationManager.getValue();
        const item = items.find(x => x.uid === uid);

        if (!item) {
            res.status(404).json({ error: "Form not found" });
            logger.error('Form with ID not found', { uid });
            return;
        }

        const form = item?.form;
        if (!form) {
            res.status(404).json({ error: "Form configuration not found" });
            logger.error('Form configuration for ID not found', { uid });
            return;
        }

        return form;
    }

    private applyParameters(params: any, sqlQuery: any) {
        if ((!params || params.length > 0)) {
            const numberedParameters = sqlQuery.includes('@v1');
            for (let i = 1; i <= params.length; i++) {
                const paramName = numberedParameters ? `@v${i}` : `@${params[i - 1].name}`;
                sqlQuery = sqlQuery.replace(`SET ${paramName} = ?;`, `SET ${paramName} = '${params[i - 1].value || ''}';`);
            }
        }
        return sqlQuery;
    }
}