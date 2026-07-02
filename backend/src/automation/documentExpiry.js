const db = require('../db/pool');
const { sendEmail, documentExpiryAlertEmail } = require('../utils/email');

const COORDINATOR_EMAIL = process.env.COORDINATOR_EMAIL || process.env.SES_FROM_EMAIL;

async function getExpiringDocuments() {
  const { rows } = await db.query(`
    SELECT
      td.*,
      e.first_name,
      e.last_name,
      e.email       AS employee_email,
      e.department_name,
      EXTRACT(DAY FROM (td.expiry_date - NOW()))::int AS days_until_expiry
    FROM travel_documents td
    JOIN employees e ON td.employee_id = e.id
    WHERE td.expiry_date <= NOW() + INTERVAL '90 days'
      AND td.expiry_date > NOW()
      AND td.status = 'active'
    ORDER BY td.expiry_date ASC
  `);
  return rows;
}

function classifyUrgency(daysUntilExpiry) {
  if (daysUntilExpiry < 30) return 'critical';
  if (daysUntilExpiry < 60) return 'warning';
  return 'notice';
}

function buildCoordinatorSummaryEmail(grouped) {
  const sections = ['critical', 'warning', 'notice'].map((level) => {
    const docs = grouped[level];
    if (!docs || !docs.length) return '';

    const label = level === 'critical' ? 'CRITICAL (< 30 days)'
                : level === 'warning'  ? 'WARNING (30–59 days)'
                :                        'NOTICE (60–89 days)';

    const rows = docs.map((d) => `
      <tr>
        <td>${d.first_name} ${d.last_name}</td>
        <td>${d.employee_email}</td>
        <td>${d.department_name || '—'}</td>
        <td>${d.document_type}</td>
        <td>${d.document_number}</td>
        <td>${d.expiry_date instanceof Date ? d.expiry_date.toISOString().split('T')[0] : d.expiry_date}</td>
        <td><strong>${d.days_until_expiry}</strong></td>
      </tr>
    `).join('');

    return `
      <h3 style="color:${level === 'critical' ? '#c00' : level === 'warning' ? '#e67e00' : '#555'}">${label}</h3>
      <table border="1" cellpadding="6" style="border-collapse:collapse;width:100%;font-size:13px">
        <thead>
          <tr style="background:#f0f0f0">
            <th>Employee</th><th>Email</th><th>Department</th>
            <th>Document Type</th><th>Document #</th><th>Expiry Date</th><th>Days Left</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }).join('');

  const total = Object.values(grouped).flat().length;

  return `
    <h2>Travel Document Expiry Summary</h2>
    <p>The following <strong>${total}</strong> travel document(s) are expiring within the next 90 days.</p>
    ${sections}
    <p style="color:#888;font-size:12px">This is an automated message from the Corporate Travel System.</p>
  `;
}

exports.handler = async () => {
  console.log('[documentExpiry] Starting document expiry check');

  let docs;
  try {
    docs = await getExpiringDocuments();
  } catch (err) {
    console.error('[documentExpiry] Failed to query expiring documents:', err);
    throw err;
  }

  console.log(`[documentExpiry] Found ${docs.length} expiring document(s)`);

  if (!docs.length) {
    console.log('[documentExpiry] No expiring documents — nothing to do');
    return { statusCode: 200, message: 'No expiring documents' };
  }

  // Group by urgency
  const grouped = { critical: [], warning: [], notice: [] };
  for (const doc of docs) {
    const urgency = classifyUrgency(doc.days_until_expiry);
    grouped[urgency].push(doc);
  }

  console.log(
    `[documentExpiry] critical=${grouped.critical.length} warning=${grouped.warning.length} notice=${grouped.notice.length}`
  );

  // Send per-employee emails (errors are logged but do not abort the run)
  const emailResults = await Promise.allSettled(
    docs.map((doc) =>
      documentExpiryAlertEmail(
        { first_name: doc.first_name, email: doc.employee_email },
        {
          document_type:   doc.document_type,
          document_number: doc.document_number,
          expiry_date:     doc.expiry_date instanceof Date
            ? doc.expiry_date.toISOString().split('T')[0]
            : doc.expiry_date,
        },
        doc.days_until_expiry
      )
    )
  );

  let emailsSent = 0;
  let emailsFailed = 0;
  for (const result of emailResults) {
    if (result.status === 'fulfilled') {
      emailsSent++;
    } else {
      emailsFailed++;
      console.error('[documentExpiry] Failed to send employee email:', result.reason);
    }
  }

  // Send coordinator summary
  try {
    const summaryHtml = buildCoordinatorSummaryEmail(grouped);
    await sendEmail({
      to: COORDINATOR_EMAIL,
      subject: `[Travel System] Document Expiry Summary — ${docs.length} document(s) expiring within 90 days`,
      html: summaryHtml,
    });
    console.log('[documentExpiry] Coordinator summary email sent');
  } catch (err) {
    console.error('[documentExpiry] Failed to send coordinator summary email:', err);
  }

  const summary = {
    total_expiring:  docs.length,
    critical:        grouped.critical.length,
    warning:         grouped.warning.length,
    notice:          grouped.notice.length,
    emails_sent:     emailsSent,
    emails_failed:   emailsFailed,
  };

  console.log('[documentExpiry] Complete:', JSON.stringify(summary));
  return { statusCode: 200, ...summary };
};
