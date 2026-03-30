"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
exports.ArchiveController = void 0;
const logger_1 = __importDefault(require("../core/utils/logger"));
const tsyringe_1 = require("tsyringe");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const config_1 = __importDefault(require("config"));
const navigation_manager_1 = __importDefault(require("../models/navigation/navigation-manager"));
const base_controller_1 = require("./base-controller");
const request_context_service_1 = require("../services/request-context.service");
let ArchiveController = class ArchiveController extends base_controller_1.BaseController {
    constructor(requestContext) {
        super(requestContext);
    }
    getFile(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const uid = req.params.uid;
            const uri = req.params.uri;
            logger_1.default.info('Archive file request received', {
                uid,
                uri,
                user: (_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.email
            });
            try {
                // Validate parameters
                if (!uid || !uri) {
                    logger_1.default.warn('Missing required parameters', { uid, uri });
                    res.status(400).json({
                        error: 'Bad Request',
                        message: 'Both uid and uri parameters are required'
                    });
                    return;
                }
                // Decode URI in case it's URL encoded
                const decodedUri = decodeURIComponent(uri);
                const basePath = config_1.default.get('archive.path');
                // get the item from NavigationManager
                const item = this.getItem(uid, res);
                if (!item) {
                    logger_1.default.warn('Navigation item not found', { uid });
                    res.status(404).json({
                        error: 'Not Found',
                        message: 'Navigation item not found'
                    });
                    return;
                }
                const archivePath = config_1.default.get('archive.path');
                const assumedRoot = config_1.default.get('archive.assumedRoot');
                const archiveRoot = item.rootUri.replace(assumedRoot, archivePath);
                const filePath = path.join(archiveRoot, decodedUri);
                // Security check: Ensure the resolved path is within the base directory
                if (!filePath.startsWith(path.resolve(basePath))) {
                    logger_1.default.error('Path traversal attempt detected', { uid, uri: decodedUri, resolvedPath: filePath });
                    res.status(403).json({
                        error: 'Forbidden',
                        message: 'Invalid file path'
                    });
                    return;
                }
                // Check if file exists
                if (!fs.existsSync(filePath)) {
                    logger_1.default.warn('File not found', { uid, uri: decodedUri, filePath });
                    res.status(404).json({
                        error: 'File not found',
                        message: `File not found: ${decodedUri}`
                    });
                    return;
                }
                // Get file stats
                const stats = fs.statSync(filePath);
                if (!stats.isFile()) {
                    logger_1.default.warn('Path is not a file', { uid, uri: decodedUri, filePath });
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
                    logger_1.default.error('Error streaming file', {
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
                logger_1.default.info('File served successfully', {
                    uid,
                    uri: decodedUri,
                    filePath,
                    fileSize: stats.size,
                    mimeType
                });
            }
            catch (error) {
                logger_1.default.error('Archive controller error', {
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
        });
    }
    // TODO: Should be moved to NavigationManager
    getItem(uid, res) {
        const items = navigation_manager_1.default.getValue();
        const item = items.find(x => x.uid === uid);
        if (!item) {
            res.status(404).json({ error: "Form not found" });
            logger_1.default.error('Form with ID not found', { uid });
            return;
        }
        return item;
    }
    getMimeType(extension) {
        const mimeTypes = {
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
};
ArchiveController = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [request_context_service_1.RequestContext])
], ArchiveController);
exports.ArchiveController = ArchiveController;
