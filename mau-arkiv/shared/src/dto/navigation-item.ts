export interface NavigationItem {
    uid: string;
    parentUid?: string;
    title: string;
    description: string;
    rootUri: string;
    privilegeGroups: string[];
    type: 'parent' | 'item' | 'form' | 'link' | 'divider';
    form: any;
    permitted?: boolean;
}