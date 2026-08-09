import { prisma } from '../lib/prisma';
import { createNotification } from '../routes/notifications';

/**
 * Meeting Reminder System
 *
 * Checks for upcoming meetings within the next 24 hours and fires
 * in-app notifications to the lead owner. Runs:
 *   - Once at server startup (after a 10s delay to let DB settle)
 *   - Every hour thereafter via setInterval
 *
 * Idempotency: stores last-notified meeting IDs in memory to avoid
 * duplicate notifications within the same server session.
 */

const notifiedMeetingIds = new Set<string>();

async function checkUpcomingMeetings() {
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcoming = await prisma.meeting.findMany({
      where: {
        scheduledAt: { gte: now, lte: in24h },
        completed: false,
      },
      include: {
        lead: { select: { id: true, name: true, ownerId: true } },
      },
    });

    for (const meeting of upcoming) {
      if (notifiedMeetingIds.has(meeting.id)) continue;
      if (!meeting.lead?.ownerId) continue;

      const scheduledAt = new Date(meeting.scheduledAt);
      const minsUntil = Math.round((scheduledAt.getTime() - now.getTime()) / 60000);
      const timeStr = scheduledAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      let message: string;
      if (minsUntil <= 60) {
        message = `📅 "${meeting.title}" with ${meeting.lead.name} starts in ${minsUntil} min (${timeStr})`;
      } else {
        const hrs = Math.round(minsUntil / 60);
        message = `📅 "${meeting.title}" with ${meeting.lead.name} is in ${hrs}h at ${timeStr}`;
      }

      await createNotification(
        meeting.lead.ownerId,
        'meeting_reminder',
        'Upcoming Meeting',
        message,
        meeting.lead.id,
      );

      notifiedMeetingIds.add(meeting.id);
      console.log(`[Meeting Reminder] Notified for meeting ${meeting.id} — ${meeting.title}`);
    }

    // Clean up old IDs (meetings more than 2 days old — won't re-fire anyway)
    if (notifiedMeetingIds.size > 500) {
      const arr = Array.from(notifiedMeetingIds);
      arr.slice(0, 200).forEach((id) => notifiedMeetingIds.delete(id));
    }
  } catch (err) {
    console.error('[Meeting Reminder] Error:', err);
  }
}

export function startMeetingReminderCron() {
  // Run 10 seconds after server start
  setTimeout(checkUpcomingMeetings, 10_000);

  // Then every hour
  const interval = setInterval(checkUpcomingMeetings, 60 * 60 * 1000);

  // Allow process to exit cleanly
  if (interval.unref) interval.unref();

  console.log('✅ Meeting reminder cron started (checks every hour)');
}
