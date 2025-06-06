import { BackupDataType } from './backupType';

export const apiGetCongregationBackup = async ({
  apiHost,
  userID,
  idToken,
  metadata,
}: {
  apiHost: string;
  userID: string;
  idToken: string;
  metadata: string;
}) => {
  const res = await fetch(`${apiHost}api/v3/users/${userID}/backup`, {
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Authorization: `Bearer ${idToken}`,
      appclient: 'organized',
      appversion: import.meta.env.PACKAGE_VERSION,
      metadata,
    },
  });

  const data = await res.json();

  if (res.status !== 200) {
    throw new Error(data.message);
  }

  return data as BackupDataType;
};

export const apiSendCongregationBackup = async ({
  apiHost,
  userID,
  reqPayload,
  idToken,
  metadata,
}: {
  apiHost: string;
  userID: string;
  reqPayload: object;
  idToken: string;
  metadata: Record<string, string>;
}) => {
  const res = await fetch(`${apiHost}api/v3/users/${userID}/backup`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Authorization: `Bearer ${idToken}`,
      appclient: 'organized',
      appversion: import.meta.env.PACKAGE_VERSION,
    },
    body: JSON.stringify({ cong_backup: { ...reqPayload, metadata } }),
  });

  const data = await res.json();

  return data;
};

export const apiGetPocketBackup = async ({
  apiHost,
  userID, // Added
  idToken, // Added
  metadata,
}: {
  apiHost: string;
  userID: string; // Added
  idToken: string; // Added
  metadata: string;
}) => {
  const res = await fetch(`${apiHost}api/v3/pockets/backup`, { // URL remains the same
    method: 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Authorization: `Bearer ${idToken}`, // Added Authorization header
      appclient: 'organized',
      appversion: import.meta.env.PACKAGE_VERSION,
      metadata,
    },
  });

  const data = await res.json();

  if (res.status !== 200) {
    throw new Error(data.message);
  }

  return data as BackupDataType;
};

export const apiSendPocketBackup = async ({
  apiHost,
  userID, // Added
  idToken, // Added
  reqPayload,
  metadata,
}: { // Added type for parameters
  apiHost: string;
  userID: string; // Added
  idToken: string; // Added
  reqPayload: object;
  metadata: string; // Assuming metadata is stringified JSON here
}) => {
  const res = await fetch(`${apiHost}api/v3/pockets/backup`, { // URL remains the same
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Authorization: `Bearer ${idToken}`, // Added Authorization header
      appclient: 'organized',
      appversion: import.meta.env.PACKAGE_VERSION,
      metadata, // Assuming metadata is passed as a header
    },
    body: JSON.stringify({ cong_backup: reqPayload }),
  });

  const data = await res.json();

  return data;
};
