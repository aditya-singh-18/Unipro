import { getTrackerPolicySettingsService } from './trackerPolicy.service.js';
import { createTimelineEvent } from '../repositories/tracker.repo.js';
import {
  getEscalationDetail,
  getEscalationTimeline,
} from '../repositories/escalationFollowUp.repo.js';

const STATES = ['open', 'acknowledged', 'in_follow_up', 'resolved', 'deferred'];

const ALLOWED_TRANSITIONS = {
  open: ['acknowledged', 'in_follow_up', 'deferred'],
  acknowledged: ['in_follow_up', 'resolved', 'deferred'],
  in_follow_up: ['resolved', 'deferred', 'acknowledged'],
  resolved: ['in_follow_up'],
  deferred: ['in_follow_up', 'acknowledged'],
};

const resolveCurrentState = (timelineRows) => {
  for (let index = timelineRows.length - 1; index >= 0; index -= 1) {
    const row = timelineRows[index];
    if (row.event_type === 'admin_escalation_state_changed') {
      return row.meta?.to_state || 'open';
    }
    if (row.event_type === 'admin_escalation_acknowledged') {
      return 'acknowledged';
    }
  }
  return 'open';
};

export const getEscalationDetailService = async (escalationId) => {
  const weekId = Number(escalationId);
  if (!weekId) throw new Error('Invalid escalation id');

  const policy = await getTrackerPolicySettingsService();
  const detail = await getEscalationDetail({
    weekId,
    pendingOverdueHours: policy.escalation_pending_overdue_hours,
    reviewOverdueHours: policy.escalation_review_overdue_hours,
    criticalOverdueHours: policy.escalation_critical_overdue_hours,
  });

  if (!detail) return null;

  const timelineRows = await getEscalationTimeline({
    projectId: detail.project_id,
    weekId: detail.week_id,
  });

  const currentState = resolveCurrentState(timelineRows);

  return {
    escalationId: String(detail.week_id),
    currentState,
    detail,
    timeline: timelineRows.map((row) => ({
      timelineId: row.timeline_id,
      eventType: row.event_type,
      actorUserKey: row.actor_user_key,
      actorRole: row.actor_role,
      meta: row.meta || {},
      createdAt: row.created_at,
    })),
  };
};

export const updateEscalationFollowUpService = async (escalationId, payload, updatedBy) => {
  const weekId = Number(escalationId);
  if (!weekId) throw new Error('Invalid escalation id');

  const nextState = String(payload?.resolutionState || '').toLowerCase();
  if (!STATES.includes(nextState)) {
    throw new Error('resolutionState must be one of open, acknowledged, in_follow_up, resolved, deferred');
  }

  const detail = await getEscalationDetailService(weekId);
  if (!detail) throw new Error('Escalation not found');

  const allowed = ALLOWED_TRANSITIONS[detail.currentState] || [];
  if (!allowed.includes(nextState)) {
    throw new Error(`Invalid state transition from ${detail.currentState} to ${nextState}`);
  }

  await createTimelineEvent({
    projectId: detail.detail.project_id,
    weekId: detail.detail.week_id,
    eventType: 'admin_escalation_state_changed',
    actorUserKey: updatedBy,
    actorRole: 'ADMIN',
    meta: {
      from_state: detail.currentState,
      to_state: nextState,
      resolution_notes: payload?.resolutionNotes || null,
    },
  });

  if (payload?.resolutionNotes) {
    await createTimelineEvent({
      projectId: detail.detail.project_id,
      weekId: detail.detail.week_id,
      eventType: 'admin_follow_up_note_added',
      actorUserKey: updatedBy,
      actorRole: 'ADMIN',
      meta: {
        note: payload.resolutionNotes,
        tagged_state: nextState,
      },
    });
  }

  return getEscalationDetailService(weekId);
};
