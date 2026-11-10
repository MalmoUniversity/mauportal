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
exports.NavigationController = void 0;
const tsyringe_1 = require("tsyringe");
const portal_config_parser_1 = require("../core/utils/portal-config-parser");
const navigation_manager_1 = __importDefault(require("../models/navigation/navigation-manager"));
const shared_1 = require("@mau-arkiv/shared");
const config_1 = __importDefault(require("config"));
const logger_1 = __importDefault(require("../core/utils/logger"));
const base_controller_1 = require("./base-controller");
const request_context_service_1 = require("../services/request-context.service");
let NavigationController = class NavigationController extends base_controller_1.BaseController {
    constructor(requestContext) {
        super(requestContext);
    }
    getParsedJson(req, res) {
        try {
            const configRoot = config_1.default.get('portal-config.path');
            const configPath = config_1.default.get('portal-config.root-file');
            // You can access current user if needed
            if (this.currentUser) {
                logger_1.default.debug('Navigation request from user', { user: this.currentUser.email });
            }
            logger_1.default.debug('Parsing navigation configuration', { configRoot, configPath });
            const parser = new portal_config_parser_1.PortalConfigParser(configRoot);
            const jsonData = parser.getJson(configPath);
            logger_1.default.info('Navigation configuration parsed successfully');
            res.json(jsonData);
        }
        catch (err) {
            logger_1.default.error("Error reading config file", {
                error: err.message,
                stack: err.stack
            });
            res.status(500).json({ error: err.message });
        }
    }
    getNavigationItems(req, res) {
        logger_1.default.debug('Getting all navigation items');
        try {
            const items = navigation_manager_1.default.getValue();
            logger_1.default.info('Navigation items retrieved', { count: items.length });
            res.json(navigation_manager_1.default);
        }
        catch (error) {
            logger_1.default.error('Error retrieving navigation items', {
                error: error instanceof Error ? error.message : error
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    getItem(req, res) {
        const uid = req.params.uid;
        logger_1.default.debug('Getting navigation item', { uid });
        try {
            const item = navigation_manager_1.default.getValue().find(x => x.uid === uid);
            const children = navigation_manager_1.default.getValue().filter(x => x.parentUid === uid);
            // Check each children and see if user roles has a group that exitsts in privilegeGroups then set the permitted to true otherwise false
            children.forEach(child => {
                child.permitted = child.form ? this.hasPrivilege(item === null || item === void 0 ? void 0 : item.privilegeGroups) : this.hasPrivilege(child.privilegeGroups);
            });
            if (item) {
                const response = {
                    item: shared_1.MenuItem.of(item),
                    children: children.map(c => shared_1.MenuItem.of(c))
                };
                logger_1.default.info('Navigation item found', {
                    uid,
                    itemTitle: item.title,
                    childrenCount: children.length
                });
                res.json(response);
            }
            else {
                logger_1.default.warn('Navigation item not found', { uid });
                res.status(404).json({ error: "Item not found", uid });
            }
        }
        catch (error) {
            logger_1.default.error('Error retrieving navigation item', {
                uid,
                error: error instanceof Error ? error.message : error
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
};
NavigationController = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [request_context_service_1.RequestContext])
], NavigationController);
exports.NavigationController = NavigationController;
