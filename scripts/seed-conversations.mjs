import mysql2 from 'mysql2/promise';

const conn = await mysql2.createConnection(process.env.DATABASE_URL);

// Clear existing sample data
await conn.execute('DELETE FROM conversation_messages WHERE conversationId >= 30001');
await conn.execute('DELETE FROM conversations WHERE id >= 30001');

// Insert 6 realistic conversations
const convs = [
  [30001, 1, 90008, 'sms', 'John Moreno', '+13055551234', 'john.moreno@email.com', 2, 'Sounds good, I can do Thursday at 2pm', 0, 1, 0, 3, 'active', 'New Lead SMS Nurture', 'sms', 'Tim Haskins', JSON.stringify(['Hot Lead']), 3],
  [30002, 1, 90007, 'email', 'Thailer Somerville', '+13055559876', 'thailer@somerville.com', 5, 'Thank you for sending over the pre-approval docs', 1, 0, 0, 0, 'completed', 'Email Drip Sequence', 'email', 'Tim Haskins', JSON.stringify(['Qualified']), 7],
  [30003, 1, null, 'sms', 'Marcus Williams', '+17025553344', 'marcus.w@gmail.com', 24, 'Can you send me more info about the DSCR loan?', 0, 0, 0, 1, 'active', 'DSCR Investor Drip', 'sms,email', null, JSON.stringify([]), 5],
  [30004, 1, null, 'email', 'Sandra Kim', '+14155557788', 'sandra.kim@realty.com', 48, 'I have a client who needs a jumbo loan — can we connect?', 1, 1, 0, 0, 'none', null, 'email', 'Tim Haskins', JSON.stringify(['Referral Partner']), 10],
  [30005, 1, null, 'sms', 'Derek Patel', '+16025554455', 'derek.patel@outlook.com', 72, 'Missed call from Tim Haskins', 0, 0, 0, 2, 'paused', 'Follow-Up SMS Sequence', 'sms', null, JSON.stringify(['Follow Up']), 8],
  [30006, 1, null, 'email', 'Lisa Chen', '+19495556677', 'lisa.chen@homesearch.com', 96, 'Your rate quote looks competitive. Let me review with my husband.', 1, 0, 0, 0, 'none', null, 'email,sms', 'Tim Haskins', JSON.stringify(['Nurture']), 12],
];

for (const [id, agencyId, leadId, channel, contactName, contactPhone, contactEmail, hoursAgo, lastPreview, isRead, isStarred, isArchived, unreadCount, workflowStatus, workflowName, channelSummary, assignedToName, tags, daysAgo] of convs) {
  await conn.execute(
    `INSERT INTO conversations (id, agencyId, leadId, channel, contactName, contactPhone, contactEmail, lastMessageAt, lastMessagePreview, isRead, isStarred, isArchived, unreadCount, workflowStatus, workflowName, channelSummary, assignedToName, tags, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? HOUR), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), NOW())`,
    [id, agencyId, leadId, channel, contactName, contactPhone, contactEmail, hoursAgo, lastPreview, isRead, isStarred, isArchived, unreadCount, workflowStatus, workflowName, channelSummary, assignedToName, tags, daysAgo]
  );
}
console.log('✅ Conversations inserted');

