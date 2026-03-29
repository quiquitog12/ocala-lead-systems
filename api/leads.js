const NOTION_VERSION = '2025-09-03';
const NOTION_API_URL = 'https://api.notion.com/v1/pages';
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || '91614b14-c853-442b-9373-89e0634470ac';

function text(value) {
  return value ? [{ text: { content: String(value).slice(0, 1900) } }] : [];
}

function normalizeNiche(input) {
  const value = (input || '').toLowerCase();
  if (value.includes('roof')) return 'Roofer';
  if (value.includes('home care') || value.includes('senior')) return 'Home Care';
  if (value.includes('med spa')) return 'Med Spa';
  if (value.includes('clinic')) return 'Wellness';
  if (value.includes('hvac')) return 'HVAC';
  if (value.includes('plumb')) return 'Plumbing';
  if (value.includes('assisted')) return 'Assisted Living';
  return 'Other';
}

function calculateScore(lead) {
  let score = 45;
  if (lead.phone) score += 10;
  if (lead.email) score += 10;
  if (lead.notes && lead.notes.length > 20) score += 10;

  const niche = normalizeNiche(lead.niche);
  if (['Home Care', 'Roofer', 'HVAC', 'Plumbing', 'Assisted Living'].includes(niche)) score += 20;
  if ((lead.bottleneck || '').toLowerCase().includes('slow first response')) score += 10;
  if ((lead.bottleneck || '').toLowerCase().includes('crm')) score += 5;

  return Math.max(0, Math.min(score, 100));
}

function buildPayload(lead) {
  const normalizedNiche = normalizeNiche(lead.niche);
  const score = Number.isFinite(Number(lead.score)) ? Number(lead.score) : calculateScore(lead);
  const notes = [
    lead.notes ? `Current situation: ${lead.notes}` : '',
    lead.bottleneck ? `Biggest bottleneck: ${lead.bottleneck}` : '',
    lead.page ? `Source page: ${lead.page}` : ''
  ].filter(Boolean).join('\n\n');

  return {
    parent: { database_id: NOTION_DATABASE_ID },
    properties: {
      'Business Name': { title: text(lead.businessName || 'Unknown Business') },
      'Contact Name': { rich_text: text(lead.contactName) },
      Phone: { phone_number: lead.phone || null },
      Email: { email: lead.email || null },
      Website: { url: lead.website || null },
      Niche: { select: { name: normalizedNiche } },
      City: { rich_text: text(lead.city || 'Ocala') },
      Status: { status: { name: 'New' } },
      Priority: { select: { name: lead.priority || 'High' } },
      'Lead Score': { number: score },
      Source: { select: { name: lead.source || 'Website Form' } },
      Offer: { select: { name: lead.offer || 'Free Audit' } },
      Qualified: { checkbox: score >= 70 },
      'Audit Sent': { checkbox: false },
      'Appointment Booked': { checkbox: false },
      Notes: { rich_text: text(notes) }
    }
  };
}

function sendJson(res, status, body) {
  res.status(status).json(body);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method not allowed' });
  }

  if (!process.env.NOTION_API_KEY) {
    return sendJson(res, 500, { error: 'Missing NOTION_API_KEY environment variable' });
  }

  const lead = req.body || {};
  if (!lead.businessName || !lead.contactName || !lead.email || !lead.niche || !lead.bottleneck) {
    return sendJson(res, 400, { error: 'Missing required lead fields' });
  }

  try {
    const notionResponse = await fetch(NOTION_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(buildPayload(lead))
    });

    const notionData = await notionResponse.json();
    if (!notionResponse.ok) {
      return sendJson(res, notionResponse.status, {
        error: 'Failed to create lead in Notion',
        notion: notionData
      });
    }

    return sendJson(res, 200, {
      ok: true,
      notion_page_id: notionData.id,
      url: notionData.url
    });
  } catch (error) {
    return sendJson(res, 500, {
      error: 'Unexpected server error',
      detail: error.message
    });
  }
}
