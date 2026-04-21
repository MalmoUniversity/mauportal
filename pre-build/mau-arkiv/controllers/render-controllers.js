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
exports.RenderController = void 0;
const logger_1 = __importDefault(require("../core/utils/logger"));
const tsyringe_1 = require("tsyringe");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const config_1 = __importDefault(require("config"));
const navigation_manager_1 = __importDefault(require("../models/navigation/navigation-manager"));
const base_controller_1 = require("./base-controller");
const request_context_service_1 = require("../services/request-context.service");
const execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
let RenderController = class RenderController extends base_controller_1.BaseController {
    constructor(requestContext) {
        super(requestContext);
    }
    renderFile(req, res) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const uid = req.params.uid;
            const uri = req.params.uri;
            logger_1.default.info('Render request received', {
                uid,
                uri,
                user: (_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.email
            });
            try {
                if (!uid || !uri) {
                    res.status(400).json({ error: 'Bad Request', message: 'Both uid and uri are required' });
                    return;
                }
                const decodedUri = decodeURIComponent(uri);
                const basePath = config_1.default.get('archive.path');
                const assumedRoot = config_1.default.get('archive.assumedRoot');
                // Resolve the navigation item — same as ArchiveController
                const item = this.getItem(uid, res);
                if (!item)
                    return;
                const archiveRoot = item.rootUri.replace(assumedRoot, basePath);
                const xmlPath = path.join(archiveRoot, decodedUri);
                // Security: must stay within the archive base path
                if (!xmlPath.startsWith(path.resolve(basePath))) {
                    logger_1.default.error('Path traversal attempt', { uid, uri: decodedUri, xmlPath });
                    res.status(403).json({ error: 'Forbidden', message: 'Invalid file path' });
                    return;
                }
                if (!fs.existsSync(xmlPath)) {
                    logger_1.default.warn('XML file not found', { xmlPath });
                    res.status(404).json({ error: 'Not Found', message: `File not found: ${decodedUri}` });
                    return;
                }
                // Parse <?xml-stylesheet href="..."> from the XML
                const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
                const xslHref = this.extractStylesheetHref(xmlContent);
                if (!xslHref) {
                    logger_1.default.warn('No xml-stylesheet PI found', { xmlPath });
                    res.status(400).json({ error: 'Bad Request', message: 'No xml-stylesheet processing instruction found' });
                    return;
                }
                // Resolve XSL relative to the XML — stays inside the package
                const xslPath = path.resolve(path.dirname(xmlPath), xslHref);
                // Security: XSL must also be within the archive base path
                if (!xslPath.startsWith(path.resolve(basePath))) {
                    logger_1.default.error('XSL path traversal attempt', { uid, xslPath });
                    res.status(403).json({ error: 'Forbidden', message: 'Invalid stylesheet path' });
                    return;
                }
                if (!fs.existsSync(xslPath)) {
                    logger_1.default.warn('XSL file not found', { xslPath });
                    res.status(404).json({ error: 'Not Found', message: `Stylesheet not found: ${xslHref}` });
                    return;
                }
                logger_1.default.info('Running xsltproc', { xslPath, xmlPath });
                const { stdout } = yield execFileAsync('xsltproc', [xslPath, xmlPath]);
                // Inject <base> so relative assets (CSS, images) resolve correctly
                // via the existing static /archive/:uid/ route
                const xmlDir = path.dirname(decodedUri);
                const baseHref = `/archive/${uid}/${xmlDir}/`;
                const html = stdout.replace('<head>', `<head>\n  <base href="${baseHref}">`);
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.send(html);
                logger_1.default.info('Render successful', { uid, uri: decodedUri });
            }
            catch (error) {
                logger_1.default.error('RenderController error', {
                    uid,
                    uri,
                    errorMessage: error.message,
                    errorStack: error.stack
                });
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Internal Server Error', message: 'Transformation failed' });
                }
            }
        });
    }
    extractStylesheetHref(xmlContent) {
        const match = xmlContent.match(/<\?xml-stylesheet[^?]*href="([^"]+)"/);
        return match ? match[1] : null;
    }
    getItem(uid, res) {
        const item = navigation_manager_1.default.getItemByUid(uid);
        if (!item) {
            res.status(404).json({ error: 'Not Found', message: 'Navigation item not found' });
            logger_1.default.error('Navigation item not found', { uid });
            return undefined;
        }
        return item;
    }
};
RenderController = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [request_context_service_1.RequestContext])
], RenderController);
exports.RenderController = RenderController;
