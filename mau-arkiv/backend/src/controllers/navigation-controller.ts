
import { Request, Response } from "express";
import { injectable } from "tsyringe";
import { PortalConfigParser } from "../core/utils/portal-config-parser";
import navigationManager from "../models/navigation/navigation-manager";
import { MenuItem, NavigationItem } from "@mau-arkiv/shared";
import config from 'config';
import logger from "../core/utils/logger";
import { BaseController } from "./base-controller";
import { RequestContext } from "../services/request-context.service";

@injectable()
export class NavigationController extends BaseController {
    constructor(requestContext: RequestContext) {
        super(requestContext);
    }
   
    getParsedJson(req: Request, res: Response): void {
        try {
            const configRoot: string = config.get('portal-config.path');
            const configPath: string = config.get('portal-config.root-file');
            
            // You can access current user if needed
            if (this.currentUser) {
                logger.debug('Navigation request from user', { user: this.currentUser.email });
            }
        
            logger.debug('Parsing navigation configuration', { configRoot, configPath });
            
            const parser = new PortalConfigParser(configRoot);
            const jsonData = parser.getJson(configPath);
            
            logger.info('Navigation configuration parsed successfully');
            res.json(jsonData);
        } catch (err: any) {
            logger.error("Error reading config file", { 
                error: err.message,
                stack: err.stack 
            });
            res.status(500).json({ error: err.message });
        }
    }

    getNavigationItems(req: Request, res: Response): void {
        logger.debug('Getting all navigation items');
        
        try {
            const items = navigationManager.getValue();
            logger.info('Navigation items retrieved', { count: items.length });
            res.json(navigationManager);
        } catch (error) {
            logger.error('Error retrieving navigation items', { 
                error: error instanceof Error ? error.message : error 
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    getItem(req: Request, res: Response): void {
        const uid = req.params.uid;
        
        logger.debug('Getting navigation item', { uid });
        
        try {
            const item = navigationManager.getValue().find(x => x.uid === uid);
            const children = navigationManager.getValue().filter(x => x.parentUid === uid);
            
            // Check each children and see if user roles has a group that exitsts in privilegeGroups then set the permitted to true otherwise false
            children.forEach(child => {

                child.permitted = child.form ? this.hasPrivilege(item?.privilegeGroups) : this.hasPrivilege(child.privilegeGroups);
            });

            if (item) {
                const response = {
                    item: MenuItem.of(item), 
                    children: children.map(c => MenuItem.of(c))
                };
                
                logger.info('Navigation item found', { 
                    uid, 
                    itemTitle: item.title,
                    childrenCount: children.length 
                });
                
                res.json(response);
            } else {
                logger.warn('Navigation item not found', { uid });
                res.status(404).json({ error: "Item not found", uid });
            }
        } catch (error) {
            logger.error('Error retrieving navigation item', { 
                uid,
                error: error instanceof Error ? error.message : error 
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}