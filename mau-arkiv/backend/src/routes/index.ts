import { ContentController } from "../controllers/content-controller";
import { NavigationController } from "../controllers/navigation-controller";
import { SearchController } from "../controllers/search-controller";
import { ArchiveController } from "../controllers/archive-controller";
import { AuthController } from "../controllers/auth-controller";
import { requireAuth, optionalAuth } from "../middleware/auth-middleware";
import { resolveController } from "../core/utils/controller-resolver";

export function setRoutes(app: any) {
    const indexController = new (require('../controllers/index')).IndexController();

    app.get('/api/', indexController.getIndex.bind(indexController));

    // Authentication routes (don't use DI for auth controller as it manages sessions)
    const authController = new AuthController();
    app.get('/api/auth/login', authController.login.bind(authController));
    app.post('/api/auth/saml/callback', authController.callback.bind(authController));
    app.get('/api/auth/me', authController.me.bind(authController));
    app.get('/api/auth/logout', authController.logout.bind(authController));
    app.get('/api/auth/metadata', authController.metadata.bind(authController));

    // Navigation routes - using DI
    app.get('/api/nav', resolveController(NavigationController, 'getParsedJson'));
    app.get('/api/nav2', resolveController(NavigationController, 'getNavigationItems'));
    app.get('/api/nav/:uid', resolveController(NavigationController, 'getItem'));

    // Content routes - using DI
    app.get('/api/content/:uid', resolveController(ContentController, 'getContent'));
    
    // Search routes - using DI
    app.post('/api/search/:uid', resolveController(SearchController, 'search'));

    // Archive routes - using DI
    app.get('/archive/:uid/:uri(*)', resolveController(ArchiveController, 'getFile'));
}