// Seed messages for John Moreno (conv 30001) - SMS thread with workflow events
const johnMessages = [
  [30001, 1, 'system', null, 'Conversation started', null, 'System', null, 72],
  [30001, 1, 'workflow', null, 'Added to SMS nurture process: New Lead SMS Nurture', null, 'System', JSON.stringify({processName:'New Lead SMS Nurture', status:'active'}), 71],
  [30001, 1, 'sms_out', null, 'Hi John! This is Tim Haskins from Premier Mortgage. I saw you were interested in a home loan — I\'d love to help. Are you available for a quick call this week?', null, 'Tim Haskins', null, 70],
  [30001, 1, 'sms_in', null, 'Hey Tim, yes I\'m interested. I\'m looking to buy a home around $450k. What rates are you seeing right now?', null, 'John Moreno', null, 69],
  [30001, 1, 'sms_out', null, 'Great question John! Rates are very competitive right now — we\'re seeing 30-year fixed around 6.75% for well-qualified buyers. Your credit score and down payment will affect the exact rate. Can I run a quick pre-qual for you?', null, 'Tim Haskins', null, 48],
  [30001, 1, 'workflow', null, 'Email step 2 sent: Rate Quote Follow-up', null, 'System', JSON.stringify({processName:'New Lead SMS Nurture', stepName:'Email step 2', status:'active'}), 47],
  [30001, 1, 'sms_in', null, 'Sure, what do you need from me?', null, 'John Moreno', null, 46],
  [30001, 1, 'sms_out', null, 'Just need your full name, date of birth, and last 4 of SSN to do a soft pull — won\'t affect your credit. Or I can send a secure link if you prefer.', null, 'Tim Haskins', null, 24],
  [30001, 1, 'call', null, 'Outbound call — No Answer (2 min)', null, 'Tim Haskins', JSON.stringify({duration:'2:00', outcome:'no_answer', direction:'outbound'}), 23],
  [30001, 1, 'sms_out', null, 'Hey John, just tried calling you. No worries — whenever you\'re ready, I can send that secure link to your email. What works best for you?', null, 'Tim Haskins', null, 22],
  [30001, 1, 'sms_in', null, 'Sorry I missed you! Send the link to john.moreno@email.com', null, 'John Moreno', null, 6],
  [30001, 1, 'sms_in', null, 'Also — can we schedule a call? I\'m free Thursday afternoon', null, 'John Moreno', null, 5],
  [30001, 1, 'sms_in', null, 'Sounds good, I can do Thursday at 2pm', null, 'John Moreno', null, 2],
];

// Seed messages for Thailer Somerville (conv 30002) - Email thread
const thailerMessages = [
  [30002, 1, 'system', null, 'Conversation started', null, 'System', null, 168],
  [30002, 1, 'workflow', null, 'Added to email drip sequence: Email Drip Sequence', null, 'System', JSON.stringify({processName:'Email Drip Sequence', status:'active'}), 167],
  [30002, 1, 'email_out', 'Welcome to Premier Mortgage — Your Pre-Approval Journey Starts Here', 'Hi Thailer,\n\nThank you for reaching out about a home loan! I\'m Tim Haskins, your dedicated loan officer at Premier Mortgage Resources.\n\nI\'d love to get you pre-approved so you can shop with confidence. I\'ve attached a quick checklist of documents we\'ll need to get started.\n\nLet me know if you have any questions!\n\nBest,\nTim Haskins\nNMLS #1116876', null, 'Tim Haskins', null, 166],
  [30002, 1, 'email_in', 'RE: Welcome to Premier Mortgage — Your Pre-Approval Journey Starts Here', 'Hi Tim,\n\nThanks for reaching out! I\'ve been looking at homes in the $380k-$420k range. I have about 10% for a down payment. My credit score is around 720.\n\nI\'ll gather those documents this week.\n\nThailer', null, 'Thailer Somerville', null, 160],
  [30002, 1, 'workflow', null, 'Email step 2 sent: Pre-Approval Document Request', null, 'System', JSON.stringify({processName:'Email Drip Sequence', stepName:'Email step 2', status:'active'}), 144],
  [30002, 1, 'email_out', 'Your Pre-Approval Documents — Secure Upload Link', 'Hi Thailer,\n\nGreat news — with a 720 credit score and 10% down, you\'re in excellent shape for a conventional loan!\n\nHere\'s your secure document upload link: [secure link]\n\nDocuments needed:\n• Last 2 years W-2s\n• Last 2 pay stubs\n• Last 2 months bank statements\n• Photo ID\n\nLet me know if you have any questions!\n\nTim', null, 'Tim Haskins', null, 120],
  [30002, 1, 'call', null, 'Inbound call — Completed (12 min)', null, 'Thailer Somerville', JSON.stringify({duration:'12:14', outcome:'completed', direction:'inbound'}), 96],
  [30002, 1, 'note', null, 'Call notes: Thailer confirmed documents uploaded. Discussed rate lock options. Very motivated buyer, targeting close by end of next month. Follow up Friday.', null, 'Tim Haskins', null, 95],
  [30002, 1, 'workflow', null, 'Process completed: Email Drip Sequence', null, 'System', JSON.stringify({processName:'Email Drip Sequence', status:'completed'}), 72],
  [30002, 1, 'email_in', 'RE: Your Pre-Approval Documents', 'Thank you for sending over the pre-approval docs', null, 'Thailer Somerville', null, 5],
];

