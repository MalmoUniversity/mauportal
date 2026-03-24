import { MenuItem } from "@mau-arkiv/shared";

export interface Menu {
    item: MenuItem;
    children?: MenuItem[];
}