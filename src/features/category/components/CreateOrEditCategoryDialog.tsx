/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import type {
    CategoryDefaultInfo,
    CategoryHierarchyInfo,
    CategoryIdInfo,
    CategoryNameInfo,
} from '@/features/category/Category.types.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { assertIsDefined } from '@/base/Asserts.ts';
import { CategoryTree, SMART_CATEGORY_STATUSES } from '@/features/category/CategoryTree.ts';

type DialogCategory = CategoryIdInfo & CategoryNameInfo & CategoryDefaultInfo & CategoryHierarchyInfo;

const TOP_LEVEL = -1;
const NO_BINDING = 0;

export const CreateOrEditCategoryDialog = ({
    category,
    categories,
    initialParentId,
    onClose,
}: {
    category: DialogCategory | undefined;
    /** every user-created category, for the parent selection (fork: nested categories) */
    categories: DialogCategory[];
    initialParentId?: number | null;
    onClose: () => void;
}) => {
    const isEditMode = !!category;

    const { t } = useLingui();

    const [dialogName, setDialogName] = useState(category?.name);
    const [dialogDefault, setDialogDefault] = useState(!!category?.default);
    const [parentId, setParentId] = useState<number>(category?.parentId ?? initialParentId ?? TOP_LEVEL);
    const [trackStatus, setTrackStatus] = useState<number>(category?.trackStatus ?? NO_BINDING);

    const tree = useMemo(() => new CategoryTree(categories), [categories]);
    const parentOptions = useMemo(
        () => tree.flattened().filter(({ category: option }) => !category || tree.canMove(category.id, option.id)),
        [tree, category],
    );

    const siblingNames = categories
        .filter((other) => other.id !== category?.id && (other.parentId ?? TOP_LEVEL) === parentId)
        .map((other) => other.name.toLowerCase());
    const trimmedName = dialogName?.trim() ?? '';
    const isInvalidName = dialogName !== undefined && !trimmedName.length;
    const isDuplicateName = !!trimmedName && siblingNames.includes(trimmedName.toLowerCase());
    const canSubmit = dialogName !== undefined && !isInvalidName && !isDuplicateName;

    const handleDialogSubmit = () => {
        assertIsDefined(dialogName);

        onClose();

        const newName = dialogName.trim();
        const newParentId = parentId === TOP_LEVEL ? null : parentId;
        const newTrackStatus = trackStatus === NO_BINDING ? null : trackStatus;
        const didBindingChange = (category?.trackStatus ?? null) !== newTrackStatus;
        // a Smart Category binding re-files library manga on the server
        const refetchOnBindingChange = () => {
            if (didBindingChange) {
                requestManager.graphQLClient.client.refetchQueries({ include: 'active' }).catch(() => {});
            }
        };

        if (isEditMode) {
            requestManager
                .updateCategory(category.id, {
                    name: newName,
                    default: dialogDefault,
                    ...((category.parentId ?? null) !== newParentId &&
                        (newParentId === null ? { moveToTopLevel: true } : { parentId: newParentId })),
                    ...(didBindingChange &&
                        (newTrackStatus === null ? { clearTrackStatus: true } : { trackStatus: newTrackStatus })),
                })
                .response.then(refetchOnBindingChange)
                .catch((e) => makeToast(t`Failed to save changes`, 'error', getErrorMessage(e)));

            return;
        }

        requestManager
            .createCategory({
                name: newName,
                default: dialogDefault,
                parentId: newParentId,
                trackStatus: newTrackStatus,
            })
            .response.then(refetchOnBindingChange)
            .catch((e) => makeToast(t`Could not create category`, 'error', getErrorMessage(e)));
    };

    return (
        <Dialog open onClose={onClose} fullWidth maxWidth="xs">
            <DialogTitle id="form-dialog-title">{isEditMode ? t`Edit category` : t`New category`}</DialogTitle>
            <DialogContent>
                <TextField
                    autoFocus
                    margin="dense"
                    id="name"
                    label={t`Category Name`}
                    type="text"
                    fullWidth
                    value={dialogName}
                    onChange={(e) => setDialogName(e.target.value)}
                    error={isInvalidName || isDuplicateName}
                    helperText={(() => {
                        if (isInvalidName) {
                            return t`Invalid input`;
                        }
                        if (isDuplicateName) {
                            return t`A category with this name already exists here`;
                        }
                        return undefined;
                    })()}
                />
                <TextField
                    select
                    margin="dense"
                    fullWidth
                    label={t`Parent category`}
                    value={parentId}
                    onChange={(e) => setParentId(Number(e.target.value))}
                >
                    <MenuItem value={TOP_LEVEL}>{t`None (top level)`}</MenuItem>
                    {parentOptions.map(({ category: option, depth }) => (
                        <MenuItem key={option.id} value={option.id} sx={{ pl: 2 + depth * 2 }}>
                            {option.name}
                        </MenuItem>
                    ))}
                </TextField>
                <TextField
                    select
                    margin="dense"
                    fullWidth
                    label={t`Smart Category`}
                    value={trackStatus}
                    onChange={(e) => setTrackStatus(Number(e.target.value))}
                    helperText={
                        trackStatus === NO_BINDING
                            ? t`Manga are added to this category manually`
                            : t`Library manga are added and removed automatically by their tracker status. A subcategory only applies to manga in its branch.`
                    }
                >
                    <MenuItem value={NO_BINDING}>{t`Off`}</MenuItem>
                    {SMART_CATEGORY_STATUSES.map(({ value, label }) => (
                        <MenuItem key={value} value={value}>
                            {t(label)}
                        </MenuItem>
                    ))}
                </TextField>
                <FormControlLabel
                    control={<Checkbox checked={dialogDefault} onChange={(e) => setDialogDefault(e.target.checked)} />}
                    label={t`Default category when adding new manga to the library`}
                />
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    {t`Cancel`}
                </Button>
                <Button onClick={handleDialogSubmit} color="primary" disabled={!canSubmit}>
                    {t`Submit`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