// Seed messages for Marcus Williams (conv 30003) - SMS + workflow
const marcusMessages = [
  [30003, 1, 'system', null, 'Conversation started via Facebook Lead Ad', null, 'System', null, 120],
  [30003, 1, 'workflow', null, 'Added to DSCR Investor Drip sequence', null, 'System', JSON.stringify({processName:'DSCR Investor Drip', status:'active'}), 119],
  [30003, 1, 'sms_out', null, 'Hi Marcus! This is Tim from Premier Mortgage. I saw you\'re interested in investment property financing. Are you looking at DSCR loans for rental properties?', null, 'Tim Haskins', null, 118],
  [30003, 1, 'sms_in', null, 'Yes! I have 2 rentals already and looking to buy a 3rd. Heard DSCR is easier to qualify for?', null, 'Marcus Williams', null, 100],
  [30003, 1, 'sms_out', null, 'Exactly right! DSCR loans qualify based on the property\'s rental income, not your personal income. Great for investors with multiple properties. What\'s the target purchase price?', null, 'Tim Haskins', null, 99],
  [30003, 1, 'workflow', null, 'Email step 1 sent: DSCR Loan Overview', null, 'System', JSON.stringify({processName:'DSCR Investor Drip', stepName:'Email step 1', status:'active'}), 72],
  [30003, 1, 'sms_in', null, 'Can you send me more info about the DSCR loan?', null, 'Marcus Williams', null, 24],
];

// Seed messages for Derek Patel (conv 30005) - missed calls + paused workflow
const derekMessages = [
  [30005, 1, 'system', null, 'Conversation started', null, 'System', null, 192],
  [30005, 1, 'workflow', null, 'Added to Follow-Up SMS Sequence', null, 'System', JSON.stringify({processName:'Follow-Up SMS Sequence', status:'active'}), 191],
  [30005, 1, 'sms_out', null, 'Hi Derek, this is Tim Haskins from Premier Mortgage. I\'d love to help you with your home financing. Are you still looking?', null, 'Tim Haskins', null, 190],
  [30005, 1, 'call', null, 'Outbound call — No Answer (1 min)', null, 'Tim Haskins', JSON.stringify({duration:'1:00', outcome:'no_answer', direction:'outbound'}), 168],
  [30005, 1, 'call', null, 'Outbound call — No Answer (1 min)', null, 'Tim Haskins', JSON.stringify({duration:'1:00', outcome:'no_answer', direction:'outbound'}), 144],
  [30005, 1, 'workflow', null, 'SMS follow-up paused — contact unresponsive after 2 attempts', null, 'System', JSON.stringify({processName:'Follow-Up SMS Sequence', status:'paused'}), 120],
  [30005, 1, 'sms_out', null, 'Hey Derek — no pressure at all. Just wanted to check in one more time. If you\'re ready to explore your options, I\'m here. Reply STOP to opt out.', null, 'Tim Haskins', null, 72],
  [30005, 1, 'call', null, 'Missed call from Tim Haskins', null, 'Tim Haskins', JSON.stringify({duration:'0:00', outcome:'no_answer', direction:'outbound'}), 72],
];

const allMessages = [
  ...johnMessages.map(m => [...m]),
  ...thailerMessages.map(m => [...m]),
  ...marcusMessages.map(m => [...m]),
  ...derekMessages.map(m => [...m]),
];

for (const [convId, agencyId, type, subject, content, mediaUrls, actor, metadata, hoursAgo] of allMessages) {
  await conn.execute(
    `INSERT INTO conversation_messages (conversationId, agencyId, type, subject, content, mediaUrls, actor, metadata, direction, status, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'sent', DATE_SUB(NOW(), INTERVAL ? HOUR))`,
    [convId, agencyId, type, subject, content, mediaUrls, actor, metadata,
     type === 'sms_in' || type === 'email_in' ? 'inbound' : 'outbound',
     hoursAgo]
  );
}
console.log('✅ Messages inserted:', allMessages.length);

await conn.end();
console.log('✅ Seed complete');
