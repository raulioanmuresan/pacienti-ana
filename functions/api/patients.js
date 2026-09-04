// Cloudflare Pages Function — /api/patients
// Necesită:
//   - KV binding numit PATIENTS_KV
//   - Variabilă de mediu APP_PASSWORD (tip "Secret")

const VALID_OS = ['Trio', 'Loop', 'AAPS', 'Other'];

function checkAuth(request, env) {
  const provided = request.headers.get('x-app-password') || '';
  return provided.length > 0 && provided === env.APP_PASSWORD;
}

async function getPatients(env) {
  const raw = await env.PATIENTS_KV.get('patients');
  let patients = raw ? JSON.parse(raw) : [];
  // completează id-uri lipsă (pacienți adăugați înainte de update)
  let changed = false;
  patients = patients.map(p => {
    if (!p.id) { changed = true; return { ...p, id: crypto.randomUUID() }; }
    return p;
  });
  if (changed) {
    await env.PATIENTS_KV.put('patients', JSON.stringify(patients));
  }
  return patients;
}

export async function onRequestGet({ request, env }) {
  if (!checkAuth(request, env)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  const patients = await getPatients(env);
  return new Response(JSON.stringify({ patients }), { status: 200, headers: { 'content-type': 'application/json' } });
}

export async function onRequestPost({ request, env }) {
  if (!checkAuth(request, env)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  let body;
  try { body = await request.json(); } catch (e) {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const { name, url, token, os } = body;
  if (!name || !url) {
    return new Response(JSON.stringify({ error: 'missing_fields' }), { status: 400 });
  }

  const patients = await getPatients(env);
  patients.push({
    id: crypto.randomUUID(),
    name: String(name).trim(),
    url: String(url).trim(),
    token: token ? String(token).trim() : '',
    os: VALID_OS.includes(os) ? os : 'Trio'
  });

  await env.PATIENTS_KV.put('patients', JSON.stringify(patients));

  return new Response(JSON.stringify({ ok: true, patients }), { status: 200, headers: { 'content-type': 'application/json' } });
}
