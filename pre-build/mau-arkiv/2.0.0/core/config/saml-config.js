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
exports.SamlStrategy = void 0;
const saml2_js_1 = __importDefault(require("saml2-js"));
const config_1 = __importDefault(require("config"));
const logger_1 = __importDefault(require("../utils/logger"));
const axios_1 = __importDefault(require("axios"));
const xml2js_1 = require("xml2js");
const processors_1 = require("xml2js/lib/processors");
class SamlStrategy {
    constructor() {
        this.identityProvider = '';
        this.metadataRefreshInterval = 3600000; // 1 hour in ms
        this.lastMetadataFetch = 0;
        const samlConfig = config_1.default.get('saml');
        this.metadataUrl = samlConfig.idp.metadata_url;
        this.serviceProvider = new saml2_js_1.default.ServiceProvider({
            entity_id: samlConfig.sp.entity_id,
            private_key: '',
            certificate: '',
            assert_endpoint: samlConfig.sp.assert_endpoint,
            allow_unencrypted_assertion: true
        });
        // Don't call async method in constructor - this causes unhandled rejection
        // Initialize IdP from metadata
        // this.initializeIdPFromMetadata();
    }
    /**
     * Initialize the SAML strategy (call this after construction)
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.initializeIdPFromMetadata();
        });
    }
    /**
     * Fetch and parse IdP metadata
     */
    fetchIdPMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger_1.default.info('Fetching IdP metadata', { url: this.metadataUrl });
                const response = yield axios_1.default.get(this.metadataUrl, {
                    timeout: 10000,
                    headers: { 'Accept': 'application/xml, text/xml' }
                });
                const metadata = yield (0, xml2js_1.parseStringPromise)(response.data, {
                    tagNameProcessors: [processors_1.stripPrefix],
                    explicitArray: false
                });
                logger_1.default.info('IdP metadata fetched successfully');
                return metadata;
            }
            catch (error) {
                logger_1.default.error('Failed to fetch IdP metadata', {
                    error: error instanceof Error ? error.message : error
                });
                throw error;
            }
        });
    }
    /**
     * Extract configuration from metadata XML
     */
    parseIdPMetadata(metadata) {
        var _a;
        const descriptor = metadata['EntityDescriptor'];
        // Handle both array and object cases for IDPSSODescriptor
        const idpDescriptor = Array.isArray(descriptor['IDPSSODescriptor'])
            ? descriptor['IDPSSODescriptor'][0]
            : descriptor['IDPSSODescriptor'];
        if (!idpDescriptor) {
            throw new Error('IDPSSODescriptor not found in metadata');
        }
        // Extract SSO URL - handle both array and single object
        const ssoServices = Array.isArray(idpDescriptor['SingleSignOnService'])
            ? idpDescriptor['SingleSignOnService']
            : [idpDescriptor['SingleSignOnService']];
        const ssoService = ssoServices.find((service) => { var _a; return ((_a = service['$']) === null || _a === void 0 ? void 0 : _a.Binding) === 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'; });
        if (!ssoService) {
            throw new Error('SingleSignOnService with HTTP-Redirect binding not found');
        }
        const ssoUrl = ssoService['$'].Location;
        // Extract SLO URL (optional)
        let sloUrl = '';
        const sloServices = idpDescriptor['SingleLogoutService'];
        if (sloServices) {
            const sloArray = Array.isArray(sloServices) ? sloServices : [sloServices];
            const sloService = sloArray.find((service) => { var _a; return ((_a = service['$']) === null || _a === void 0 ? void 0 : _a.Binding) === 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'; });
            if (sloService) {
                sloUrl = sloService['$'].Location;
            }
        }
        // Extract signing certificates
        const certificates = [];
        const keyDescriptors = idpDescriptor['KeyDescriptor'];
        if (keyDescriptors) {
            const keyDescArray = Array.isArray(keyDescriptors) ? keyDescriptors : [keyDescriptors];
            for (const keyDescriptor of keyDescArray) {
                const use = (_a = keyDescriptor['$']) === null || _a === void 0 ? void 0 : _a.use;
                // Get signing certificates or certificates without a 'use' attribute (dual-purpose)
                if (!use || use === 'signing') {
                    const keyInfo = Array.isArray(keyDescriptor['KeyInfo'])
                        ? keyDescriptor['KeyInfo'][0]
                        : keyDescriptor['KeyInfo'];
                    const x509Data = Array.isArray(keyInfo['X509Data'])
                        ? keyInfo['X509Data'][0]
                        : keyInfo['X509Data'];
                    const x509Cert = Array.isArray(x509Data['X509Certificate'])
                        ? x509Data['X509Certificate'][0]
                        : x509Data['X509Certificate'];
                    // Format certificate properly
                    const formattedCert = `-----BEGIN CERTIFICATE-----\n${x509Cert.trim()}\n-----END CERTIFICATE-----`;
                    certificates.push(formattedCert);
                }
            }
        }
        logger_1.default.info('Parsed IdP metadata', {
            ssoUrl,
            sloUrl,
            certificateCount: certificates.length
        });
        return { ssoUrl, sloUrl, certificates };
    }
    /**
     * Initialize Identity Provider from metadata
     */
    initializeIdPFromMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const metadata = yield this.fetchIdPMetadata();
                const { ssoUrl, sloUrl, certificates } = this.parseIdPMetadata(metadata);
                if (certificates.length === 0) {
                    throw new Error('No signing certificates found in IdP metadata');
                }
                // Create Identity Provider with fetched metadata
                this.identityProvider = new saml2_js_1.default.IdentityProvider({
                    sso_login_url: ssoUrl,
                    sso_logout_url: sloUrl || ssoUrl,
                    certificates: certificates
                });
                this.lastMetadataFetch = Date.now();
                logger_1.default.info('Identity Provider initialized from metadata');
            }
            catch (error) {
                logger_1.default.error('Failed to initialize IdP from metadata', {
                    error: error instanceof Error ? error.message : error
                });
                throw error;
            }
        });
    }
    /**
     * Refresh metadata if needed
     */
    refreshMetadataIfNeeded() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = Date.now();
            if (now - this.lastMetadataFetch > this.metadataRefreshInterval) {
                logger_1.default.info('Metadata refresh interval reached, updating IdP configuration');
                yield this.initializeIdPFromMetadata();
            }
        });
    }
    /**
 * Get login URL
 */
    getLoginUrl(relayState) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshMetadataIfNeeded();
            if (!this.identityProvider) {
                throw new Error('Identity Provider not initialized');
            }
            return new Promise((resolve, reject) => {
                const options = relayState ? { relay_state: relayState } : {};
                this.serviceProvider.create_login_request_url(this.identityProvider, options, (err, login_url) => {
                    if (err) {
                        logger_1.default.error('Error creating login URL', { error: err });
                        reject(err);
                    }
                    else {
                        logger_1.default.info('Login URL created', { relayState });
                        resolve(login_url);
                    }
                });
            });
        });
    }
    /**
     * Validate SAML callback
     */
    validateCallback(samlResponse) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.refreshMetadataIfNeeded();
            if (!this.identityProvider) {
                throw new Error('Identity Provider not initialized');
            }
            return new Promise((resolve, reject) => {
                const options = {
                    request_body: samlResponse,
                    allow_unencrypted_assertion: true,
                    require_session_index: false
                };
                this.serviceProvider.post_assert(this.identityProvider, options, (err, saml_response) => {
                    if (err) {
                        logger_1.default.error('SAML assertion validation failed', {
                            error: err.message || err
                        });
                        reject(err);
                    }
                    else {
                        logger_1.default.info('SAML assertion validated successfully', {
                            nameID: saml_response.user.name_id
                        });
                        const profile = {
                            nameID: saml_response.user.name_id,
                            nameIDFormat: saml_response.user.name_id_format,
                            sessionIndex: saml_response.user.session_index,
                            attributes: saml_response.user.attributes
                        };
                        resolve(profile);
                    }
                });
            });
        });
    }
    /**
     * Get logout URL
     */
    getLogoutUrl(nameID, nameIDFormat) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const options = {
                    name_id: nameID,
                    session_index: ''
                };
                this.serviceProvider.create_logout_request_url(this.identityProvider, options, (err, logout_url) => {
                    if (err) {
                        logger_1.default.error('Error creating logout URL', { error: err });
                        reject(err);
                    }
                    else {
                        resolve(logout_url);
                    }
                });
            });
        });
    }
    /**
     * Get Service Provider metadata
     */
    getMetadata() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.serviceProvider.create_metadata();
        });
    }
}
exports.SamlStrategy = SamlStrategy;
