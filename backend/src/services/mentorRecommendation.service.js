import { findProjectById } from '../repositories/project.repo.js';
import {
  getLatestMentorRecommendations,
  insertMentorRecommendations,
} from '../repositories/mentorAssignment.repo.js';
import { getAdminSystemSettingsService } from './systemSettings.service.js';
import { getActiveMentorsService } from './mentor.service.js';

const SCORE_WEIGHTS = {
  track: 35,
  tech: 35,
  proficiency: 15,
  workload: 10,
  fairness: 5,
};

const PROFICIENCY_SCORES = {
  EXPERT: 15,
  ADVANCED: 12,
  INTERMEDIATE: 8,
  BEGINNER: 4,
};

const normalizeValue = (value) => String(value || '').trim().toLowerCase();

const normalizeTrack = (track) => normalizeValue(track).replace(/\s+/g, '_');

const normalizeTech = (tech) =>
  normalizeValue(tech)
    .replace(/\s+/g, ' ')
    .replace(/\s*\([^)]*\)/g, '')
    .trim();

const getFairnessScore = (lastAssignedAt) => {
  if (!lastAssignedAt) {
    return SCORE_WEIGHTS.fairness;
  }

  const assignedAt = new Date(lastAssignedAt).getTime();
  if (!Number.isFinite(assignedAt)) {
    return 0;
  }

  const daysSince = (Date.now() - assignedAt) / (1000 * 60 * 60 * 24);

  if (daysSince >= 14) return 5;
  if (daysSince >= 7) return 4;
  if (daysSince >= 3) return 2;
  return 0;
};

const getTrackScore = ({ projectTrack, mentorPrimaryTrack, mentorSecondaryTracks, mentorSkills }) => {
  if (mentorPrimaryTrack === projectTrack) {
    return {
      score: SCORE_WEIGHTS.track,
      reason: `Primary track matches ${projectTrack}`,
      matched: true,
    };
  }

  if (mentorSecondaryTracks.includes(projectTrack)) {
    return {
      score: 25,
      reason: `Secondary track matches ${projectTrack}`,
      matched: true,
    };
  }

  const skillTrackMatch = mentorSkills.some((skill) => normalizeTrack(skill.track) === projectTrack);
  if (skillTrackMatch) {
    return {
      score: 20,
      reason: `Skill history includes track ${projectTrack}`,
      matched: true,
    };
  }

  return {
    score: 0,
    reason: 'No direct track match',
    matched: false,
  };
};

const getTechScore = ({ projectTechSet, mentorSkills }) => {
  if (!projectTechSet.size) {
    return {
      score: 0,
      matches: [],
      matched: false,
      bestProficiency: null,
    };
  }

  const matchedSkills = mentorSkills.filter((skill) => projectTechSet.has(normalizeTech(skill.tech_stack)));
  const uniqueMatches = Array.from(new Set(matchedSkills.map((skill) => skill.tech_stack)));
  const overlapRatio = uniqueMatches.length / projectTechSet.size;
  const bestProficiency = matchedSkills.reduce((best, skill) => {
    const current = PROFICIENCY_SCORES[String(skill.proficiency_level || '').toUpperCase()] || 0;
    return current > best ? current : best;
  }, 0);

  return {
    score: Number(Math.min(SCORE_WEIGHTS.tech, overlapRatio * SCORE_WEIGHTS.tech).toFixed(2)),
    matches: uniqueMatches,
    matched: uniqueMatches.length > 0,
    bestProficiency,
  };
};

const getProficiencyScore = ({ techMatch, mentorSkills, projectTrack }) => {
  if (techMatch.bestProficiency) {
    return techMatch.bestProficiency;
  }

  const trackSkill = mentorSkills
    .filter((skill) => normalizeTrack(skill.track) === projectTrack)
    .reduce((best, skill) => {
      const current = PROFICIENCY_SCORES[String(skill.proficiency_level || '').toUpperCase()] || 0;
      return current > best ? current : best;
    }, 0);

  return trackSkill;
};

