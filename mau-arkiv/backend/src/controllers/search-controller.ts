import { Request, Response } from "express";
import { injectable } from "tsyringe";
import navigationManager from "../models/navigation/navigation-manager";
import config from "config";
import { SearchPayload, SearchResult } from "@mau-arkiv/shared";

import logger from "../core/utils/logger";
import { BaseController } from "./base-controller";
import { RequestContext } from "../services/request-context.service";
import sql from "mssql";

@injectable()
export class SearchController extends BaseController {
    constructor(requestContext: RequestContext) {
        super(requestContext);
    }
    async search(req: Request, res: Response): Promise<void> {
        const uidParam = req.params.uid;

        if (!uidParam || Array.isArray(uidParam)) {
            res.status(400).json({ error: 'Bad Request', message: 'uid parameter is required' });
            return;
        }
        const uid = uidParam;

        // Access current user if needed
        if (this.currentUser) {
            logger.info('Search request from authenticated user', {
                uid,
                user: this.currentUser.email
            });
        }
        let pool;
        try {
            const { formId, params, orderBy, page, pageSize }: SearchPayload = req.body;
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
            const effectiveOrderBy = this.getEffectiveOrderBy(orderBy, form);
            const effectivePage = Number.isInteger(Number(page)) && Number(page) > 0 ? Number(page) : 1;
            const effectivePageSize = this.getEffectivePageSize(form, pageSize);

            let sqlQuery = form.database.statement;
            logger.debug('Original SQL query', { sqlQuery });

            sqlQuery = this.applyPagingAndOrder(sqlQuery, effectiveOrderBy, effectivePage, effectivePageSize);
            sqlQuery = this.applyParameters(request, params, sqlQuery);

            logger.debug('Processed SQL query', { sqlQuery });

            logger.info('Executing SQL query...');
            const result = await request.query(sqlQuery);
            logger.info('Query result recordset length', { length: result.recordset.length });

            const countRequest = pool.request(); // Reset the request for the count query
            let countQuery = form.database.countStatement;
            countQuery = this.applyParameters(countRequest, params, countQuery);
            logger.debug('Executing count query', { countQuery });
            const countResult = await countRequest.query(countQuery);
            let totalCount = 0;
            if (countResult.recordset && countResult.recordset.length > 0) {
                totalCount = countResult.recordset[0][Object.keys(countResult.recordset[0])[0]] || 0;
            }
            logger.info('Total count', { totalCount });

            const processedRecords = this.processRecordsUrls(uid, form, result);

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

    // This method processes the URLs in the result records based on the form configuration and the parent UID. It modifies the recordset to include the correct URLs for each record.
    private processRecordsUrls(uid: string, form: any, result: sql.IResult<any>) {
        const parentUid = navigationManager.getValue().find(x => x.uid === uid)?.parentUid;

        const urlIndices = form.resultColumns.filter((col: any) => col.href).map((col: any) => col.href);
        const dataKeys = result.recordset.length > 0 ? Object.keys(result.recordset[0]) : [];
        form.resultColumns.forEach((col: any, index: number) => {
            col.dbName = dataKeys[index];
        });
        const urlColumns = urlIndices.map((index: number) => dataKeys[index]);

        const processedRecords = result.recordset.map((record: any) => {

            const xslTransform = config.get<string>('archive.xslTransform') ?? 'server';

            urlColumns.forEach((colName: string) => {
                if (record[colName]) {
                    const fileUri = record[colName] as string;
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
    private getEffectivePageSize(form: any, pageSize: number | undefined) {
        const configuredPageSize = (form.database.paging && form.database.paging.pageSize) || 10;
        const effectivePageSize = Number.isInteger(Number(pageSize)) && Number(pageSize) > 0 ? Number(pageSize) : configuredPageSize;
        return effectivePageSize;
    }

    private getEffectiveOrderBy(orderBy: string | undefined, form: any) : string {
        let effectiveOrderBy = orderBy;
        if (form.orderBy && form.orderBy.options && form.orderBy.options.length > 0) {
            const allowedOrderByValues = form.orderBy.options.map((o: any) => o.value);
            if (!effectiveOrderBy || !allowedOrderByValues.includes(effectiveOrderBy)) {
                effectiveOrderBy = form.orderBy.options[form.orderBy.defaultOption || 0]?.value;
            }
        }
        return effectiveOrderBy || '';
    }

    private applyPagingAndOrder(sqlQuery: string, effectiveOrderBy: string, effectivePage: number, effectivePageSize: number) {
        sqlQuery = sqlQuery.replace(/\{0\}/g, `${effectiveOrderBy || ''}`);
        sqlQuery = sqlQuery.replace(/\{1\}/g, `${effectivePage}`);
        sqlQuery = sqlQuery.replace(/\{2\}/g, `${effectivePageSize}`);
        return sqlQuery;
    }

    // TODO: Should be moved to NavigationManager
    private getForm(uid: string, res: Response): any {
        const item = navigationManager.getItemByUid(uid);

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

    private applyParameters(request: sql.Request, params: any, sqlQuery: string) {
        if (Array.isArray(params) && params.length > 0) {
            const numberedParameters = sqlQuery.includes('@v1');
            for (let i = 1; i <= params.length; i++) {
                const rawName = numberedParameters ? `__param_${i}` : `${params[i - 1].name || ''}`;
                const safeName = rawName.replace(/[^a-zA-Z0-9_]/g, '');
                if (!safeName) {
                    continue;
                }

                const paramNameWithAt = `@${safeName}`;
                const paramValue = params[i - 1].value || '';
                sqlQuery = sqlQuery.replace("?", paramNameWithAt);
                // sqlQuery = sqlQuery.replace(`SET ${paramNameWithAt} = ?;`, `SET ${paramNameWithAt} = '${paramValue}';`);
                request.input(safeName, paramValue);
            }
        }
        return sqlQuery;
    }
}
