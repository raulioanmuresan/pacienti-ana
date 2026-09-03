// Cloudflare Pages Function — /api/patients
// Necesită:
//   - KV binding numit PATIENTS_KV (Settings → Functions → KV namespace bindings)
//   - Variabilă de mediu APP_PASSWORD (Settings → Environment variables, tip "Secret")

function checkAuth(request, env) {
  const provided = request.headers.get('x-app-password') || '';
  return provided.length > 0 && provided === env.APP_PASSWORD;
}

export async function onRequestGet({ request, env }) {
  if (!checkAuth(request, env)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }

  const raw = await env.PATIENTS_KV.get('patients');
  const patients = raw ? JSON.parse(raw) : [];

  return new Response(JSON.stringify({ patients }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}

export async function onRequestPost({ request, env }) {
  if (!checkAuth(request, env)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' }
    });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const { name, url, token, os } = body;
  if (!name || !url || !token || !os) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400 });
  }

  const raw = await env.PATIENTS_KV.get('patients');
  const patients = raw ? JSON.parse(raw) : [];

  patients.push({
    name: String(name).trim(),
    url: String(url).trim(),
    token: String(token).trim(),
    os: os === 'Loop' ? 'Loop' : 'Trio'
  });

  await env.PATIENTS_KV.put('patients', JSON.stringify(patients));

  return new Response(JSON.stringify({ ok: true, patients }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}
