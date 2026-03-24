import { Request, Response } from "express";
import logger from "../core/utils/logger";
import { injectable } from "tsyringe";
import * as path from "path";
import * as fs from "fs";
import config from "config";
import navigationManager from "../models/navigation/navigation-manager";
import { NavigationItem } from "@mau-arkiv/shared";
import { BaseController } from "./base-controller";
import { RequestContext } from "../services/request-context.service";

@injectable()
export class ArchiveController extends BaseController {
    constructor(requestContext: RequestContext) {
        super(requestContext);
    }

    async getFile(req: Request, res: Response): Promise<void> {
        const uid = req.params.uid;
        const uri = req.params.uri;
        
        logger.info('Archive file request received', { 
            uid, 
            uri,
            user: this.currentUser?.email 
        });
        
        try {
            // Validate parameters
            if (!uid || !uri) {
                logger.warn('Missing required parameters', { uid, uri });
                res.status(400).json({ 
                    error: 'Bad Request', 
                    message: 'Both uid and uri parameters are required' 
                });
                return;
            }

            // Decode URI in case it's URL encoded
            const decodedUri = decodeURIComponent(uri);
            
            const basePath = config.get<string>('archive.path');

            // get the item from NavigationManager
            const item = this.getItem(uid, res);
            if (!item) {
                logger.warn('Navigation item not found', { uid });
                res.status(404).json({ 
                    error: 'Not Found', 
                    message: 'Navigation item not found' 
                });
                return;
            }

            const archivePath = config.get<string>('archive.path');
            const assumedRoot = config.get<string>('archive.assumedRoot');

            const archiveRoot = item.rootUri.replace(assumedRoot, archivePath);
            const filePath = path.join(archiveRoot, decodedUri);

            // Security check: Ensure the resolved path is within the base directory
            if (!filePath.startsWith(path.resolve(basePath))) {
                logger.error('Path traversal attempt detected', { uid, uri: decodedUri, resolvedPath: filePath });
                res.status(403).json({ 
                    error: 'Forbidden', 
                    message: 'Invalid file path' 
                });
                return;
            }

            // Check if file exists
            if (!fs.existsSync(filePath)) {
                logger.warn('File not found', { uid, uri: decodedUri, filePath });
                res.status(404).json({ 
                    error: 'File not found', 
                    message: `File not found: ${decodedUri}` 
                });
                return;
            }

            // Get file stats
            const stats = fs.statSync(filePath);
            if (!stats.isFile()) {
                logger.warn('Path is not a file', { uid, uri: decodedUri, filePath });
                res.status(400).json({ 
                    error: 'Bad Request', 
                    message: 'Path does not point to a file' 
                });
                return;
            }

            // Set appropriate headers
            const fileExtension = path.extname(filePath).toLowerCase();
            const mimeType = this.getMimeType(fileExtension);
            
            res.setHeader('Content-Type', mimeType);
            res.setHeader('Content-Length', stats.size);
            res.setHeader('Content-Disposition', `inline; filename="${path.basename(filePath)}"`);

            // Stream the file
            const fileStream = fs.createReadStream(filePath);
            
            fileStream.on('error', (error) => {
                logger.error('Error streaming file', { 
                    uid, 
                    uri: decodedUri, 
                    filePath, 
                    error: error.message 
                });
                if (!res.headersSent) {
                    res.status(500).json({ 
                        error: 'Internal Server Error', 
                        message: 'Error reading file' 
                    });
                }
            });

            fileStream.pipe(res);
            
            logger.info('File served successfully', { 
                uid, 
                uri: decodedUri, 
                filePath, 
                fileSize: stats.size,
                mimeType 
            });

        } catch (error: any) {
            logger.error('Archive controller error', {
                uid,
                uri,
                errorMessage: error.message,
                errorStack: error.stack
            });
            
            if (!res.headersSent) {
                res.status(500).json({
                    error: 'Internal Server Error',
                    message: 'An error occurred while processing the file request'
                });
            }
        }
    }

     // TODO: Should be moved to NavigationManager
        private getItem(uid: string, res: Response): NavigationItem | undefined {
            const items = navigationManager.getValue();
            const item = items.find(x => x.uid === uid);
    
            if (!item) {
                res.status(404).json({ error: "Form not found" });
                logger.error('Form with ID not found', { uid });
                return;
            }
    
    
            return item;
        }
    

    private getMimeType(extension: string): string {
        const mimeTypes: { [key: string]: string } = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.ppt': 'application/vnd.ms-powerpoint',
            '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            '.txt': 'text/plain',
            '.htm': 'text/html',
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml',
            '.mp4': 'video/mp4',
            '.mp3': 'audio/mpeg',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed'
        };

        return mimeTypes[extension] || 'application/octet-stream';
    }
}
