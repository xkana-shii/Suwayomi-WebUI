/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Divider from '@mui/material/Divider';
import ListItemButton from '@mui/material/ListItemButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { ListItemLink } from '@/base/components/lists/ListItemLink.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { UpdateState } from '@/lib/graphql/generated/graphql-base.types.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { VersionInfo } from '@/features/app-updates/components/VersionInfo.tsx';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { epochToDate } from '@/base/utils/DateHelper.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { SHUTDOWN_SERVER } from '@/lib/graphql/server/ServerInfoMutation.ts';
import { makeToast } from '@/base/utils/Toast.ts';
import { useState } from 'react';

export function About() {
    const { t } = useLingui();

    useAppTitle(t`About`);

    const { data, loading, error, refetch } = requestManager.useGetAbout();

    const {
        data: serverUpdateCheckData,
        loading: isCheckingForServerUpdate,
        refetch: checkForServerUpdate,
        error: serverUpdateCheckError,
    } = requestManager.useCheckForServerUpdate();
    const {
        data: webUIUpdateData,
        loading: isCheckingForWebUIUpdate,
        refetch: checkForWebUIUpdate,
        error: orgWebUIUpdateCheckError,
    } = requestManager.useCheckForWebUIUpdate();
    const webUIUpdateCheckError = orgWebUIUpdateCheckError || webUIUpdateData?.checkForWebUIUpdate.tag === '';

    const { data: webUIUpdateStatusData } = requestManager.useGetWebUIUpdateStatus();
    const { state: webUIUpdateState, progress: webUIUpdateProgress } = webUIUpdateStatusData?.getWebUIUpdateStatus ?? {
        state: UpdateState.Idle,
        progress: 0,
    };

    const [isShutdownDialogOpen, setShutdownDialogOpen] = useState(false);
    const [isShuttingDown, setIsShuttingDown] = useState(false);

    const handleConfirmShutdown = async () => {
        setIsShuttingDown(true);
        try {
            await requestManager.graphQLClient.client.mutate({
                mutation: SHUTDOWN_SERVER,
                variables: { input: {} },
            });

            makeToast(t`Shutdown command sent. The server should stop shortly.`, 'info');

            // Close dialog after sending command
            setShutdownDialogOpen(false);

            // Optionally you could redirect or change UI here, but the server will shut down the connection.
            // e.g. window.location.href = requestManager.getBaseUrl();
        } catch (e) {
            makeToast(t`Could not send shutdown command`, 'error', getErrorMessage(e));
        } finally {
            setIsShuttingDown(false);
        }
    };

    if (loading) {
        return <LoadingPlaceholder />;
    }

    if (error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Unable to load data`}
                messageExtra={getErrorMessage(error)}
                retry={() => refetch().catch(defaultPromiseErrorHandler('About::refetch'))}
            />
        );
    }

    const { aboutServer, aboutWebUI } = data!;
    const selectedServerChannelInfo = serverUpdateCheckData?.checkForServerUpdates?.find(
        (channel) => channel.channel === aboutServer.buildType,
    );
    const isServerUpdateAvailable =
        !!selectedServerChannelInfo?.tag && selectedServerChannelInfo.tag !== aboutServer.version;
    const isWebUIUpdateAvailable = !!webUIUpdateData?.checkForWebUIUpdate.updateAvailable;

    return (
        <>
            <List sx={{ pt: 0 }}>
                <List
                    sx={{ padding: 0 }}
                    subheader={
                        <ListSubheader component="div" id="about-server-info">
                            {t`Server`}
                        </ListSubheader>
                    }
                >
                    <ListItem>
                        <ListItemText primary={t`Server`} secondary={`${aboutServer.name} (${aboutServer.buildType})`} />
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary={t`Server version`}
                            secondary={
                                <VersionInfo
                                    version={aboutServer.version}
                                    isCheckingForUpdate={isCheckingForServerUpdate}
                                    isUpdateAvailable={isServerUpdateAvailable}
                                    updateCheckError={serverUpdateCheckError}
                                    checkForUpdate={checkForServerUpdate}
                                    downloadAsLink
                                    url={selectedServerChannelInfo?.url ?? ''}
                                />
                            }
                        />
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary={t`Build time`}
                            secondary={epochToDate(Number(aboutServer.buildTime)).toString()}
                        />
                    </ListItem>

                    <ListItemButton onClick={() => setShutdownDialogOpen(true)}>
                        <ListItemText
                            primary={t`Shut down server`}
                            secondary={t`Stop the running Suwayomi-Server process from the WebUI`}
                        />
                    </ListItemButton>
                </List>
                <Divider />
                <List
                    sx={{ padding: 0 }}
                    subheader={
                        <ListSubheader component="div" id="about-webui-info">
                            {t`WebUI`}
                        </ListSubheader>
                    }
                >
                    <ListItem>
                        <ListItemText primary={t`WebUI channel`} secondary={aboutWebUI.channel.toLocaleUpperCase()} />
                    </ListItem>
                    <ListItem>
                        <ListItemText
                            primary={t`WebUI version`}
                            secondary={
                                <VersionInfo
                                    version={aboutWebUI.tag}
                                    isCheckingForUpdate={isCheckingForWebUIUpdate}
                                    isUpdateAvailable={isWebUIUpdateAvailable}
                                    updateCheckError={webUIUpdateCheckError}
                                    checkForUpdate={checkForWebUIUpdate}
                                    triggerUpdate={() =>
                                        requestManager
                                            .updateWebUI()
                                            .response.catch(defaultPromiseErrorHandler('About::updateWebUI'))
                                    }
                                    progress={webUIUpdateProgress}
                                    updateState={webUIUpdateState}
                                />
                            }
                        />
                    </ListItem>
                </List>
                <Divider />
                <List
                    subheader={
                        <ListSubheader component="div" id="about-links">
                            {t`Links`}
                        </ListSubheader>
                    }
                >
                    <ListItemLink to={aboutServer.github} target="_blank" rel="noreferrer">
                        <ListItemText primary={t`GitHub Server`} secondary={aboutServer.github} />
                    </ListItemLink>
                    <ListItemLink to="https://github.com/Suwayomi/Suwayomi-WebUI" target="_blank" rel="noreferrer">
                        <ListItemText primary={t`GitHub WebUI`} secondary="https://github.com/Suwayomi/Suwayomi-WebUI" />
                    </ListItemLink>
                    <ListItemLink to={aboutServer.discord} target="_blank" rel="noreferrer">
                        <ListItemText primary={t`Discord`} secondary={aboutServer.discord} />
                    </ListItemLink>
                </List>
            </List>

            <Dialog
                open={isShutdownDialogOpen}
                onClose={() => {
                    if (!isShuttingDown) {setShutdownDialogOpen(false);}
                }}
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle>{t`Shut down server`}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{t`Are you sure you want to shut down the server?`}</DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => {
                            if (!isShuttingDown) {setShutdownDialogOpen(false);}
                        }}
                    >
                        {t`Cancel`}
                    </Button>
                    <Button onClick={handleConfirmShutdown} disabled={isShuttingDown} variant="contained">
                        {isShuttingDown ? t`Shutting down…` : t`Ok`}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
