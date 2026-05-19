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
import ListItemAvatar from '@mui/material/ListItemAvatar';
import Switch from '@mui/material/Switch';
import ListSubheader from '@mui/material/ListSubheader';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
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
import { ListCardAvatar } from '@/base/components/lists/cards/ListCardAvatar.tsx';
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
import SelectAllIcon from '@mui/icons-material/SelectAll';
import FlipToBackIcon from '@mui/icons-material/FlipToBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import { GET_SOURCES_WITH_COUNTS } from '@/lib/graphql/source/SourceQuery.ts';
import { CLEAR_DATABASE } from '@/lib/graphql/server/ServerInfoMutation.ts';

/**
 * Build the extension-style icon path used by the browse screen.
 * Returns undefined when none available.
 */
function buildExtensionIconPath(node: any): string | undefined {
    if (node?.iconUrl && typeof node.iconUrl === 'string') {
        return node.iconUrl;
    }

    const candidates = [
        node?.apkName,
        node?.apk_name,
        node?.apk,
        node?.apk_filename,
        node?.apkFileName,
        node?.pkg,
        node?.pkgName,
        node?.packageName,
        node?.extension?.apkName,
        node?.extension?.pkg,
    ];
    const apk = candidates.find((c) => typeof c === 'string' && c.length > 0);
    if (apk) {
        return `/api/v1/extension/icon/${encodeURIComponent(String(apk))}`;
    }

    return undefined;
}

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

    // GraphQL hooks / retrieval hooks
    const categories = requestManager.useGetCategories<GetCategoriesSettingsQuery, GetCategoriesSettingsQueryVariables>(
        GET_CATEGORIES_SETTINGS,
    );
    const serverSettings = requestManager.useGetServerSettings();
    const {
        settings,
        loading: areMetadataServerSettingsLoading,
        request: { error: metadataServerSettingsError, refetch: refetchMetadataServerSettings },
    } = useMetadataServerSettings();

    // stable helper
    const setSettingValue = createUpdateMetadataServerSettings<keyof MetadataLibrarySettings>((e) =>
        makeToast(t`Could not save the default search settings to the server`, 'error', getErrorMessage(e)),
    );

    // All component-level hooks must be declared before early returns:
    const [isClearDialogOpen, setClearDialogOpen] = useState(false);
    const [isConfirmOpen, setConfirmOpen] = useState(false); // confirmation dialog
    const [keepReadManga, setKeepReadManga] = useState(true);
    const [isClearing, setIsClearing] = useState(false);

    // sources list for the dialog (only sources with count > 0 will be stored)
    // NOTE: id is a string to avoid JS integer overflow issues.
    const [sources, setSources] = useState<
        {
            id: string;
            name: string;
            lang: string | null;
            count: number;
            selected: boolean;
            iconUrl: string; // always a string ('' when none)
            originalIconPath?: string | undefined;
            iconCacheBuster?: number | undefined;
            extensionPkg?: string | undefined;
        }[]
    >([]);

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

    // helper to fetch and set sources (only those with nonLibraryCount > 0)
    // helper to fetch and set sources (only those with nonLibraryCount > 0)
