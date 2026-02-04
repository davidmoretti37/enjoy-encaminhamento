// Zoom Server-to-Server OAuth Integration
// Docs: https://developers.zoom.us/docs/internal-apps/s2s-oauth/

import { ENV } from "../_core/env";

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ZoomMeetingResponse {
  id: number;
  uuid: string;
  host_id: string;
  topic: string;
  start_url: string;
  join_url: string;
  password: string;
}

interface CreateMeetingParams {
  topic: string;
  startTime: Date;
  durationMinutes: number;
  agenda?: string;
}

// Cache token to avoid unnecessary requests
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get Zoom access token using Server-to-Server OAuth
 */
async function getZoomAccessToken(): Promise<string> {
  if (!ENV.zoom.isConfigured()) {
    throw new Error("Zoom credentials not configured");
  }

  const { accountId, clientId, clientSecret } = ENV.zoom;

  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  console.log("[Zoom] Getting access token with configured credentials...");

  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `grant_type=account_credentials&account_id=${accountId}`,
  });

  const responseText = await response.text();
  console.log("[Zoom] Token response status:", response.status);

  if (!response.ok) {
    console.error("[Zoom] Token error:", responseText);
    throw new Error(`Failed to get Zoom access token: ${response.status} - ${responseText}`);
  }

  // Parse the response
  const data: ZoomTokenResponse = JSON.parse(responseText);

  // Cache the token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Create a Zoom meeting
 */
export async function createZoomMeeting(params: CreateMeetingParams): Promise<{
  meetingId: string;
  joinUrl: string;
  startUrl: string;
  password: string;
}> {
  const token = await getZoomAccessToken();

  // Format start time in ISO 8601 format
  const startTime = params.startTime.toISOString();

  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: params.topic,
      type: 2, // Scheduled meeting
      start_time: startTime,
      duration: params.durationMinutes,
      timezone: "America/Sao_Paulo",
      agenda: params.agenda || "",
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        waiting_room: true,
        audio: "both",
        auto_recording: "none",
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Zoom] Create meeting error:", error);
    throw new Error(`Failed to create Zoom meeting: ${response.status}`);
  }

  const meeting: ZoomMeetingResponse = await response.json();

  return {
    meetingId: String(meeting.id),
    joinUrl: meeting.join_url,
    startUrl: meeting.start_url,
    password: meeting.password,
  };
}

/**
 * Check if Zoom is configured
 */
export function isZoomConfigured(): boolean {
  return ENV.zoom.isConfigured();
}
