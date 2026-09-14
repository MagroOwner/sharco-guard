import { neon } from '@neondatabase/serverless';

const HASH = /^[a-f0-9]{64}$/;

function database() {
  const url = process.env.SHARCO_GUARD_DATABASE_URL;
  if (!url) throw new Error('The threat database is not configured.');
  return neon(url);
}

export async function POST(request) {
  let input;
  try { input = await request.json(); }
  catch { return Response.json({ error: 'Request body must be JSON.' }, { status: 400 }); }

  const sha256 = String(input?.sha256 ?? '').toLowerCase();
  if (!HASH.test(sha256)) {
    return Response.json({ error: 'sha256 must be a lowercase, 64-character hexadecimal hash.' }, { status: 400 });
  }

  try {
    const sql = database();
    const rows = await sql`
      SELECT detection_name, malware_family, severity, recommended_action, first_seen_at, last_seen_at
      FROM threat_indicators
      WHERE sha256 = ${sha256}
        AND status = 'confirmed'
        AND (expires_at IS NULL OR expires_at > NOW())
      LIMIT 1
    `;
    if (!rows.length) return Response.json({ verdict: 'unknown', sha256 });
    const match = rows[0];
    return Response.json({
      verdict: 'malicious', sha256,
      detection: {
        name: match.detection_name,
        family: match.malware_family,
        severity: match.severity,
        action: match.recommended_action,
        firstSeenAt: match.first_seen_at,
        lastSeenAt: match.last_seen_at
      }
    });
  } catch (error) {
    console.error('Threat lookup failed:', error.message);
    return Response.json({ error: 'Threat lookup is temporarily unavailable.' }, { status: 503 });
  }
}

export function GET() {
  return Response.json({
    service: 'Sharco Guard Reputation API',
    version: 'v1',
    accepts: 'POST { sha256 }',
    privacy: 'File contents are never accepted by this endpoint.'
  });
}
