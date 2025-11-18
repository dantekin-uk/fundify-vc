export default {
  async fetch(request, env, ctx) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    try {
      const body = await request.json();
      const toList = Array.isArray(body.to)
        ? body.to.filter((x) => !!x)
        : (String(body.to || '').trim() ? [String(body.to).trim()] : []);
      const role = String(body.role || 'viewer');
      const orgId = String(body.orgId || '');
      const orgName = String(body.orgName || orgId);
      const link = String(body.link || '');
      const invitedBy = String(body.invitedBy || '');
      const subjectOverride = typeof body.subject === 'string' ? body.subject : null;
      const htmlOverride = typeof body.html === 'string' ? body.html : null;

      if (!toList.length) {
        return new Response(JSON.stringify({ error: 'Missing recipients' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      if (!subjectOverride && !link) {
        return new Response(JSON.stringify({ error: 'Missing link' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const RESEND_API_KEY = env.RESEND_API_KEY;
      const FROM_EMAIL = env.FROM_EMAIL || 'onboarding@resend.dev';

      const usingOverride = !!(subjectOverride && htmlOverride);
      const subject = usingOverride
        ? subjectOverride
        : `You're invited to join ${orgName}`;
      const html = usingOverride
        ? htmlOverride
        : `
        <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.6; color:#0f172a;">
          <h2 style="margin:0 0 12px;">You're invited</h2>
          <p><strong>${invitedBy || 'An admin'}</strong> invited you to join <strong>${orgName}</strong> as <strong>${role}</strong>.</p>
          <p>Click the button below to accept your invitation:</p>
          <p style="margin:20px 0;">
            <a href="${link}" style="background:#0ea5e9;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block;">Accept invitation</a>
          </p>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break:break-all;color:#0369a1;">${link}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;" />
          <p style="font-size:12px;color:#475569;">If you didn't expect this email, you can ignore it.</p>
        </div>
      `;

      const emailPayload = {
        from: FROM_EMAIL,
        to: toList,
        subject,
        html,
      };

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailPayload),
      });

      if (!emailRes.ok) {
        const errText = await emailRes.text();
        return new Response(JSON.stringify({ error: 'Failed to send email', details: errText }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }

      const data = await emailRes.json();
      return new Response(JSON.stringify({ success: true, id: data?.id || null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e?.message || 'Unknown error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  },
};
