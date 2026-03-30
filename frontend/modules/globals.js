// ═══════════════════════════════════════════════════════════
// SHARED STATE & CONSTANTS
// ═══════════════════════════════════════════════════════════
let timetableData      = [];
let notificationsData  = [];
let clashesData        = [];
let activeClashKey     = null;

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const API       = '/api';

const SCHEDULE_DOT_COLORS = ['green', 'blue', 'amber', 'red', 'teal', 'purple'];
const SLOT_COLORS = ['blue', 'green', 'amber', 'red', 'teal', 'purple'];
const SLOT_BORDER = { blue: '#2b7fff', green: '#00a63e', amber: '#f59e0b', red: '#e7000b', teal: '#06b6d4', purple: '#8b5cf6' };
const SLOT_BG     = { blue: 'rgba(59,130,246,0.08)', green: 'rgba(0,166,62,0.08)', amber: 'rgba(245,158,11,0.08)', red: 'rgba(231,0,11,0.08)', teal: 'rgba(6,182,212,0.08)', purple: 'rgba(139,92,246,0.08)' };

// ── Utilities ───────────────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)    return diff + 's ago';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}
