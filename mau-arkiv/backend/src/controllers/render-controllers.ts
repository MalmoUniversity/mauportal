import { Request, Response } from "express";
import logger from "../core/utils/logger";
import { injectable } from "tsyringe";
import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";
import { promisify } from "util";
import config from "config";
import navigationManager from "../models/navigation/navigation-manager";
import { NavigationItem } from "@mau-arkiv/shared";
import { BaseController } from "./base-controller";
import { RequestContext } from "../services/request-context.service";

const execFileAsync = promisify(execFile);

@injectable()
export class RenderController extends BaseController {
    constructor(requestContext: RequestContext) {
        super(requestContext);
    }

    async renderFile(req: Request, res: Response): Promise<void> {
        const uid = req.params.uid;
        const uri = req.params.uri;

        logger.info('Render request received', {
            uid,
            uri,
            user: this.currentUser?.email
        });

        try {
            if (!uid || !uri) {
                res.status(400).json({ error: 'Bad Request', message: 'Both uid and uri are required' });
                return;
            }

            const decodedUri = decodeURIComponent(uri);

            const basePath     = config.get<string>('archive.path');
            const assumedRoot  = config.get<string>('archive.assumedRoot');

            // Resolve the navigation item — same as ArchiveController
            const item = this.getItem(uid, res);
            if (!item) return;

            const archiveRoot = item.rootUri.replace(assumedRoot, basePath);
            const xmlPath     = path.join(archiveRoot, decodedUri);

            // Security: must stay within the archive base path
            if (!xmlPath.startsWith(path.resolve(basePath))) {
                logger.error('Path traversal attempt', { uid, uri: decodedUri, xmlPath });
                res.status(403).json({ error: 'Forbidden', message: 'Invalid file path' });
                return;
            }

            if (!fs.existsSync(xmlPath)) {
                logger.warn('XML file not found', { xmlPath });
                res.status(404).json({ error: 'Not Found', message: `File not found: ${decodedUri}` });
                return;
            }

            // Parse <?xml-stylesheet href="..."> from the XML
            const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
            const xslHref    = this.extractStylesheetHref(xmlContent);

            if (!xslHref) {
                logger.warn('No xml-stylesheet PI found', { xmlPath });
                res.status(400).json({ error: 'Bad Request', message: 'No xml-stylesheet processing instruction found' });
                return;
            }

            // Resolve XSL relative to the XML — stays inside the package
            const xslPath = path.resolve(path.dirname(xmlPath), xslHref);

            // Security: XSL must also be within the archive base path
            if (!xslPath.startsWith(path.resolve(basePath))) {
                logger.error('XSL path traversal attempt', { uid, xslPath });
                res.status(403).json({ error: 'Forbidden', message: 'Invalid stylesheet path' });
                return;
            }

            if (!fs.existsSync(xslPath)) {
                logger.warn('XSL file not found', { xslPath });
                res.status(404).json({ error: 'Not Found', message: `Stylesheet not found: ${xslHref}` });
                return;
            }

            logger.info('Running xsltproc', { xslPath, xmlPath });
            const { stdout } = await execFileAsync('xsltproc', [xslPath, xmlPath]);

            // Inject <base> so relative assets (CSS, images) resolve correctly
            // via the existing static /archive/:uid/ route
            const xmlDir    = path.dirname(decodedUri);
            const baseHref  = `/archive/${uid}/${xmlDir}/`;
            const html      = stdout.replace('<head>', `<head>\n  <base href="${baseHref}">`);

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);

            logger.info('Render successful', { uid, uri: decodedUri });

        } catch (error: any) {
            logger.error('RenderController error', {
                uid,
                uri,
                errorMessage: error.message,
                errorStack: error.stack
            });

            if (!res.headersSent) {
                res.status(500).json({ error: 'Internal Server Error', message: 'Transformation failed' });
            }
        }
    }

    private extractStylesheetHref(xmlContent: string): string | null {
        const match = xmlContent.match(/<\?xml-stylesheet[^?]*href="([^"]+)"/);
        return match ? match[1] : null;
    }

    private getItem(uid: string, res: Response): NavigationItem | undefined {
        const item = navigationManager.getItemByUid(uid);

        if (!item) {
            res.status(404).json({ error: 'Not Found', message: 'Navigation item not found' });
            logger.error('Navigation item not found', { uid });
            return undefined;
        }

        return item;
    }
}
