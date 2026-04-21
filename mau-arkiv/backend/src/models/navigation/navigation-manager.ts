import { NavigationItem } from "@mau-arkiv/shared";
import { PortalConfigParser } from '../../core/utils/portal-config-parser';
import logger from '../../core/utils/logger';

class NavigationManager {
    private value: NavigationItem[] = [];

    getValue(): NavigationItem[] {
        return this.value;
    }

    getItemByUid(uid: string): NavigationItem | undefined {
        return this.value.find(x => x.uid === uid);
    }
    
    load(configRoot: string, configPath: string): void {
        logger.info('Loading navigation configuration', { configRoot, configPath });
        
        try {
            const parser = new PortalConfigParser(configRoot);
            const data = parser.getJson(configPath);

            const temp: NavigationItem[] = [];

            this.addItem(data, null, temp);
            
            this.value = temp;
            
            logger.info('Navigation configuration loaded successfully', { 
                totalItems: this.value.length,
                rootItems: this.value.filter(item => !item.parentUid).length
            });
        } catch (error) {
            logger.error('Failed to load navigation configuration', {
                configRoot,
                configPath,
                error: error instanceof Error ? error.message : error
            });
            throw error;
        }
    }

    private addItem(node: any, parent: any, temp:  NavigationItem[], type?: string): void {
        if(node == null) return;

        if(node.groups && node.groups.length > 0) {
            node.groups.forEach((element:any) => {
                if(!element.uid) {
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
            type: type ||(node.groups && node.groups.length > 0) ? 'parent' : (node.unselectable? 'divider' : 'item'),
            form: type === 'form' ? node : null
        } as NavigationItem;

        temp.push( currentItem);

        if(Array.isArray(node.groups)) {
            node.groups.forEach((element:any) => {
                this.addItem(element, node, temp);
            });
        }

        if(Array.isArray(node.forms)) {
            node.forms.forEach((element:any) => {
                this.addItem(element, node, temp, 'form');
            });
        }
    }
}

const navigationManager = new NavigationManager();
export default navigationManager;