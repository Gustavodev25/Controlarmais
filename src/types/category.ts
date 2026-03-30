export interface CategoryMapping {
    id: string;
    originalKey: string;
    displayName: string;
    isDefault: boolean;
    group: string;
    updatedAt: string;
}

export interface CategoryItem {
    key: string;
    label: string;
}

export interface CategoryGroup {
    title: string;
    items: CategoryItem[];
}
