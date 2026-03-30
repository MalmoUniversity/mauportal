"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setRoutes = void 0;
const content_controller_1 = require("../controllers/content-controller");
const navigation_controller_1 = require("../controllers/navigation-controller");
const search_controller_1 = require("../controllers/search-controller");
const archive_controller_1 = require("../controllers/archive-controller");
const auth_controller_1 = require("../controllers/auth-controller");
const controller_resolver_1 = require("../core/utils/controller-resolver");
function setRoutes(app) {
    const indexController = new (require('../controllers/index')).IndexController();
    app.get('/api/', indexController.getIndex.bind(indexController));
    // Authentication routes (don't use DI for auth controller as it manages sessions)
    const authController = new auth_controller_1.AuthController();
    app.get('/api/auth/login', authController.login.bind(authController));
    app.post('/api/auth/saml/callback', authController.callback.bind(authController));
    app.get('/api/auth/me', authController.me.bind(authController));
    app.get('/api/auth/logout', authController.logout.bind(authController));
    app.get('/api/auth/metadata', authController.metadata.bind(authController));
    // Navigation routes - using DI
    app.get('/api/nav', (0, controller_resolver_1.resolveController)(navigation_controller_1.NavigationController, 'getParsedJson'));
    app.get('/api/nav2', (0, controller_resolver_1.resolveController)(navigation_controller_1.NavigationController, 'getNavigationItems'));
    app.get('/api/nav/:uid', (0, controller_resolver_1.resolveController)(navigation_controller_1.NavigationController, 'getItem'));
    // Content routes - using DI
    app.get('/api/content/:uid', (0, controller_resolver_1.resolveController)(content_controller_1.ContentController, 'getContent'));
    // Search routes - using DI
    app.post('/api/search/:uid', (0, controller_resolver_1.resolveController)(search_controller_1.SearchController, 'search'));
    // Archive routes - using DI
    app.get('/archive/:uid/:uri(*)', (0, controller_resolver_1.resolveController)(archive_controller_1.ArchiveController, 'getFile'));
}
exports.setRoutes = setRoutes;
