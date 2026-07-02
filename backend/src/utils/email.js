const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

const ses = new SESClient({ region: process.env.AWS_REGION || 'af-south-1' });
const FROM = process.env.SES_FROM_EMAIL;

async function sendEmail({ to, subject, html, text }) {
  const command = new SendEmailCommand({
    Source: FROM,
    Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: { Data: text || html.replace(/<[^>]+>/g, ''), Charset: 'UTF-8' },
      },
    },
  });
  return ses.send(command);
}

function travelRequestStatusEmail(employee, request, status, reason) {
  const statusLabels = {
    manager_approved: 'approved by your line manager',
    travel_approved:  'approved by the Travel Coordinator',
    finance_approved: 'approved by Finance',
    booked:           'booked — your travel arrangements are confirmed',
    rejected:         'rejected',
    cancelled:        'cancelled',
  };
  const label = statusLabels[status] || status;
  return sendEmail({
    to: employee.email,
    subject: `Travel Request ${request.request_number} Update`,
    html: `
      <h2>Travel Request Update</h2>
      <p>Dear ${employee.first_name},</p>
      <p>Your travel request <strong>${request.request_number}</strong> to <strong>${request.destination_city}, ${request.destination_country}</strong>
         (${request.departure_date} – ${request.return_date}) has been <strong>${label}</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please log in to the Travel Portal to view the full details.</p>
      <p>This is an automated message from the Corporate Travel System.</p>
    `,
  });
}

function approvalRequestEmail(approver, request, employee) {
  return sendEmail({
    to: approver.email,
    subject: `Action Required: Travel Request ${request.request_number}`,
    html: `
      <h2>Travel Request Pending Your Approval</h2>
      <p>Dear ${approver.first_name},</p>
      <p>A travel request from <strong>${employee.first_name} ${employee.last_name}</strong> requires your approval.</p>
      <table border="1" cellpadding="8" style="border-collapse:collapse">
        <tr><td><strong>Request #</strong></td><td>${request.request_number}</td></tr>
        <tr><td><strong>Destination</strong></td><td>${request.destination_city}, ${request.destination_country}</td></tr>
        <tr><td><strong>Travel Dates</strong></td><td>${request.departure_date} – ${request.return_date}</td></tr>
        <tr><td><strong>Purpose</strong></td><td>${request.purpose}</td></tr>
        <tr><td><strong>Estimated Cost</strong></td><td>R ${request.estimated_cost_zar || 'TBC'}</td></tr>
      </table>
      <p>Please log in to the Travel Portal to approve or reject this request.</p>
      <p>This is an automated message from the Corporate Travel System.</p>
    `,
  });
}

function expenseClaimStatusEmail(employee, claim, status, reason) {
  return sendEmail({
    to: employee.email,
    subject: `Expense Claim ${claim.claim_number} ${status === 'approved' ? 'Approved' : status === 'paid' ? 'Paid' : 'Rejected'}`,
    html: `
      <h2>Expense Claim Update</h2>
      <p>Dear ${employee.first_name},</p>
      <p>Your expense claim <strong>${claim.claim_number}</strong> (R ${claim.total_zar}) has been <strong>${status}</strong>.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>Please log in to the Travel Portal to view the full details.</p>
      <p>This is an automated message from the Corporate Travel System.</p>
    `,
  });
}

function documentExpiryAlertEmail(employee, doc, daysUntilExpiry) {
  return sendEmail({
    to: employee.email,
    subject: `Travel Document Expiry Alert: ${doc.document_type} expiring in ${daysUntilExpiry} days`,
    html: `
      <h2>Travel Document Expiry Reminder</h2>
      <p>Dear ${employee.first_name},</p>
      <p>Your <strong>${doc.document_type}</strong> (${doc.document_number}) expires in <strong>${daysUntilExpiry} days</strong> on ${doc.expiry_date}.</p>
      <p>Please arrange renewal and update the Travel Portal with your new document details.</p>
      <p>This is an automated message from the Corporate Travel System.</p>
    `,
  });
}

module.exports = { sendEmail, travelRequestStatusEmail, approvalRequestEmail, expenseClaimStatusEmail, documentExpiryAlertEmail };
