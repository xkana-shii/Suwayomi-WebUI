/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import gql from 'graphql-tag';

// fork (Komikku port): per-user server settings used by the port

export const GET_USER_SETTINGS_KOMIKKU_PORT = gql`
    query GET_USER_SETTINGS_KOMIKKU_PORT {
        userSettings {
            smartScanlatorMerge
        }
    }
`;

export const SET_USER_SETTINGS_SMART_SCANLATOR_MERGE = gql`
    mutation SET_USER_SETTINGS_SMART_SCANLATOR_MERGE($smartScanlatorMerge: Boolean!) {
        setUserSettings(input: { userSettings: { smartScanlatorMerge: $smartScanlatorMerge } }) {
            userSettings {
                smartScanlatorMerge
            }
        }
    }
`;
