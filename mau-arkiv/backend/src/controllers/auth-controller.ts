/// <reference path="../core/types/session.d.ts" />
import { Request, Response } from 'express';
import { SamlStrategy } from '../core/config/saml-config';
import logger from '../core/utils/logger';
import { User } from '../core/types/user.types';

const DEFAULT_REDIRECT = '/?authenticated=true';

/**
 * Only allow same-site relative paths such as "/content/foo?x=1".
 * Anything else (absolute URLs, "//host", backslash tricks) falls back to the default.
 */
function safeRedirectPath(target: unknown, fallback = DEFAULT_REDIRECT): string {
    if (typeof target !== 'string' || target.length === 0 || target.length > 2048) return fallback;

    // Must start with exactly one slash. "//evil.com" is protocol-relative, and browsers
    // treat "/\evil.com" like "//evil.com", so backslashes are rejected too.
    if (!target.startsWith('/') || target.startsWith('//') || target.includes('\\')) return fallback;

    // No control characters (tabs and newlines can be used to hide the host)
    if (/[\x00-\x1F\x7F]/.test(target)) return fallback;

    // Final check: it must still resolve to the same origin
    try {
        if (new URL(target, 'http://localhost').origin !== 'http://localhost') return fallback;
    } catch {
        return fallback;
    }
    return target;
}

export class AuthController {
    private strategy: SamlStrategy;
    private strategyInitialized: Promise<void>;

    constructor() {
        this.strategy = new SamlStrategy();
        this.strategyInitialized = this.ensureInitialized();
    }

    /**
     * Ensure strategy is initialized before use
     */
    private async ensureInitialized() {
        await this.strategyInitialized;
    }

    /**
     * Initiate SAML login
     */
    login = async (req: Request, res: Response) => {
        try {
            await this.ensureInitialized();
            
            // Get the returnUrl from query parameter
            const returnUrl = req.query.returnUrl as string;
            logger.info('Initiating SAML login', { returnUrl, sessionID: req.sessionID });
            
            // Pass returnUrl as RelayState to SAML
            const loginUrl = await this.strategy.getLoginUrl(returnUrl || undefined);
            logger.info('Redirecting to SAML IdP for authentication', { loginUrl });
            res.redirect(loginUrl);
        } catch (error) {
            logger.error('Error initiating SAML login', { error: error instanceof Error ? error.message : error });
            res.status(500).json({ error: 'Failed to initiate login' });
        }
    };

    /**
     * Handle SAML callback
     */
    callback = async (req: Request, res: Response) => {
        try {
            await this.ensureInitialized();
            
            logger.debug('Handling SAML callback', { 
                body: req.body, 
                query: req.query,
                sessionID: req.sessionID 
            });

            const profile = await this.strategy.validateCallback(req.body);
            
            logger.info('SAML callback received', { body: req.body, sessionID: req.sessionID });

            if (!profile) {
                logger.warn('SAML authentication failed - no profile returned');
                return res.redirect('/login?error=auth_failed');
            }


            // Get RelayState (returnUrl) from SAML response
            const returnUrl = req.body.RelayState;
            logger.info('Retrieved RelayState from SAML response', { returnUrl });

            // Store user session
            if (req.session) {
                const user: User = {
                    nameID: profile.nameID,
                    nameIDFormat: profile.nameIDFormat,
                    email: profile.attributes?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn"]?.[0] || profile.attributes?.email?.[0],
                    displayName: profile.attributes?.["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]?.[0] || profile.attributes?.displayName?.[0],
                    firstName: profile.attributes?.givenName?.[0],
                    lastName: profile.attributes?.sn?.[0],
                    attributes: profile.attributes,
                    roles: profile.attributes?.['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || []
                };
                
                req.session.user = user;
                
                // Explicitly save session before redirect
                await new Promise<void>((resolve, reject) => {
                    req.session.save((err) => {
                        if (err) {
                            logger.error('Error saving session', { error: err });
                            reject(err);
                        } else {
                            logger.info('Session saved successfully', { 
                                sessionID: req.sessionID,
                                hasUser: !!req.session.user
                            });
                            resolve();
                        }
                    });
                });
            }

            logger.info('SAML authentication successful', { 
                email: profile.attributes?.email?.[0],
                displayName: profile.attributes?.displayName?.[0],
                sessionID: req.sessionID,
                attribute: profile.attributes
            });

            // Redirect to the original URL (local paths only) or default to home
            const redirectUrl = safeRedirectPath(returnUrl);
            logger.info('Redirecting after authentication', { redirectUrl });
            res.redirect(redirectUrl);

            } catch (error) {
            logger.error('Error in SAML callback', { error: error instanceof Error ? error.message : error });
            res.redirect('/login?error=callback_failed');
        }
    };

    /**
     * Get current user information
     */
    me = (req: Request, res: Response) => {
        logger.info('Auth /me endpoint called', { 
            hasSession: !!req.session,
            hasUser: !!req.session?.user,
            sessionID: req.sessionID,
            cookies: req.headers.cookie
        });
        
        if (req.session && req.session.user) {
            res.json({
                authenticated: true,
                user: req.session.user
            });
        } else {
            res.json({
                authenticated: false
            });
        }
    };

    /**
     * Logout
     */
    logout = async (req: Request, res: Response) => {
        try {
            await this.ensureInitialized();
            const user = req.session?.user;
            
            // Destroy session
            req.session?.destroy((err) => {
                if (err) {
                    logger.error('Error destroying session', { error: err });
                }
            });

            // Get SAML logout URL if user was authenticated via SAML
            if (user) {
                const logoutUrl = await this.strategy.getLogoutUrl(user.nameID, user.nameIDFormat);
                logger.info('User logged out, redirecting to SAML IdP logout', { email: user.email });
                res.redirect(logoutUrl);
            } else {
                res.redirect('/');
            }
        } catch (error) {
            logger.error('Error during logout', { error: error instanceof Error ? error.message : error });
            res.redirect('/');
        }
    };

    /**
     * Get SAML metadata
     */
    metadata = async (req: Request, res: Response) => {
        try {
            await this.ensureInitialized();
            const metadata = await this.strategy.getMetadata();
            res.type('application/xml');
            res.send(metadata);
        } catch (error) {
            logger.error('Error generating SAML metadata', { error: error instanceof Error ? error.message : error });
            res.status(500).json({ error: 'Failed to generate metadata' });
        }
    };
}
