/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import IconButton from '@mui/material/IconButton';
import DragHandleIcon from '@mui/icons-material/DragHandle';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { ListCardContent } from '@/base/components/lists/cards/ListCardContent.tsx';
import type { CategoryHierarchyInfo, CategoryIdInfo, CategoryNameInfo } from '@/features/category/Category.types.ts';
import { Confirmation } from '@/base/AppAwaitableComponent.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { getSmartCategoryStatusLabel } from '@/features/category/CategoryTree.ts';

const INDENT = 3;

export const CategorySettingsCard = ({
    category,
    onEdit,
    depth = 0,
    childCount = 0,
    collapsed = false,
    onToggleCollapsed,
    onAddSubcategory,
}: {
    category: CategoryIdInfo & CategoryNameInfo & Partial<CategoryHierarchyInfo>;
    onEdit: () => void;
    // fork (Komikku port): nested categories
    depth?: number;
    childCount?: number;
    collapsed?: boolean;
    onToggleCollapsed?: () => void;
    onAddSubcategory?: () => void;
}) => {
    const { t } = useLingui();
    const smartLabel = getSmartCategoryStatusLabel(category.trackStatus);

    const deleteCategory = async () => {
        await Confirmation.show({
            title: t`Are you sure?`,
            message: childCount
                ? t`You are about to delete category "${category.name}". Its subcategories move up one level.`
                : t`You are about to delete category "${category.name}"`,
        });

        try {
            await requestManager.deleteCategory(category.id).response;
        } catch (e) {
            makeToast(t`Could not delete category`, 'error', getErrorMessage(e));
        }
    };

    return (
        <Box sx={{ p: 1, pb: 0, pl: 1 + depth * INDENT }}>
            <Card>
                <ListCardContent sx={{ gap: 1 }}>
                    <DragHandleIcon />
                    {childCount ? (
                        <IconButton
                            size="small"
                            onClick={onToggleCollapsed}
                            aria-expanded={!collapsed}
                            aria-label={collapsed ? t`Expand ${category.name}` : t`Collapse ${category.name}`}
                        >
                            {collapsed ? <ChevronRightIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                    ) : (
                        <Box sx={{ width: 34 }} />
                    )}
                    <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                        <Typography variant="h6" component="h2" noWrap>
                            {category.name}
                        </Typography>
                        {(!!smartLabel || (collapsed && !!childCount)) && (
                            <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap' }}>
                                {smartLabel && (
                                    <Chip
                                        size="small"
                                        icon={<AutoAwesomeIcon />}
                                        label={`${t`Smart`}: ${t(smartLabel)}`}
                                    />
                                )}
                                {collapsed && !!childCount && (
                                    <Chip size="small" variant="outlined" label={t`${childCount} subcategories`} />
                                )}
                            </Stack>
                        )}
                    </Stack>
                    <Stack sx={{ flexDirection: 'row' }}>
                        {onAddSubcategory && (
                            <CustomTooltip title={t`Add subcategory`}>
                                <IconButton component={Box} onClick={onAddSubcategory}>
                                    <CreateNewFolderOutlinedIcon />
                                </IconButton>
                            </CustomTooltip>
                        )}
                        <CustomTooltip title={t`Edit`}>
                            <IconButton component={Box} onClick={onEdit}>
                                <EditIcon />
                            </IconButton>
                        </CustomTooltip>
                        <CustomTooltip title={t`Delete`}>
                            <IconButton component={Box} onClick={deleteCategory}>
                                <DeleteIcon />
                            </IconButton>
                        </CustomTooltip>
                    </Stack>
                </ListCardContent>
            </Card>
        </Box>
    );
};
