import { Request, Response } from "express";
import { injectable } from "tsyringe";
import navigationManager from "../models/navigation/navigation-manager";
import logger from "../core/utils/logger";
import { BaseController } from "./base-controller";
import { RequestContext } from "../services/request-context.service";

@injectable()
export class ContentController extends BaseController {
    constructor(requestContext: RequestContext) {
        super(requestContext);
    }
    getContent(req: Request, res: Response): void {
        const uid = req.params.uid;
        
        logger.debug('Getting content for UID', { uid, user: this.currentUser?.email });
        
        try {
            const items = navigationManager.getValue();
            const item = items.find(x => x.uid === uid);

            const privilegeItem = item?.form ? items.find(x => x.uid === item.parentUid) : item;
            
            ;
            // Check if user has privilege to access the content
            if (privilegeItem && !this.hasPrivilege(privilegeItem.privilegeGroups)) {
                logger.warn('User does not have privilege to access content', { 
                    uid, 
                    user: this.currentUser?.email,
                    requiredGroups: privilegeItem.privilegeGroups,
                    userRoles: this.currentUser?.roles || []
                });
                this.forbidden(res, 'You do not have permission to access this content');
                return;
            }

            
            if (item) {
                logger.info('Content found and returned', { uid, itemTitle: item.title });
                res.json(item);
            } else {
                logger.warn('Content not found for UID', { uid });
                res.status(404).json({ error: 'Content not found', uid });
            }
        } catch (error) {
            logger.error('Error retrieving content', { 
                uid, 
                error: error instanceof Error ? error.message : error 
            });
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}