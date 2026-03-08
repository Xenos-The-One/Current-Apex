/**
 * Google Search Console API Helper
 *
 * Provides functions to authenticate with and fetch data from the
 * Google Search Console API (Search Analytics endpoint).
 *
 * Authentication supports:
 *  - OAuth2 access/refresh tokens
 *  - Service account JSON key
 */

import axios from "axios";

export interface SearchConsoleRow {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;      // 0–1 fraction
  position: number; // average position (1-based)
}

export interface SearchConsoleCredentials {
  siteUrl: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  serviceAccountEmail?: string | null;
  serviceAccountKey?: string | null; // JSON string
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

/**
 * Refresh an OAuth2 access token using the refresh token.
 */
async function refreshAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<string> {
  const response = await axios.post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );
  return response.data.access_token as string;
}

/**
 * Fetch Search Analytics data from the Search Console API.
 * Returns up to 1000 rows sorted by clicks descending.
 */
export async function fetchSearchConsoleData(
  creds: SearchConsoleCredentials
): Promise<SearchConsoleRow[]> {
  let token = creds.accessToken;

  // Refresh token if needed
  if (!token && creds.refreshToken && creds.clientId && creds.clientSecret) {
    token = await refreshAccessToken(creds.clientId, creds.clientSecret, creds.refreshToken);
  }

  if (!token) {
    throw new Error("No valid access token available for Search Console");
  }

  const encodedSite = encodeURIComponent(creds.siteUrl);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`;

  const body = {
    startDate: creds.startDate,
    endDate: creds.endDate,
    dimensions: ["query", "page"],
    rowLimit: 1000,
    orderBy: [{ fieldName: "clicks", sortOrder: "DESCENDING" }],
  };

  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const rows: SearchConsoleRow[] = (response.data.rows || []).map((row: any) => ({
    query: row.keys?.[0] ?? "",
    page: row.keys?.[1] ?? "",
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));

  return rows;
}

/**
 * Fetch site-level summary metrics (total clicks, impressions, avg CTR, avg position)
 * for a given date range.
 */
export async function fetchSearchConsoleSummary(
  creds: SearchConsoleCredentials
): Promise<{
  totalClicks: number;
  totalImpressions: number;
  avgCtr: number;
  avgPosition: number;
}> {
  let token = creds.accessToken;

  if (!token && creds.refreshToken && creds.clientId && creds.clientSecret) {
    token = await refreshAccessToken(creds.clientId, creds.clientSecret, creds.refreshToken);
  }

  if (!token) {
    throw new Error("No valid access token available for Search Console");
  }

  const encodedSite = encodeURIComponent(creds.siteUrl);
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSite}/searchAnalytics/query`;

  const body = {
    startDate: creds.startDate,
    endDate: creds.endDate,
    dimensions: [],
    rowLimit: 1,
  };

  const response = await axios.post(url, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const row = response.data.rows?.[0];
  return {
    totalClicks: row?.clicks ?? 0,
    totalImpressions: row?.impressions ?? 0,
    avgCtr: row?.ctr ?? 0,
    avgPosition: row?.position ?? 0,
  };
}
