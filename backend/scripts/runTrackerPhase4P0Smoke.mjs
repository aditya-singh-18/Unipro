import {
  getMentorEffectivenessGridService,
  getMentorEffectivenessDetailService,
  exportMentorEffectivenessServiceCSV,
  exportMentorEffectivenessServiceJSON,
} from '../src/services/mentorEffectiveness.service.js';

let pass = 0;
let fail = 0;

const ok = (label, detail = '') => {
  console.log(`[PASS] ${label}${detail ? ` - ${detail}` : ''}`);
  pass += 1;
};

const bad = (label, detail = '') => {
  console.error(`[FAIL] ${label}${detail ? ` - ${detail}` : ''}`);
  fail += 1;
};

try {
  const gridData = await getMentorEffectivenessGridService();
  ok('Mentor effectiveness grid loads');

  if (gridData.summary && typeof gridData.summary.totalMentors === 'number') {
    ok('Summary contains totalMentors', `count=${gridData.summary.totalMentors}`);
  } else {
    bad('Summary missing totalMentors');
  }

  if (
    typeof gridData.summary.healthyCount === 'number' &&
    typeof gridData.summary.warningCount === 'number' &&
    typeof gridData.summary.criticalCount === 'number'
  ) {
    const totalBands = gridData.summary.healthyCount + gridData.summary.warningCount + gridData.summary.criticalCount;
    if (totalBands === gridData.summary.totalMentors) {
      ok('Workload band counts sum to total mentors', `healthy=${gridData.summary.healthyCount}, warning=${gridData.summary.warningCount}, critical=${gridData.summary.criticalCount}`);
    } else {
      bad('Workload band counts do not sum correctly', `bands=${totalBands}, total=${gridData.summary.totalMentors}`);
    }
  } else {
    bad('Summary missing workload band counts');
  }

  if (Array.isArray(gridData.items)) {
    ok('Grid items is array');

    if (gridData.items.length > 0) {
      const firstItem = gridData.items[0];

      if (firstItem.mentorId && firstItem.mentorName && typeof firstItem.reviewCount === 'number') {
        ok('Item has required fields', `id=${firstItem.mentorId}, name=${firstItem.mentorName}, reviews=${firstItem.reviewCount}`);
      } else {
        bad('Item missing required fields', `id=${firstItem?.mentorId}, name=${firstItem?.mentorName}, reviews=${firstItem?.reviewCount}`);
      }

      if (['healthy', 'warning', 'critical'].includes(firstItem.workloadBand)) {
        ok('Item workloadBand is valid enum value', `band=${firstItem.workloadBand}`);
      } else {
        bad('Item workloadBand invalid enum value', `band=${firstItem.workloadBand}`);
      }

      if (typeof firstItem.avgTurnaroundFormatted === 'string' && firstItem.avgTurnaroundFormatted.length > 0) {
        ok('Item turnaround is formatted', `formatted=${firstItem.avgTurnaroundFormatted}`);
      } else {
        bad('Item turnaround not formatted');
      }

      if (typeof firstItem.richFeedbackRatioPercent === 'number' && firstItem.richFeedbackRatioPercent >= 0 && firstItem.richFeedbackRatioPercent <= 100) {
        ok('Item richFeedbackRatio is valid percentage', `ratio=${firstItem.richFeedbackRatioPercent.toFixed(1)}%`);
      } else {
        bad('Item richFeedbackRatio invalid percentage', `ratio=${firstItem.richFeedbackRatioPercent}, type=${typeof firstItem.richFeedbackRatioPercent}`);
      }
    }
  } else {
    bad('Grid items is not array');
  }

  const csvData = await exportMentorEffectivenessServiceCSV();
  if (typeof csvData === 'string' && csvData.includes('Mentor Name')) {
    ok('CSV export generates valid CSV', `length=${csvData.length} chars`);
  } else {
    bad('CSV export invalid');
  }

  const jsonData = await exportMentorEffectivenessServiceJSON();
  if (jsonData.summary && jsonData.items) {
    ok('JSON export generates valid JSON', `mentors=${jsonData.items.length}`);
  } else {
    bad('JSON export invalid');
  }
} catch (error) {
  bad('Mentor effectiveness service executes', error.message);
}

console.log(`PASS=${pass} FAIL=${fail}`);
process.exit(fail > 0 ? 1 : 0);
