const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' }
});

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: { message: 'Method not allowed' } });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(500, { error: { message: 'OPENAI_API_KEY ist auf dem Server nicht gesetzt' } });

  const incoming = await req.formData().catch(() => null);
  const file = incoming?.get('file');
  if (!file) return json(400, { error: { message: 'Keine Audiodatei übergeben' } });

  const form = new FormData();
  form.append('file', file, 'audio.webm');
  form.append('model', 'whisper-1');
  form.append('language', 'de');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key },
    body: form
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json(res.status, { error: { message: data?.error?.message || `HTTP ${res.status}` } });
  return json(200, { text: data.text || '' });
};
