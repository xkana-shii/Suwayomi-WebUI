/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Switch from '@mui/material/Switch';
import ListSubheader from '@mui/material/ListSubheader';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import { useLingui } from '@lingui/react/macro';
import { plural, t as translate } from '@lingui/core/macro';
import { GlobalUpdateSettings } from '@/features/settings/components/globalUpdate/GlobalUpdateSettings.tsx';
import { makeToast } from '@/base/utils/Toast.ts';
import {
    createUpdateMetadataServerSettings,
    useMetadataServerSettings,
} from '@/features/settings/services/ServerSettingsMetadata.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { ListItemLink } from '@/base/components/lists/ListItemLink.tsx';
import type {
    GetCategoriesSettingsQuery,
    GetCategoriesSettingsQueryVariables,
    GetMangasBaseQuery,
    GetMangasBaseQueryVariables,
} from '@/lib/graphql/generated/graphql.ts';
import { GET_CATEGORIES_SETTINGS } from '@/lib/graphql/category/CategoryQuery.ts';
import { GET_MANGAS_BASE } from '@/lib/graphql/manga/MangaQuery.ts';
import type { MetadataLibrarySettings } from '@/features/library/Library.types.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useState } from 'react';
import { CLEAR_DATABASE } from '@/lib/graphql/server/ServerInfoMutation.ts';

const removeNonLibraryMangasFromCategories = async (): Promise<void> => {
    try {
        const nonLibraryMangas = await requestManager.getMangas<GetMangasBaseQuery, GetMangasBaseQueryVariables>(
            GET_MANGAS_BASE,
            {
                filter: { inLibrary: { equalTo: false }, categoryId: { isNull: false } },
            },
            { fetchPolicy: 'no-cache' },
        ).response;

        if (!nonLibraryMangas.data) {
            return;
        }

        const mangaIdsToRemove = Mangas.getIds(nonLibraryMangas.data.mangas.nodes);

        if (mangaIdsToRemove.length) {
            await requestManager.updateMangasCategories(mangaIdsToRemove, {
                clearCategories: true,
            }).response;
        }
        makeToast(translate`Removed non library manga from categories`, 'success');
    } catch (e) {
        makeToast(translate`Could not remove non library manga from categories`, 'error', getErrorMessage(e));
    }
};

