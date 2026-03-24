import { ItemType } from "../common/item-type.js";
import { NavigationItem } from "./navigation-item.js";

export class MenuItem {
    uid: string;
    title: string;
    type: ItemType;
    parentUid?: string;
    permitted: boolean = false;

    constructor(uid: string, title: string, type: ItemType, parentUid?: string, permitted: boolean = false) {
        this.uid = uid;
        this.title = title;
        this.type = type;
        this.parentUid = parentUid;
        this.permitted = permitted;
    }

    static of(item: NavigationItem): MenuItem{
        return new MenuItem(item.uid, item.title, item.type, item.parentUid, item.permitted);
    }
}