/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { CategoryTree } from '@/features/category/CategoryTree.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import type { ComponentProps } from 'react';
import { useMemo, useState } from 'react';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import type { DragEndEvent } from '@dnd-kit/core';
import { closestCenter, DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { DEFAULT_FULL_FAB_HEIGHT } from '@/base/components/buttons/StyledFab.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import type {
    GetCategoriesSettingsQuery,
    GetCategoriesSettingsQueryVariables,
} from '@/lib/graphql/generated/graphql.ts';
import { GET_CATEGORIES_SETTINGS } from '@/lib/graphql/category/CategoryQuery.ts';
import { CategorySettingsCard } from '@/features/category/components/CategorySettingsCard.tsx';
import type { CategoryIdInfo } from '@/features/category/Category.types.ts';
import { getErrorMessage, noOp } from '@/lib/HelperFunctions.ts';
import { DndSortableItem } from '@/lib/dnd-kit/DndSortableItem.tsx';
import { DndKitUtil } from '@/lib/dnd-kit/DndKitUtil.ts';
import { DndOverlayItem } from '@/lib/dnd-kit/DndOverlayItem.tsx';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { CREATE_NEW_CATEGORY_ID } from '@/features/category/Category.constants.ts';
import { CreateOrEditCategoryDialog } from '@/features/category/components/CreateOrEditCategoryDialog.tsx';

const COLLAPSED_STORAGE_KEY = 'webUI_categorySettingsCollapsed';

// a per-viewer convenience: storage may be unavailable (private mode), the tree then starts expanded
const readCollapsed = (): Set<number> => {
    try {
        return new Set(JSON.parse(localStorage.getItem(COLLAPSED_STORAGE_KEY) ?? '[]') as number[]);
    } catch {
        return new Set();
    }
};

const writeCollapsed = (collapsed: Set<number>) => {
    try {
        localStorage.setItem(COLLAPSED_STORAGE_KEY, JSON.stringify([...collapsed]));
    } catch {
        // ignore
    }
};

export function CategorySettings() {
    const { t } = useLingui();
    const dndSensors = DndKitUtil.useSensorsForDevice();

    useAppTitle(t`Edit categories`);

    const { data, loading, error, refetch } = requestManager.useGetCategories<
        GetCategoriesSettingsQuery,
        GetCategoriesSettingsQueryVariables
    >(GET_CATEGORIES_SETTINGS);
    const [reorderCategory, { reset: revertReorder }] = requestManager.useReorderCategory();

    const [categoryToEdit, setCategoryToEdit] = useState<number>(CREATE_NEW_CATEGORY_ID);
    const [newCategoryParentId, setNewCategoryParentId] = useState<number | null>(null);
    const [collapsed, setCollapsed] = useState<Set<number>>(readCollapsed);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dndActiveCategory, setDndActiveCategory] = useState<
        ComponentProps<typeof CategorySettingsCard>['category'] | null
    >(null);

    const categories = useMemo(() => {
        const res = [...(data?.categories.nodes ?? [])];
        if (res.length > 0 && res[0].name === 'Default') {
            res.shift();
        }
        return res;
    }, [data]);

    // fork (Komikku port): nested categories, shown depth first
    const tree = useMemo(() => new CategoryTree(categories), [categories]);
    const visibleTree = useMemo(() => tree.flattened(collapsed), [tree, collapsed]);
    const visibleCategories = useMemo(() => visibleTree.map(({ category }) => category), [visibleTree]);

    const toggleCollapsed = (categoryId: number) => {
        const next = new Set(collapsed);
        if (!next.delete(categoryId)) {
            next.add(categoryId);
        }
        setCollapsed(next);
        writeCollapsed(next);
    };

    const categoryReorder = (list: CategoryIdInfo[], from: number, to: number) => {
        const reorderedCategory = list[from];

        reorderCategory({ variables: { input: { id: reorderedCategory.id, position: to + 1 } } }).catch(() =>
            revertReorder(),
        );
    };

    const onDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        setDndActiveCategory(null);

        if (!over || active.id === over.id) {
            return;
        }

        // categories are reordered among their siblings; moving to another parent is done in the edit dialog
        if (tree.parentOf(Number(active.id)) !== tree.parentOf(Number(over.id))) {
            makeToast(
                t`Categories can only be reordered among their siblings. Use "Edit" to change the parent.`,
                'info',
            );
            return;
        }

        const oldIndex = categories.findIndex((category) => category.id === active.id);
        const newIndex = categories.findIndex((category) => category.id === over.id);

        categoryReorder(categories, oldIndex, newIndex);
    };

    const handleDialogOpen = (categoryId?: CategoryIdInfo['id'], parentId: number | null = null) => {
        setCategoryToEdit(categoryId ?? CREATE_NEW_CATEGORY_ID);
        setNewCategoryParentId(parentId);
        setDialogOpen(true);
    };

    const handleDialogCancel = () => {
        setCategoryToEdit(CREATE_NEW_CATEGORY_ID);
        setDialogOpen(false);
    };

    if (loading) {
        return <LoadingPlaceholder />;
    }

    if (error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Could not load categories`}
                messageExtra={getErrorMessage(error)}
                retry={() => refetch().catch(defaultPromiseErrorHandler('CategorySettings::refetch'))}
            />
        );
    }

    return (
        <>
            <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragStart={(event) =>
                    setDndActiveCategory(categories.find((category) => category.id === event.active.id) ?? null)
                }
                onDragEnd={onDragEnd}
                onDragCancel={() => setDndActiveCategory(null)}
                onDragAbort={() => setDndActiveCategory(null)}
            >
                <Box sx={{ paddingBottom: DEFAULT_FULL_FAB_HEIGHT }}>
                    <SortableContext items={visibleCategories} strategy={verticalListSortingStrategy}>
                        {visibleTree.map(({ category, depth, childCount }) => (
                            <DndSortableItem
                                key={category.id}
                                id={category.id}
                                isDragging={category.id === dndActiveCategory?.id}
                            >
                                <CategorySettingsCard
                                    category={category}
                                    depth={depth}
                                    childCount={childCount}
                                    collapsed={collapsed.has(category.id)}
                                    onToggleCollapsed={() => toggleCollapsed(category.id)}
                                    onAddSubcategory={() => handleDialogOpen(undefined, category.id)}
                                    onEdit={() => handleDialogOpen(category.id)}
                                />
                            </DndSortableItem>
                        ))}
                    </SortableContext>
                    <DndOverlayItem isActive={!!dndActiveCategory}>
                        <CategorySettingsCard category={dndActiveCategory!} onEdit={noOp} />
                    </DndOverlayItem>
                </Box>
            </DndContext>
            <Fab
                color="primary"
                aria-label="add"
                sx={{
                    position: 'fixed',
                    bottom: (theme) => theme.spacing(2),
                    right: (theme) => theme.spacing(2),
                }}
                onClick={() => handleDialogOpen()}
            >
                <AddIcon />
            </Fab>

            {dialogOpen && (
                <CreateOrEditCategoryDialog
                    category={categories.find((category) => category.id === categoryToEdit)}
                    categories={categories}
                    initialParentId={newCategoryParentId}
                    onClose={handleDialogCancel}
                />
            )}
        </>
    );
}
