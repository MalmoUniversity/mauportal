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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentController = void 0;
const tsyringe_1 = require("tsyringe");
const navigation_manager_1 = __importDefault(require("../models/navigation/navigation-manager"));
const logger_1 = __importDefault(require("../core/utils/logger"));
const base_controller_1 = require("./base-controller");
const request_context_service_1 = require("../services/request-context.service");
let ContentController = class ContentController extends base_controller_1.BaseController {
    constructor(requestContext) {
        super(requestContext);
    }
    getContent(req, res) {
        var _a, _b, _c;
        const uid = req.params.uid;
        logger_1.default.debug('Getting content for UID', { uid, user: (_a = this.currentUser) === null || _a === void 0 ? void 0 : _a.email });
        try {
            const items = navigation_manager_1.default.getValue();
            const item = items.find(x => x.uid === uid);
            const privilegeItem = (item === null || item === void 0 ? void 0 : item.form) ? items.find(x => x.uid === item.parentUid) : item;
            ;
            // Check if user has privilege to access the content
            if (privilegeItem && !this.hasPrivilege(privilegeItem.privilegeGroups)) {
                logger_1.default.warn('User does not have privilege to access content', {
                    uid,
                    user: (_b = this.currentUser) === null || _b === void 0 ? void 0 : _b.email,
                    requiredGroups: privilegeItem.privilegeGroups,
                    userRoles: ((_c = this.currentUser) === null || _c === void 0 ? void 0 : _c.roles) || []
                });
                this.forbidden(res, 'You do not have permission to access this content');
                return;
            }
            if (item) {
                logger_1.default.info('Content found and returned', { uid, itemTitle: item.title });
                res.json(item);
            }
            else {
                logger_1.default.warn('Content not found for UID', { uid });
                res.status(404).json({ error: 'Content not found', uid });
            }
        }
        catch (error) {
            logger_1.default.error('Error retrieving content', {
                uid,
                error: error instanceof Error ? error.message : error
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
ContentController = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [request_context_service_1.RequestContext])
], ContentController);
exports.ContentController = ContentController;
