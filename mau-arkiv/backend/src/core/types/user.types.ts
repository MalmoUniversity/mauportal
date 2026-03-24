/**
 * User information stored in session and used throughout the application
 */
export interface User {
    nameID: string;
    nameIDFormat: string;
    email?: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    attributes?: any;
    roles?: string[];
}

/**
 * SAML profile returned from Identity Provider
 */
export interface SamlProfile {
    nameID: string;
    nameIDFormat: string;
    sessionIndex?: string;
    attributes?: {
        email?: string[];
        displayName?: string[];
        givenName?: string[];
        sn?: string[];
        [key: string]: any;
    };
}
