// Cloudflare Pages Function — /api/patients/:id
// Editare (PUT) și ștergere (DELETE) unui pacient existent.

const VALID_OS = ['Trio', 'Loop', 'AAPS', 'Other'];

function checkAuth(request, env) {
  const provided = request.headers.get('x-app-password') || '';
  return provided.length > 0 && provided === env.APP_PASSWORD;
}

async function getPatients(env) {
  const raw = await env.PATIENTS_KV.get('patients');
  return raw ? JSON.parse(raw) : [];
}

export async function onRequestPut({ request, env, params }) {
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

  const id = params.id;
  const patients = await getPatients(env);
  const idx = patients.findIndex(p => p.id === id);
  if (idx === -1) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  }

  patients[idx] = {
    id,
    name: String(name).trim(),
    url: String(url).trim(),
    token: token ? String(token).trim() : '',
    os: VALID_OS.includes(os) ? os : 'Trio'
  };

  await env.PATIENTS_KV.put('patients', JSON.stringify(patients));

  return new Response(JSON.stringify({ ok: true, patients }), { status: 200, headers: { 'content-type': 'application/json' } });
}

export async function onRequestDelete({ request, env, params }) {
  if (!checkAuth(request, env)) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }

  const id = params.id;
  const patients = await getPatients(env);
  const next = patients.filter(p => p.id !== id);

  if (next.length === patients.length) {
    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404 });
  }

  await env.PATIENTS_KV.put('patients', JSON.stringify(next));

  return new Response(JSON.stringify({ ok: true, patients: next }), { status: 200, headers: { 'content-type': 'application/json' } });
}
