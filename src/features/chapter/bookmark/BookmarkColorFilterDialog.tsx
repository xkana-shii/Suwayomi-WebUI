/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useLingui } from '@lingui/react/macro';
import { ThreeStateCheckboxInput } from '@/base/components/inputs/ThreeStateCheckboxInput.tsx';
import { BOOKMARK_COLORS } from '@/features/chapter/bookmark/BookmarkColor.ts';
import { BookmarkColorSwatch } from '@/features/chapter/bookmark/BookmarkColorMenu.tsx';

/**
 * fork (Komikku port of BookmarkColorFilterDialog): a tri-state checkbox per color (include / exclude / ignore).
 * Changes stay local until "Ok", like Komikku's category filter editor.
 */
export const BookmarkColorFilterDialog = ({
    open,
    included,
    excluded,
    onClose,
}: {
    open: boolean;
    included: number[];
    excluded: number[];
    onClose: (filter?: { included: number[]; excluded: number[] }) => void;
}) => {
    const { t } = useLingui();
    const [state, setState] = useState<Record<number, boolean | null>>({});

    useEffect(() => {
        if (open) {
            setState(
                Object.fromEntries(
                    BOOKMARK_COLORS.map(({ id }) => {
                        if (included.includes(id)) {
                            return [id, true];
                        }
                        if (excluded.includes(id)) {
                            return [id, false];
                        }
                        return [id, null];
                    }),
                ),
            );
        }
    }, [open]);

    return (
        <Dialog open={open} onClose={() => onClose()} maxWidth="xs" fullWidth>
            <DialogTitle>{t`Bookmark colors`}</DialogTitle>
            <DialogContent dividers>
                <Typography variant="caption" color="text.secondary">
                    {t`Checked colors are included, crossed colors are excluded.`}
                </Typography>
                <Stack>
                    {BOOKMARK_COLORS.map(({ id, label }) => (
                        <Stack key={id} direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                            <ThreeStateCheckboxInput
                                label={t(label)}
                                checked={state[id]}
                                onChange={(checked) => setState({ ...state, [id]: checked ?? null })}
                            />
                            <BookmarkColorSwatch color={id} size={14} />
                        </Stack>
                    ))}
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => setState(Object.fromEntries(BOOKMARK_COLORS.map(({ id }) => [id, null])))}>
                    {t`Reset`}
                </Button>
                <Button onClick={() => onClose()}>{t`Cancel`}</Button>
                <Button
                    onClick={() =>
                        onClose({
                            included: BOOKMARK_COLORS.filter(({ id }) => state[id] === true).map(({ id }) => id),
                            excluded: BOOKMARK_COLORS.filter(({ id }) => state[id] === false).map(({ id }) => id),
                        })
                    }
                >
                    {t`Ok`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
