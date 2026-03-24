import { readFileSync } from "fs";
import hjson from "hjson";
import path from "path";
import logger from "./logger";

export class PortalConfigParser {
    configRoot: string;

    constructor(configRoot: string) {
        this.configRoot = configRoot;
        logger.debug('Portal config parser initialized', { configRoot });
    }

    getJson(configPath: string): any {
        const filePath = path.join(this.configRoot, configPath);
        
        logger.debug('Loading config file', { filePath });
        
        try {
            const fileContent = readFileSync(filePath, "utf-8");
            const data = hjson.parse(fileContent);
            
            logger.info('Config file loaded successfully', { 
                filePath,
                hasGroups: Array.isArray(data.groups),
                groupCount: Array.isArray(data.groups) ? data.groups.length : 0
            });

            if (Array.isArray(data.groups)) {
                for (let i = 0; i < data.groups.length; i++) {
                    const element = data.groups[i];
                    if (element.import) {
                        try {
                            logger.debug('Importing nested config file', { 
                                importPath: element.import,
                                parentFile: filePath 
                            });
                            
                            data.groups[i] = this.getJson(element.import);
                            
                            logger.debug('Nested config file imported successfully', { 
                                importPath: element.import 
                            });
                        } catch (err: any) {
                            element.error = err.message;
                            
                            logger.error('Error importing nested config file', {
                                importPath: element.import,
                                parentFile: filePath,
                                error: err.message
                            });
                        }
                    }
                }
            }
            
            return data;
        } catch (error) {
            logger.error('Error loading config file', {
                filePath,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }
}