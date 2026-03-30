"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const portal_config_parser_1 = require("../../core/utils/portal-config-parser");
const logger_1 = __importDefault(require("../../core/utils/logger"));
class NavigationManager {
    constructor() {
        this.value = [];
    }
    getValue() {
        return this.value;
    }
    load(configRoot, configPath) {
        logger_1.default.info('Loading navigation configuration', { configRoot, configPath });
        try {
            const parser = new portal_config_parser_1.PortalConfigParser(configRoot);
            const data = parser.getJson(configPath);
            const temp = [];
            this.addItem(data, null, temp);
            this.value = temp;
            logger_1.default.info('Navigation configuration loaded successfully', {
                totalItems: this.value.length,
                rootItems: this.value.filter(item => !item.parentUid).length
            });
        }
        catch (error) {
            logger_1.default.error('Failed to load navigation configuration', {
                configRoot,
                configPath,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }
    addItem(node, parent, temp, type) {
        if (node == null)
            return;
        if (node.groups && node.groups.length > 0) {
            node.groups.forEach((element) => {
                if (!element.uid) {
                    element.uid = node.uid + '-.-' + (node.groups.indexOf(element) + 1);
                }
            });
        }
        const currentItem = {
            uid: node.uid || temp.length,
            parentUid: parent ? parent.uid : null,
            title: node.title,
            description: node.description,
            rootUri: node.rootUri,
            privilegeGroups: node.privilegeGroups || [],
            type: type || (node.groups && node.groups.length > 0) ? 'parent' : (node.unselectable ? 'divider' : 'item'),
            form: type === 'form' ? node : null
        };
        temp.push(currentItem);
        if (Array.isArray(node.groups)) {
            node.groups.forEach((element) => {
                this.addItem(element, node, temp);
            });
        }
        if (Array.isArray(node.forms)) {
            node.forms.forEach((element) => {
                this.addItem(element, node, temp, 'form');
            });
        }
    }
}
const navigationManager = new NavigationManager();
exports.default = navigationManager;
