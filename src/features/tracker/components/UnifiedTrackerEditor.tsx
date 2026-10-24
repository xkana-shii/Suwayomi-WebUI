/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { UnifiedTrackEditOutcome, UnifiedTrackStatus } from '@/lib/graphql/generated/graphql-base.types.ts';
import type { TrackerUpdateUnifiedMutation } from '@/lib/graphql/generated/graphql.ts';
import { SMART_CATEGORY_STATUSES } from '@/features/category/CategoryTree.ts';

const STATUS_BY_VALUE: Record<number, UnifiedTrackStatus> = {
    1: UnifiedTrackStatus.Reading,
    2: UnifiedTrackStatus.Repeating,
    3: UnifiedTrackStatus.PlanToRead,
    4: UnifiedTrackStatus.Paused,
    5: UnifiedTrackStatus.Completed,
    6: UnifiedTrackStatus.Dropped,
};

const toEpochMillis = (date: string): number | undefined => (date ? new Date(`${date}T00:00:00`).getTime() : undefined);

const OUTCOME_COLOR: Record<UnifiedTrackEditOutcome, 'error' | 'warning' | 'success'> = {
    [UnifiedTrackEditOutcome.Failed]: 'error',
    [UnifiedTrackEditOutcome.Skipped]: 'warning',
    [UnifiedTrackEditOutcome.Updated]: 'success',
};

type Results = TrackerUpdateUnifiedMutation['updateTrackRecordsUnified']['results'];

/**
 * fork (Komikku port of UnifiedTrackerEdits): one edit for all trackers of a manga. Each tracker gets the closest
 * value it supports; values it cannot store are reported as skipped instead of as success.
 */
export const UnifiedTrackerEditor = ({
    mangaId,
    trackerNames,
}: {
    mangaId: number;
    trackerNames: Record<number, string>;
}) => {
    const { t } = useLingui();
    const [status, setStatus] = useState(0);
    const [chapter, setChapter] = useState('');
    const [score, setScore] = useState('');
    const [startDate, setStartDate] = useState('');
    const [finishDate, setFinishDate] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [results, setResults] = useState<Results | null>(null);
    const [error, setError] = useState<string | null>(null);

    const scoreValue = score === '' ? undefined : Number(score);
    const isScoreInvalid =
        scoreValue !== undefined && (!Number.isFinite(scoreValue) || scoreValue < 0 || scoreValue > 10);
    const startMillis = toEpochMillis(startDate);
    const finishMillis = toEpochMillis(finishDate);
    const areDatesInvalid = startMillis !== undefined && finishMillis !== undefined && startMillis > finishMillis;
    const hasChanges = !!status || chapter !== '' || scoreValue !== undefined || !!startDate || !!finishDate;

    const apply = async () => {
        setIsSaving(true);
        setError(null);
        setResults(null);
        try {
            const response = await requestManager.updateTrackRecordsUnified({
                mangaId,
                status: status ? STATUS_BY_VALUE[status] : undefined,
                lastChapterRead: chapter === '' ? undefined : Number(chapter),
                score: scoreValue,
                startDate: startMillis?.toString(),
                finishDate: finishMillis?.toString(),
            }).response;
            setResults(response.data?.updateTrackRecordsUnified.results ?? []);
        } catch (e) {
            setError(getErrorMessage(e));
        } finally {
            setIsSaving(false);
        }
    };

    const outcomeLabel = (outcome: UnifiedTrackEditOutcome) => {
        switch (outcome) {
            case UnifiedTrackEditOutcome.Updated:
                return t`Updated`;
            case UnifiedTrackEditOutcome.Skipped:
                return t`Skipped`;
            default:
                return t`Failed`;
        }
    };

    return (
        <Accordion disableGutters elevation={0} sx={{ '&::before': { display: 'none' } }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack>
                    <Typography variant="subtitle1">{t`Edit all trackers`}</Typography>
                    <Typography variant="caption" color="text.secondary">
                        {t`Apply one change to every tracker of this entry`}
                    </Typography>
                </Stack>
            </AccordionSummary>
            <AccordionDetails>
                <Stack sx={{ gap: 2 }}>
                    <TextField
                        select
                        size="small"
                        label={t`Status`}
                        value={status}
                        onChange={(e) => setStatus(Number(e.target.value))}
                    >
                        <MenuItem value={0}>{t`Unchanged`}</MenuItem>
                        {SMART_CATEGORY_STATUSES.map(({ value, label }) => (
                            <MenuItem key={value} value={value}>
                                {t(label)}
                            </MenuItem>
                        ))}
                    </TextField>
                    <Stack direction="row" sx={{ gap: 2 }}>
                        <TextField
                            size="small"
                            type="number"
                            label={t`Chapter`}
                            value={chapter}
                            onChange={(e) => setChapter(e.target.value)}
                            slotProps={{ htmlInput: { min: 0, step: 1 } }}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            size="small"
                            type="number"
                            label={t`Score (0-10)`}
                            value={score}
                            error={isScoreInvalid}
                            onChange={(e) => setScore(e.target.value)}
                            slotProps={{ htmlInput: { min: 0, max: 10, step: 0.5 } }}
                            sx={{ flex: 1 }}
                        />
                    </Stack>
                    <Stack direction="row" sx={{ gap: 2 }}>
                        <TextField
                            size="small"
                            type="date"
                            label={t`Start date`}
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ flex: 1 }}
                        />
                        <TextField
                            size="small"
                            type="date"
                            label={t`Finish date`}
                            value={finishDate}
                            error={areDatesInvalid}
                            helperText={areDatesInvalid ? t`Before the start date` : undefined}
                            onChange={(e) => setFinishDate(e.target.value)}
                            slotProps={{ inputLabel: { shrink: true } }}
                            sx={{ flex: 1 }}
                        />
                    </Stack>
                    <Button
                        variant="contained"
                        onClick={apply}
                        disabled={!hasChanges || isSaving || isScoreInvalid || areDatesInvalid}
                        sx={{ alignSelf: 'flex-end' }}
                    >
                        {isSaving ? t`Updating…` : t`Apply to all trackers`}
                    </Button>
                    {error && <Alert severity="error">{error}</Alert>}
                    {results && (
                        <List dense aria-live="polite">
                            {results.map((result) => (
                                <ListItem key={result.recordId} disableGutters>
                                    <ListItemText
                                        primary={`${trackerNames[result.trackerId] ?? result.trackerId}: ${outcomeLabel(result.outcome)}`}
                                        secondary={result.messages.join(' · ') || undefined}
                                        slotProps={{
                                            primary: { color: OUTCOME_COLOR[result.outcome] },
                                        }}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Stack>
            </AccordionDetails>
        </Accordion>
    );
};
