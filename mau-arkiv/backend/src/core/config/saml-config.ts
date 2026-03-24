import saml2 from 'saml2-js';
import fs from 'fs';
import path from 'path';
import config from 'config';
import logger from '../utils/logger';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { stripPrefix } from 'xml2js/lib/processors';
import { SamlProfile } from '../types/user.types';

export class SamlStrategy {
    private serviceProvider: saml2.ServiceProvider;
    private identityProvider: saml2.IdentityProvider | string = '';
    private metadataUrl: string;
    private metadataRefreshInterval: number = 3600000; // 1 hour in ms
    private lastMetadataFetch: number = 0;

    constructor() {
        const samlConfig = config.get<any>('saml');
        this.metadataUrl = samlConfig.idp.metadata_url;

        this.serviceProvider = new saml2.ServiceProvider({
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
    async initialize(): Promise<void> {
        await this.initializeIdPFromMetadata();
    }

    /**
     * Fetch and parse IdP metadata
     */
    private async fetchIdPMetadata(): Promise<any> {
        try {
            logger.info('Fetching IdP metadata', { url: this.metadataUrl });
            const response = await axios.get(this.metadataUrl, {
                timeout: 10000,
                headers: { 'Accept': 'application/xml, text/xml' }
            });

            const metadata = await parseStringPromise(response.data, {
                tagNameProcessors: [stripPrefix],
                explicitArray: false
            });

            logger.info('IdP metadata fetched successfully');
            
            return metadata;
        } catch (error) {
            logger.error('Failed to fetch IdP metadata', { 
                error: error instanceof Error ? error.message : error 
            });
            throw error;
        }
    }

    /**
     * Extract configuration from metadata XML
     */
    private parseIdPMetadata(metadata: any): {
        ssoUrl: string;
        sloUrl: string;
        certificates: string[];
    } {
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
        
        const ssoService = ssoServices.find(
            (service: any) => service['$']?.Binding === 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
        );
        
        if (!ssoService) {
            throw new Error('SingleSignOnService with HTTP-Redirect binding not found');
        }
        
        const ssoUrl = ssoService['$'].Location;

        // Extract SLO URL (optional)
        let sloUrl = '';
        const sloServices = idpDescriptor['SingleLogoutService'];
        if (sloServices) {
            const sloArray = Array.isArray(sloServices) ? sloServices : [sloServices];
            const sloService = sloArray.find(
                (service: any) => service['$']?.Binding === 'urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect'
            );
            if (sloService) {
                sloUrl = sloService['$'].Location;
            }
        }

        // Extract signing certificates
        const certificates: string[] = [];
        const keyDescriptors = idpDescriptor['KeyDescriptor'];
        
        if (keyDescriptors) {
            const keyDescArray = Array.isArray(keyDescriptors) ? keyDescriptors : [keyDescriptors];
            
            for (const keyDescriptor of keyDescArray) {
                const use = keyDescriptor['$']?.use;
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

        logger.info('Parsed IdP metadata', { 
            ssoUrl, 
            sloUrl, 
            certificateCount: certificates.length 
        });

        return { ssoUrl, sloUrl, certificates };
    }

    /**
     * Initialize Identity Provider from metadata
     */
    private async initializeIdPFromMetadata(): Promise<void> {
        try {
            const metadata = await this.fetchIdPMetadata();
            const { ssoUrl, sloUrl, certificates } = this.parseIdPMetadata(metadata);

            if (certificates.length === 0) {
                throw new Error('No signing certificates found in IdP metadata');
            }

            // Create Identity Provider with fetched metadata
            this.identityProvider = new saml2.IdentityProvider({
                sso_login_url: ssoUrl,
                sso_logout_url: sloUrl || ssoUrl, // Fallback to SSO URL if SLO not available
                certificates: certificates
            });

            this.lastMetadataFetch = Date.now();
            logger.info('Identity Provider initialized from metadata');
        } catch (error) {
            logger.error('Failed to initialize IdP from metadata', { 
                error: error instanceof Error ? error.message : error 
            });
            throw error;
        }
    }

    /**
     * Refresh metadata if needed
     */
    private async refreshMetadataIfNeeded(): Promise<void> {
        const now = Date.now();
        if (now - this.lastMetadataFetch > this.metadataRefreshInterval) {
            logger.info('Metadata refresh interval reached, updating IdP configuration');
            await this.initializeIdPFromMetadata();
        }
    }

        /**
     * Get login URL
     */
    async getLoginUrl(relayState?: string): Promise<string> {
        await this.refreshMetadataIfNeeded();
        
        if (!this.identityProvider) {
            throw new Error('Identity Provider not initialized');
        }
    
        return new Promise((resolve, reject) => {
            const options = relayState ? { relay_state: relayState } : {};
            
            this.serviceProvider.create_login_request_url(
                this.identityProvider!,
                options,
                (err: any, login_url: string) => {
                    if (err) {
                        logger.error('Error creating login URL', { error: err });
                        reject(err);
                    } else {
                        logger.info('Login URL created', { relayState });
                        resolve(login_url);
                    }
                }
            );
        });
    }

    /**
     * Validate SAML callback
     */
    async validateCallback(samlResponse: any): Promise<SamlProfile> {
        await this.refreshMetadataIfNeeded();

        if (!this.identityProvider) {
            throw new Error('Identity Provider not initialized');
        }

        return new Promise((resolve, reject) => {
            const options = {
                request_body: samlResponse,
                allow_unencrypted_assertion: true,
                require_session_index: false
            };

            this.serviceProvider.post_assert(
                this.identityProvider!,
                options,
                (err: any, saml_response: any) => {
                    if (err) {
                        logger.error('SAML assertion validation failed', { 
                            error: err.message || err 
                        });
                        reject(err);
                    } else {
                        logger.info('SAML assertion validated successfully', { 
                            nameID: saml_response.user.name_id 
                        });
                        const profile: SamlProfile = {
                            nameID: saml_response.user.name_id,
                            nameIDFormat: saml_response.user.name_id_format,
                            sessionIndex: saml_response.user.session_index,
                            attributes: saml_response.user.attributes
                        };
                        resolve(profile);
                    }
                }
            );
        });
    }

    /**
     * Get logout URL
     */
    async getLogoutUrl(nameID: string, nameIDFormat: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const options = {
                name_id: nameID,
                session_index: ''
            };

            this.serviceProvider.create_logout_request_url(this.identityProvider, options, (err, logout_url) => {
                if (err) {
                    logger.error('Error creating logout URL', { error: err });
                    reject(err);
                } else {
                    resolve(logout_url);
                }
            });
        });
    }


    /**
     * Get Service Provider metadata
     */
    async getMetadata(): Promise<string> {
        return this.serviceProvider.create_metadata();
    }
}
