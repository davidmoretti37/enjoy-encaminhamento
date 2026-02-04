// Google Calendar API Integration for Google Meet
// Docs: https://developers.google.com/calendar/api/guides/create-events

import { ENV } from "../_core/env";

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleCalendarEvent {
  id: string;
  htmlLink: string;
  hangoutLink: string;
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
    }>;
    conferenceId: string;
  };
}

interface CreateMeetingParams {
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail: string;
}

// Cache token
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get Google access token using Service Account
 * For simpler setup, we use OAuth 2.0 with refresh token
 */
async function getGoogleAccessToken(): Promise<string> {
  if (!ENV.google.isConfigured()) {
    throw new Error("Google credentials not configured");
  }

  const { clientId, clientSecret, refreshToken } = ENV.google;

  console.log("[Google] Using configured OAuth credentials");

  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 300000) {
    return cachedToken.token;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Google] Token error:", error);
    throw new Error(`Failed to get Google access token: ${response.status}`);
  }

  const data: GoogleTokenResponse = await response.json();

  // Cache the token
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

/**
 * Create a Google Calendar event with Google Meet link
 */
export async function createGoogleMeeting(params: CreateMeetingParams): Promise<{
  meetingId: string;
  meetingUrl: string;
  calendarEventUrl: string;
}> {
  const token = await getGoogleAccessToken();

  const event = {
    summary: params.summary,
    description: params.description || "",
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: "America/Sao_Paulo",
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: "America/Sao_Paulo",
    },
    attendees: [{ email: params.attendeeEmail }],
    conferenceData: {
      createRequest: {
        requestId: `meet-${Date.now()}`,
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 60 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error("[Google] Create event error:", error);
    throw new Error(`Failed to create Google Meet: ${response.status}`);
  }

  const calendarEvent: GoogleCalendarEvent = await response.json();

  // Get the Meet link from conference data
  const meetLink =
    calendarEvent.hangoutLink ||
    calendarEvent.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri;

  if (!meetLink) {
    throw new Error("Failed to get Google Meet link from calendar event");
  }

  return {
    meetingId: calendarEvent.conferenceData?.conferenceId || calendarEvent.id,
    meetingUrl: meetLink,
    calendarEventUrl: calendarEvent.htmlLink,
  };
}

/**
 * Check if Google Meet is configured
 */
export function isGoogleMeetConfigured(): boolean {
  return ENV.google.isConfigured();
}
