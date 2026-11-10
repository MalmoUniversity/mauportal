"use strict";
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
exports.AuthController = void 0;
const saml_config_1 = require("../core/config/saml-config");
const logger_1 = __importDefault(require("../core/utils/logger"));
class AuthController {
    constructor() {
        /**
         * Initiate SAML login
         */
        this.login = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.ensureInitialized();
                // Get the returnUrl from query parameter
                const returnUrl = req.query.returnUrl;
                logger_1.default.info('Initiating SAML login', { returnUrl, sessionID: req.sessionID });
                // Pass returnUrl as RelayState to SAML
                const loginUrl = yield this.strategy.getLoginUrl(returnUrl || undefined);
                logger_1.default.info('Redirecting to SAML IdP for authentication', { loginUrl });
                res.redirect(loginUrl);
            }
            catch (error) {
                logger_1.default.error('Error initiating SAML login', { error: error instanceof Error ? error.message : error });
                res.status(500).json({ error: 'Failed to initiate login' });
            }
        });
        /**
         * Handle SAML callback
         */
        this.callback = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
            try {
                yield this.ensureInitialized();
                logger_1.default.debug('Handling SAML callback', {
                    body: req.body,
                    query: req.query,
                    sessionID: req.sessionID
                });
                const profile = yield this.strategy.validateCallback(req.body);
                logger_1.default.info('SAML callback received', { body: req.body, sessionID: req.sessionID });
                if (!profile) {
                    logger_1.default.warn('SAML authentication failed - no profile returned');
                    return res.redirect('/login?error=auth_failed');
                }
                // Get RelayState (returnUrl) from SAML response
                const returnUrl = req.body.RelayState;
                logger_1.default.info('Retrieved RelayState from SAML response', { returnUrl });
                // Store user session
                if (req.session) {
                    const user = {
                        nameID: profile.nameID,
                        nameIDFormat: profile.nameIDFormat,
                        email: ((_b = (_a = profile.attributes) === null || _a === void 0 ? void 0 : _a["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"]) === null || _b === void 0 ? void 0 : _b[0]) || ((_d = (_c = profile.attributes) === null || _c === void 0 ? void 0 : _c.email) === null || _d === void 0 ? void 0 : _d[0]),
                        displayName: ((_f = (_e = profile.attributes) === null || _e === void 0 ? void 0 : _e["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]) === null || _f === void 0 ? void 0 : _f[0]) || ((_h = (_g = profile.attributes) === null || _g === void 0 ? void 0 : _g.displayName) === null || _h === void 0 ? void 0 : _h[0]),
                        firstName: (_k = (_j = profile.attributes) === null || _j === void 0 ? void 0 : _j.givenName) === null || _k === void 0 ? void 0 : _k[0],
                        lastName: (_m = (_l = profile.attributes) === null || _l === void 0 ? void 0 : _l.sn) === null || _m === void 0 ? void 0 : _m[0],
                        attributes: profile.attributes,
                        roles: ((_o = profile.attributes) === null || _o === void 0 ? void 0 : _o['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']) || []
                    };
                    req.session.user = user;
                    // Explicitly save session before redirect
                    yield new Promise((resolve, reject) => {
                        req.session.save((err) => {
                            if (err) {
                                logger_1.default.error('Error saving session', { error: err });
                                reject(err);
                            }
                            else {
                                logger_1.default.info('Session saved successfully', {
                                    sessionID: req.sessionID,
                                    hasUser: !!req.session.user
                                });
                                resolve();
                            }
                        });
                    });
                }
                logger_1.default.info('SAML authentication successful', {
                    email: (_q = (_p = profile.attributes) === null || _p === void 0 ? void 0 : _p.email) === null || _q === void 0 ? void 0 : _q[0],
                    displayName: (_s = (_r = profile.attributes) === null || _r === void 0 ? void 0 : _r.displayName) === null || _s === void 0 ? void 0 : _s[0],
                    sessionID: req.sessionID,
                    attribute: profile.attributes
                });
                // Redirect to the original URL or default to home
                const redirectUrl = returnUrl || '/?authenticated=true';
                logger_1.default.info('Redirecting after authentication', { redirectUrl });
                res.redirect(redirectUrl);
            }
            catch (error) {
                logger_1.default.error('Error in SAML callback', { error: error instanceof Error ? error.message : error });
                res.redirect('/login?error=callback_failed');
            }
        });
        /**
         * Get current user information
         */
        this.me = (req, res) => {
            var _a;
            logger_1.default.info('Auth /me endpoint called', {
                hasSession: !!req.session,
                hasUser: !!((_a = req.session) === null || _a === void 0 ? void 0 : _a.user),
                sessionID: req.sessionID,
                cookies: req.headers.cookie
            });
            if (req.session && req.session.user) {
                res.json({
                    authenticated: true,
                    user: req.session.user
                });
            }
            else {
                res.json({
                    authenticated: false
                });
            }
        };
        /**
         * Logout
         */
        this.logout = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _t, _u;
            try {
                yield this.ensureInitialized();
                const user = (_t = req.session) === null || _t === void 0 ? void 0 : _t.user;
                // Destroy session
                (_u = req.session) === null || _u === void 0 ? void 0 : _u.destroy((err) => {
                    if (err) {
                        logger_1.default.error('Error destroying session', { error: err });
                    }
                });
                // Get SAML logout URL if user was authenticated via SAML
                if (user) {
                    const logoutUrl = yield this.strategy.getLogoutUrl(user.nameID, user.nameIDFormat);
                    logger_1.default.info('User logged out, redirecting to SAML IdP logout', { email: user.email });
                    res.redirect(logoutUrl);
                }
                else {
                    res.redirect('/');
                }
            }
            catch (error) {
                logger_1.default.error('Error during logout', { error: error instanceof Error ? error.message : error });
                res.redirect('/');
            }
        });
        /**
         * Get SAML metadata
         */
        this.metadata = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.ensureInitialized();
                const metadata = yield this.strategy.getMetadata();
                res.type('application/xml');
                res.send(metadata);
            }
            catch (error) {
                logger_1.default.error('Error generating SAML metadata', { error: error instanceof Error ? error.message : error });
                res.status(500).json({ error: 'Failed to generate metadata' });
            }
        });
        this.strategy = new saml_config_1.SamlStrategy();
        this.strategyInitialized = this.ensureInitialized();
    }
    /**
     * Ensure strategy is initialized before use
     */
    ensureInitialized() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.strategyInitialized;
        });
    }
}
exports.AuthController = AuthController;
