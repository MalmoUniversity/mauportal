"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PortalConfigParser = void 0;
const fs_1 = require("fs");
const hjson_1 = __importDefault(require("hjson"));
const path_1 = __importDefault(require("path"));
const logger_1 = __importDefault(require("./logger"));
class PortalConfigParser {
    constructor(configRoot) {
        this.configRoot = configRoot;
        logger_1.default.debug('Portal config parser initialized', { configRoot });
    }
    getJson(configPath) {
        const filePath = path_1.default.join(this.configRoot, configPath);
        logger_1.default.debug('Loading config file', { filePath });
        try {
            const fileContent = (0, fs_1.readFileSync)(filePath, "utf-8");
            const data = hjson_1.default.parse(fileContent);
            logger_1.default.info('Config file loaded successfully', {
                filePath,
                hasGroups: Array.isArray(data.groups),
                groupCount: Array.isArray(data.groups) ? data.groups.length : 0
            });
            if (Array.isArray(data.groups)) {
                for (let i = 0; i < data.groups.length; i++) {
                    const element = data.groups[i];
                    if (element.import) {
                        try {
                            logger_1.default.debug('Importing nested config file', {
                                importPath: element.import,
                                parentFile: filePath
                            });
                            data.groups[i] = this.getJson(element.import);
                            logger_1.default.debug('Nested config file imported successfully', {
                                importPath: element.import
                            });
                        }
                        catch (err) {
                            element.error = err.message;
                            logger_1.default.error('Error importing nested config file', {
                                importPath: element.import,
                                parentFile: filePath,
                                error: err.message
                            });
                        }
                    }
                }
            }
            return data;
        }
        catch (error) {
            logger_1.default.error('Error loading config file', {
                filePath,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }
}
exports.PortalConfigParser = PortalConfigParser;
