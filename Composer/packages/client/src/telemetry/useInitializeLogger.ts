// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

import { useCallback, useEffect, useMemo } from 'react';
import { useRecoilValue } from 'recoil';
import { PageNames } from '@bfc/shared';

import { currentProjectIdState, userSettingsState } from '../recoilModel';
import { getPageName } from '../utils/getPageName';
import { useLocation } from '../utils/hooks';

import TelemetryClient from './TelemetryClient';

const { ipcRenderer } = window;

export const useInitializeLogger = () => {
  const rootProjectId = useRecoilValue(currentProjectIdState);
  const { telemetry } = useRecoilValue(userSettingsState);
  const {
    location: { pathname, href: url },
  } = useLocation();
  const page = useMemo<PageNames>(() => getPageName(pathname), [pathname]);

  TelemetryClient.setup(telemetry, { rootProjectId, page });

  useEffect(() => {
    ipcRenderer?.on('session-update', (_event, name) => {
      switch (name) {
        case 'session-started':
          TelemetryClient.log('SessionStarted', {} as any);
          break;
        case 'session-ended':
          TelemetryClient.log('SessionEnded');
          TelemetryClient.drain();
          break;
        default:
          break;
      }
    });
  }, []);

  useEffect(() => {
    TelemetryClient.log('NavigateTo', { sectionName: page, url });
    TelemetryClient.pageView(page, url);
  }, [page]);

  const handleBeforeUnload = useCallback(() => {
    TelemetryClient.drain();
  }, []);

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);
};
