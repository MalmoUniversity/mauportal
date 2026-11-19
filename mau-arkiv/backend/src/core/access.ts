import navigationManager from '../models/navigation/navigation-manager';

const CONTENT_PREFIX = '/content/';

export function canAccess(roles: string[], uri: string): boolean {
    let path: string;
    try {
        path = decodeURIComponent(uri.split('?')[0]);
    } catch {
        return false;
    }
    if (path.includes('..') || path.includes('\\') || !path.startsWith(CONTENT_PREFIX)) {
        return false;
    }

    const uid = path.slice(CONTENT_PREFIX.length).split('/')[0];
    if (!uid) return false;

    const matches = navigationManager.getValue().filter(i => String(i.uid) === uid);
    if (matches.length === 0) return false;              // default deny

    // Access is granted if any matching node's owner grants it
    return matches.some(i => {
        const owner = i.form && i.parentUid
            ? navigationManager.getItemByUid(i.parentUid)   // forms use the parent's groups
            : i;
        const groups = owner?.privilegeGroups ?? [];
        return groups.some(g => roles.includes(g));
    });
}
