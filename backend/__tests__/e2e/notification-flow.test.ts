import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { SupabaseClient } from '@supabase/supabase-js';
import { createServiceClient, createTestUser } from './setup';

describe('Notification flow (E2E)', () => {
  let supabase: SupabaseClient;
  const createdUserIds: string[] = [];
  const createdNotificationIds: string[] = [];

  beforeAll(async () => {
    supabase = createServiceClient();

    const user = await createTestUser(supabase, { role: 'candidate' });
    createdUserIds.push(user.id);
  });

  afterAll(async () => {
    for (const id of createdNotificationIds.reverse()) {
      await supabase.from('notifications').delete().eq('id', id);
    }
    for (const id of createdUserIds.reverse()) {
      await supabase.from('users').delete().eq('id', id);
    }
  });

  it('inserts 3 notifications with different types', async () => {
    const userId = createdUserIds[0];

    const notifications = [
      {
        id: crypto.randomUUID(),
        user_id: userId,
        title: 'Welcome',
        message: 'Welcome to the platform!',
        type: 'info' as const,
        is_read: false,
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        title: 'Profile Complete',
        message: 'Your profile has been completed successfully.',
        type: 'success' as const,
        is_read: false,
      },
      {
        id: crypto.randomUUID(),
        user_id: userId,
        title: 'Document Missing',
        message: 'Please upload your resume.',
        type: 'warning' as const,
        is_read: false,
      },
    ];

    for (const notif of notifications) {
      const { data, error } = await supabase
        .from('notifications')
        .insert(notif)
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.id).toBe(notif.id);
      expect(data.is_read).toBe(false);

      createdNotificationIds.push(notif.id);
    }
  });

  it('queries notifications by user_id', async () => {
    const userId = createdUserIds[0];

    const { data: notifs, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    expect(error).toBeNull();
    expect(notifs).toBeDefined();
    expect(notifs!.length).toBe(3);
    expect(notifs![0].title).toBe('Welcome');
    expect(notifs![1].title).toBe('Profile Complete');
    expect(notifs![2].title).toBe('Document Missing');
  });

  it('counts unread notifications (should be 3)', async () => {
    const userId = createdUserIds[0];

    const { data: unread, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('is_read', false);

    expect(error).toBeNull();
    expect(unread!.length).toBe(3);
  });

  it('marks one notification as read', async () => {
    const notifId = createdNotificationIds[0];

    const { data: updated, error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', notifId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(updated.is_read).toBe(true);
    expect(updated.read_at).toBeDefined();
  });

  it('counts unread notifications (should be 2)', async () => {
    const userId = createdUserIds[0];

    const { data: unread, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('is_read', false);

    expect(error).toBeNull();
    expect(unread!.length).toBe(2);
  });

  it('marks all remaining as read', async () => {
    const userId = createdUserIds[0];

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('is_read', false);

    expect(error).toBeNull();
  });

  it('counts unread notifications (should be 0)', async () => {
    const userId = createdUserIds[0];

    const { data: unread, error } = await supabase
      .from('notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('is_read', false);

    expect(error).toBeNull();
    expect(unread!.length).toBe(0);
  });
});