const loadSourcesIfNeeded = async () => {
    if (sources.length > 0) {
        return;
    }
    try {
        const resp: any = await requestManager.graphQLClient.client.query({
            query: GET_SOURCES_WITH_COUNTS,
            fetchPolicy: 'no-cache',
        });

        const nodes = resp.data?.sources?.nodes ?? [];
        const filtered = nodes
            .map((s: any) => {
                const count = Number(s.nonLibraryCount ?? s.count ?? 0);

                // prefer explicit source.iconUrl, otherwise fallback to extension pkgName
                const sourceIconPath = typeof s.iconUrl === 'string' && s.iconUrl.length ? s.iconUrl : undefined;
                const extensionPkg = s?.extension?.pkgName ?? undefined;
                const finalIconPath =
                    sourceIconPath ?? (extensionPkg ? `/api/v1/extension/icon/${encodeURIComponent(extensionPkg)}` : undefined);

                return {
                    // treat id as string to avoid integer overflow
                    id: String(s.id),
                    name: s.name,
                    lang: s.lang,
                    count,
                    selected: false,
                    iconUrl: finalIconPath ? requestManager.getValidImgUrlFor(finalIconPath) : '',
                    originalIconPath: sourceIconPath ?? undefined,
                    iconCacheBuster: undefined,
                    extensionPkg,
                };
            })
            .filter((s: any) => s.count > 0);

        setSources(filtered);
    } catch (e) {
        makeToast(t`Could not fetch sources`, 'error', getErrorMessage(e));
    }
};

    const openClearDialog = async () => {
        setIsClearing(false);
        await loadSourcesIfNeeded();
        setClearDialogOpen(true);
    };

    // select-all icon handler
    const handleSelectAllClick = async (ev?: React.MouseEvent) => {
        ev?.stopPropagation();
        setIsClearing(false);
        await loadSourcesIfNeeded();
        setSources((old) => old.map((s) => ({ ...s, selected: true })));
        setClearDialogOpen(true);
    };

    // invert selection icon handler
    const handleInvertClick = async (ev?: React.MouseEvent) => {
        ev?.stopPropagation();
        setIsClearing(false);
        await loadSourcesIfNeeded();
        setSources((old) => old.map((s) => ({ ...s, selected: !s.selected })));
        setClearDialogOpen(true);
    };

    const toggleSource = (id: string) => {
        setSources((old) => old.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)));
    };

    // refresh icon: clear error and append cache buster to force reload.
    // If there was no originalIconPath, attempt to build icon url from extensionPkg and append cb.
    const refreshIcon = (id: string) => {
        setSources((old) =>
            old.map((s) => {
                if (s.id !== id) {return s;}
                const cb = Date.now();
                if (s.originalIconPath && s.originalIconPath.length) {
                    return {
                        ...s,
                        iconCacheBuster: cb,
                        iconUrl: `${requestManager.getValidImgUrlFor(s.originalIconPath)}${s.originalIconPath.includes('?') ? '&' : '?'}cb=${cb}`,
                    };
                }
                if (s.extensionPkg) {
                    const extUrl = `/api/v1/extension/icon/${encodeURIComponent(s.extensionPkg)}`;
                    return {
                        ...s,
                        iconCacheBuster: cb,
                        iconUrl: `${requestManager.getValidImgUrlFor(extUrl)}?cb=${cb}`,
                    };
                }
                return s;
            }),
        );
    };

    // Open confirmation dialog from main dialog's Delete button
    const openConfirmDialog = () => {
        setConfirmOpen(true);
    };

    // Called when user confirms removal in confirmation dialog
    const handleConfirmRemove = async () => {
        // keep ids as strings
        const selectedIds = sources.filter((s) => s.selected).map((s) => String(s.id));
        console.debug('LibrarySettings: clearing sources', selectedIds);

        if (!selectedIds.length) {
            makeToast(t`No sources selected`, 'error');
            setConfirmOpen(false);
            return;
        }
        setIsClearing(true);
        try {
            await requestManager.graphQLClient.client.mutate({
                mutation: CLEAR_DATABASE,
                // pass ids as strings so no integer overflow occurs
                variables: { input: { keepReadManga, sourceIds: selectedIds } },
            });
            makeToast(t`Database cleared`, 'success');
            setConfirmOpen(false);
            setClearDialogOpen(false);
            // reset selections
            setSources((old) => old.map((s) => ({ ...s, selected: false })));
        } catch (e) {
            makeToast(t`Could not clear database`, 'error', getErrorMessage(e));
        } finally {
            setIsClearing(false);
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

                {/* Outer Clear database row opens the dialog */}
                <ListItem disablePadding>
                    <ListItemButton onClick={openClearDialog}>
                        <ListItemText
                            primary={t`Clear database`}
                            secondary={t`Delete history for entries that are not saved in your library`}
                        />
                    </ListItemButton>
                </ListItem>

                <ListItemLink to={AppRoutes.settings.childRoutes.library.childRoutes.duplicates.path}>
                    <ListItemText
                        primary={t`Duplicated entries`}
                        secondary={t`Show all duplicated entries in your library`}
                    />
                </ListItemLink>
            </List>

            {/* Clear Database dialog */}
            <Dialog
                open={isClearDialogOpen}
                onClose={() => {
                    if (!isClearing) {
                        setClearDialogOpen(false);
                    }
                }}
                fullWidth={false}
                PaperProps={{
                    sx: {
                        width: 'auto',
                        display: 'inline-block',
                        maxWidth: '80vw',
                        maxHeight: '80vh',
                        p: 0,
                    },
                }}
            >
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pl: 2, pb: 1 }}>
                    <Box component="span" sx={{ flex: 1 }}>
                        {t`Clear database`}
                    </Box>

                    <Box sx={{ pr: '12px', display: 'flex', gap: 1, alignItems: 'center' }}>
                        <IconButton
                            size="small"
                            onClick={(ev) => {
                                ev.stopPropagation();
                                handleSelectAllClick(ev);
                            }}
                            title={t`Select all`}
                            aria-label="select-all-sources"
                        >
                            <SelectAllIcon />
                        </IconButton>

                        <IconButton
                            size="small"
                            onClick={(ev) => {
                                ev.stopPropagation();
                                handleInvertClick(ev);
                            }}
                            title={t`Invert selection`}
                            aria-label="invert-selection"
                            sx={{ mr: 0 }}
                        >
                            <FlipToBackIcon />
                        </IconButton>
                    </Box>
                </DialogTitle>

                <DialogContent sx={{ whiteSpace: 'normal', overflow: 'auto', p: 0 }}>
                    <List sx={{ p: 0 }}>
                        {sources.map((s) => (
                            <ListItem key={s.id} disablePadding>
                                <ListItemButton
                                    onClick={() => toggleSource(s.id)}
                                    selected={s.selected}
                                    dense
                                    sx={{
                                        mb: 1,
                                        bgcolor: s.selected ? 'action.selected' : 'transparent',
                                        transition: 'background-color 150ms',
                                        '&:hover': {
                                            bgcolor: s.selected ? 'action.selected' : 'action.hover',
                                        },
                                        borderRadius: 1,
                                        alignItems: 'center',
                                        width: '100%',
                                    }}
                                >
                                    <ListItemAvatar sx={{ minWidth: 40 }}>
                                        {/* If we have an icon URL (string, not empty) use the standard avatar pipeline */}
                                        {s.iconUrl ? (
                                            <ListCardAvatar
                                                iconUrl={s.iconUrl}
                                                alt={s.name}
                                                slots={{
                                                    avatarProps: {
                                                        sx: { width: 32, height: 32 },
                                                    },
                                                    spinnerImageProps: {
                                                        ignoreQueue: true,
                                                    },
                                                }}
                                            />
                                        ) : (
                                            // Browse-style fallback when icon missing:
                                            // broken image icon + small refresh button
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    flexDirection: 'column',
                                                }}
                                            >
                                                <BrokenImageIcon fontSize="small" />
                                                <IconButton
                                                    size="small"
                                                    onClick={(ev) => {
                                                        ev.stopPropagation();
                                                        refreshIcon(s.id);
                                                    }}
                                                    aria-label="refresh-icon"
                                                    sx={{ mt: 0.25 }}
                                                >
                                                    <RefreshIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        )}
                                    </ListItemAvatar>

                                    <ListItemText
                                        primary={`${s.name}${s.lang ? ` (${s.lang.toUpperCase()})` : ''}`}
                                        secondary={`${s.count} non-library entries in database`}
                                        sx={{ pr: '56px' }}
                                        primaryTypographyProps={{
                                            sx: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                                        }}
                                        secondaryTypographyProps={{
                                            sx: { overflow: 'hidden', textOverflow: 'ellipsis' },
                                        }}
                                    />
                                </ListItemButton>

                                <ListItemSecondaryAction sx={{ right: 12 }}>
                                    <Checkbox
                                        edge="end"
                                        checked={s.selected}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={() => toggleSource(s.id)}
                                        disabled={isClearing}
                                        inputProps={{ 'aria-label': `select-source-${s.id}` }}
                                    />
                                </ListItemSecondaryAction>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            if (!isClearing) {
                                setClearDialogOpen(false);
                            }
                        }}
                        disabled={isClearing}
                    >
                        {t`Cancel`}
                    </Button>
                    <Button onClick={() => openConfirmDialog()} disabled={isClearing} variant="text">
                        {t`Delete`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Confirmation dialog */}
            <Dialog
                open={isConfirmOpen}
                onClose={() => {
                    if (!isClearing) {
                        setConfirmOpen(false);
                    }
                }}
                fullWidth={false}
                PaperProps={{
                    sx: {
                        width: 'auto',
                        display: 'inline-block',
                        maxWidth: '60vw',
                        p: 0,
                    },
                }}
            >
                <DialogTitle sx={{ pl: 2, pb: 1 }}>{t`Are you sure?`}</DialogTitle>

                <DialogContent sx={{ whiteSpace: 'normal', p: 0 }}>
                    <DialogContentText sx={{ mb: 2, px: 2 }}>
                        {t`You're about to remove entries from the database`}
                    </DialogContentText>

                    <ListItem disableGutters sx={{ px: 2 }}>
                        <ListItemText primary={t`Keep entries with read chapters`} />
                        <ListItemSecondaryAction sx={{ right: 8 }}>
                            <Switch
                                checked={keepReadManga}
                                onChange={(e) => setKeepReadManga(e.target.checked)}
                                disabled={isClearing}
                                edge="end"
                                inputProps={{ 'aria-label': 'keep-read-switch' }}
                            />
                        </ListItemSecondaryAction>
                    </ListItem>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            if (!isClearing) {
                                setConfirmOpen(false);
                            }
                        }}
                        disabled={isClearing}
                    >
                        {t`Cancel`}
                    </Button>
                    <Button onClick={() => handleConfirmRemove()} disabled={isClearing} variant="text">
                        {isClearing ? t`Deleting…` : t`Confirm`}
                    </Button>
                </DialogActions>
            </Dialog>
        </List>
    );
}