const buildRecommendation = ({ mentor, project, settings }) => {
  const projectTrack = normalizeTrack(project.track);
  const projectTechSet = new Set(Array.isArray(project.tech_stack) ? project.tech_stack.map(normalizeTech).filter(Boolean) : []);
  const mentorPrimaryTrack = normalizeTrack(mentor.primary_track);
  const mentorSecondaryTracks = Array.isArray(mentor.secondary_tracks)
    ? mentor.secondary_tracks.map(normalizeTrack)
    : [];
  const mentorSkills = Array.isArray(mentor.skills) ? mentor.skills : [];
  const maxActiveProjects = Number(mentor.max_active_projects || settings.mentor_default_max_active_projects || 5);
  const assignedProjects = Number(mentor.assigned_projects || 0);

  if (!mentor.is_active || mentor.available_for_assignment === false) {
    return null;
  }

  if (assignedProjects >= maxActiveProjects) {
    return null;
  }

  const trackMatch = getTrackScore({
    projectTrack,
    mentorPrimaryTrack,
    mentorSecondaryTracks,
    mentorSkills,
  });
  const techMatch = getTechScore({ projectTechSet, mentorSkills });

  if (!trackMatch.matched && !techMatch.matched) {
    return null;
  }

  const proficiencyScore = getProficiencyScore({ techMatch, mentorSkills, projectTrack });
  const workloadScore = settings.mentor_load_balance_enabled
    ? Number(Math.max(0, ((maxActiveProjects - assignedProjects) / maxActiveProjects) * SCORE_WEIGHTS.workload).toFixed(2))
    : SCORE_WEIGHTS.workload;
  const fairnessScore = settings.mentor_load_balance_enabled ? getFairnessScore(mentor.last_assigned_at) : 0;
  const score = Number(
    (trackMatch.score + techMatch.score + proficiencyScore + workloadScore + fairnessScore).toFixed(2)
  );

  return {
    project_id: project.project_id,
    mentor_employee_id: mentor.employee_id,
    mentor_name: mentor.full_name,
    mentor_email: mentor.official_email,
    assigned_projects: assignedProjects,
    max_active_projects: maxActiveProjects,
    rank_position: 0,
    score,
    track_score: trackMatch.score,
    tech_score: techMatch.score,
    proficiency_score: proficiencyScore,
    workload_score: workloadScore,
    fairness_score: fairnessScore,
    reason_json: {
      trackMatch: trackMatch.reason,
      techMatches: techMatch.matches,
      proficiencyScore,
      currentLoad: assignedProjects,
      maxActiveProjects,
      fairnessNote: settings.mentor_load_balance_enabled
        ? mentor.last_assigned_at
          ? `Last assigned at ${mentor.last_assigned_at}`
          : 'No previous assignment history'
        : 'Load balancing disabled',
    },
  };
};

export const recommendMentorsForProjectService = async ({ projectId, persist = true, topN }) => {
  if (!projectId) {
    throw new Error('projectId is required');
  }

  const [project, mentors, settings] = await Promise.all([
    findProjectById(projectId),
    getActiveMentorsService(),
    getAdminSystemSettingsService(),
  ]);

  if (!project) {
    throw new Error('Project not found');
  }

  const recommendations = mentors
    .map((mentor) => buildRecommendation({ mentor, project, settings }))
    .filter(Boolean)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      if (left.assigned_projects !== right.assigned_projects) return left.assigned_projects - right.assigned_projects;
      return String(left.mentor_name || '').localeCompare(String(right.mentor_name || ''));
    })
    .slice(0, topN || settings.mentor_recommendation_top_n)
    .map((recommendation, index) => ({
      ...recommendation,
      rank_position: index + 1,
    }));

  if (persist && recommendations.length) {
    const batchKey = `${projectId}-${Date.now()}`;
    await insertMentorRecommendations({
      projectId,
      batchKey,
      recommendations,
      scoringVersion: 'v1',
    });
  }

  return {
    project: {
      project_id: project.project_id,
      title: project.title,
      track: project.track,
      tech_stack: Array.isArray(project.tech_stack) ? project.tech_stack : [],
      status: project.status,
      mentor_employee_id: project.mentor_employee_id || null,
    },
    recommendation_count: recommendations.length,
    recommendations,
  };
};

export const getMentorRecommendationsForProjectService = async ({ projectId, refresh = false, limit }) => {
  if (refresh) {
    return recommendMentorsForProjectService({ projectId, persist: true, topN: limit });
  }

  const stored = await getLatestMentorRecommendations({ projectId, limit: limit || 10 });
  if (stored.length) {
    const project = await findProjectById(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    return {
      project: {
        project_id: project.project_id,
        title: project.title,
        track: project.track,
        tech_stack: Array.isArray(project.tech_stack) ? project.tech_stack : [],
        status: project.status,
        mentor_employee_id: project.mentor_employee_id || null,
      },
      recommendation_count: stored.length,
      recommendations: stored,
    };
  }

  return recommendMentorsForProjectService({ projectId, persist: true, topN: limit });
};