export function LibrarySettings() {
    const { t } = useLingui();

    useAppTitle(t`Library`);

    const categories = requestManager.useGetCategories<GetCategoriesSettingsQuery, GetCategoriesSettingsQueryVariables>(
        GET_CATEGORIES_SETTINGS,
    );
    const serverSettings = requestManager.useGetServerSettings();
    const {
        settings,
        loading: areMetadataServerSettingsLoading,
        request: { error: metadataServerSettingsError, refetch: refetchMetadataServerSettings },
    } = useMetadataServerSettings();

    const setSettingValue = createUpdateMetadataServerSettings<keyof MetadataLibrarySettings>((e) =>
        makeToast(t`Could not save the default search settings to the server`, 'error', getErrorMessage(e)),
    );

    // -1 for the DEFAULT category
    const categoryCount = (categories.data?.categories.nodes.length ?? 1) - 1;

    const loading = serverSettings.loading || areMetadataServerSettingsLoading || categories.loading;
    if (loading) {
        return <LoadingPlaceholder />;
    }

    const error = serverSettings.error ?? metadataServerSettingsError ?? categories.error;
    if (error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Unable to load data`}
                messageExtra={getErrorMessage(error)}
                retry={() => {
                    if (serverSettings.error) {
                        serverSettings
                            ?.refetch()
                            .catch(defaultPromiseErrorHandler('LibrarySettings::refetchServerSettings'));
                    }

                    if (metadataServerSettingsError) {
                        refetchMetadataServerSettings().catch(
                            defaultPromiseErrorHandler('LibrarySettings::refetchMetadataServerSettings'),
                        );
                    }

                    if (categories.error) {
                        categories.refetch().catch(defaultPromiseErrorHandler('LibrarySettings::refetchCategories'));
                    }
                }}
            />
        );
    }

    // State for the new Clear Database dialog
    const [isClearDialogOpen, setClearDialogOpen] = useState(false);
    const [keepReadManga, setKeepReadManga] = useState(true);
    const [confirmText, setConfirmText] = useState('');
    const [isClearing, setIsClearing] = useState(false);

    const openClearDialog = () => {
        setConfirmText('');
        setKeepReadManga(true);
        setClearDialogOpen(true);
    };

    const handleClearDatabase = async () => {
        setIsClearing(true);
        try {
            await requestManager.graphQLClient.client.mutate({
                mutation: CLEAR_DATABASE,
                variables: { input: { keepReadManga } },
            });
            makeToast(t`Database cleared`, 'success');
            setClearDialogOpen(false);
        } catch (e) {
            makeToast(t`Could not clear database`, 'error', getErrorMessage(e));
        } finally {
            setIsClearing(false);
            setConfirmText('');
        }
    };

    return (
        <List sx={{ pt: 0 }}>
            <List
                subheader={
                    <ListSubheader component="div" id="library-category-settings">
                        {t`Categories`}
                    </ListSubheader>
                }
            >
                <ListItemLink to={AppRoutes.settings.childRoutes.categories.path}>
                    <ListItemText
                        primary={t`Edit categories`}
                        secondary={plural(categoryCount, {
                            one: '# category',
                            other: '# categories',
                        })}
                    />
                </ListItemLink>
                <ListItem>
                    <ListItemText
                        primary={t`Category selection dialog`}
                        secondary={t`Show the category selection dialog when adding a manga to the library`}
                    />
                    <Switch
                        edge="end"
                        checked={settings.showAddToLibraryCategorySelectDialog}
                        onChange={(e) => setSettingValue('showAddToLibraryCategorySelectDialog', e.target.checked)}
                    />
                </ListItem>
                <ListItem>
                    <ListItemText
                        primary={t`Forget manga categories`}
                        secondary={t`Remove manga from categories when removing them from the library`}
                    />
                    <Switch
                        edge="end"
                        checked={settings.removeMangaFromCategories}
                        onChange={(e) => setSettingValue('removeMangaFromCategories', e.target.checked)}
                    />
                </ListItem>
            </List>
            <List
                subheader={
                    <ListSubheader component="div" id="library-general-settings">
                        {t`General`}
                    </ListSubheader>
                }
            >
                <ListItem>
                    <ListItemText
                        primary={t`Ignore filters when searching`}
                        secondary={t`Search results will include manga that do not match the current filters`}
                    />
                    <Switch
                        edge="end"
                        checked={settings.ignoreFilters}
                        onChange={(e) => setSettingValue('ignoreFilters', e.target.checked)}
                    />
                </ListItem>
            </List>
            <GlobalUpdateSettings
                serverSettings={serverSettings.data!.settings}
                categories={categories.data!.categories.nodes}
            />
            <List
                subheader={
                    <ListSubheader component="div" id="library-advanced">
                        {t`Advanced`}
                    </ListSubheader>
                }
            >
                <ListItemButton onClick={() => removeNonLibraryMangasFromCategories()}>
                    <ListItemText
                        primary={t`Cleanup database`}
                        secondary={t`Remove non library manga from categories`}
                    />
                </ListItemButton>

                {/* New Clear Database action (calls server clearDatabase mutation) */}
                <ListItemButton onClick={openClearDialog}>
                    <ListItemText
                        primary={t`Clear database`}
                        secondary={t`Remove non-library manga from the database`}
                    />
                </ListItemButton>

                <ListItemLink to={AppRoutes.settings.childRoutes.library.childRoutes.duplicates.path}>
                    <ListItemText
                        primary={t`Duplicated entries`}
                        secondary={t`Show all duplicated entries in your library`}
                    />
                </ListItemLink>
            </List>

            {/* Clear Database confirmation dialog */}
            <Dialog
                open={isClearDialogOpen}
                onClose={() => {
                    if (!isClearing) {setClearDialogOpen(false);}
                }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>{t`Clear database`}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {t`This will delete all non-library manga entries from the server database. This action cannot be undone.`}
                    </DialogContentText>

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={keepReadManga}
                                onChange={(e) => setKeepReadManga(e.target.checked)}
                                disabled={isClearing}
                            />
                        }
                        label={t`Keep manga that have read chapters`}
                    />

                    <TextField
                        label={t`Type "CLEAR" to confirm`}
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        fullWidth
                        margin="normal"
                        disabled={isClearing}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            if (!isClearing) {setClearDialogOpen(false);}
                        }}
                        disabled={isClearing}
                    >
                        {t`Cancel`}
                    </Button>
                    <Button
                        onClick={() => handleClearDatabase()}
                        disabled={isClearing || confirmText !== 'CLEAR'}
                        variant="contained"
                    >
                        {isClearing ? t`Clearing…` : t`Ok`}
                    </Button>
                </DialogActions>
            </Dialog>
        </List>
    );
}
