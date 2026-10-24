/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ComponentProps } from 'react';
import { useState } from 'react';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import { useLingui } from '@lingui/react/macro';
import type { updateChapterListOptions } from '@/features/chapter/utils/ChapterList.util.tsx';
import { CheckboxInput } from '@/base/components/inputs/CheckboxInput.tsx';
import { ScanlatorSettingsDialog } from '@/features/chapter/components/ScanlatorSettingsDialog.tsx';
import type { ChapterListOptions } from '@/features/chapter/Chapter.types.ts';

/**
 * The scanlator filter entry of the chapter filters. fork (Komikku port): it opens the scanlator settings, which
 * combine the scanlator filter with Smart Scanlator Merge (Mihon-like ordering plus range rules) and the blacklist.
 */
export const ChapterExcludeSanlatorsFilter = ({
    updateOption,
    options,
    mangaId,
    chapters,
}: {
    updateOption: ReturnType<typeof updateChapterListOptions>;
    options: ChapterListOptions;
    mangaId: number;
    chapters: ComponentProps<typeof ScanlatorSettingsDialog>['chapters'];
}) => {
    const { t } = useLingui();
    const [open, setOpen] = useState(false);

    return (
        <>
            <CheckboxInput
                onClick={(e) => {
                    e.preventDefault();
                    setOpen(true);
                }}
                label={t`Scanlators`}
                icon={<PeopleAltOutlinedIcon />}
                checkedIcon={<PeopleAltOutlinedIcon color="warning" />}
                checked={!!options.excludedScanlators.length}
            />
            <ScanlatorSettingsDialog
                open={open}
                onClose={() => setOpen(false)}
                mangaId={mangaId}
                chapters={chapters}
                options={options}
                updateOption={updateOption}
            />
        </>
    );
};
