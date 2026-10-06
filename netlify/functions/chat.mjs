const styleLabels = {
  formal:     'formell und geschäftlich, Sie-Form, strukturiert',
  freundlich: 'freundlich-professionell, wertschätzend, klar',
  kurz:       'sehr prägnant, auf das Wesentliche reduziert'
};

const json = (status, body) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' }
});

function systemPrompt({ mode, style, extra, userName }) {
  const s = styleLabels[style] || styleLabels.formal;
  const x = extra ? String(extra).slice(0, 2000) : '';
  if (mode === 'reply') {
    const name = userName ? String(userName).slice(0, 100) : 'der Nutzer';
    return `Du bist der persönliche E-Mail-Assistent von ${name}. \
Du liest eingehende E-Mails und formulierst eine passende Antwort, als wärst du ${name} selbst. \
Schreibe natürlich und authentisch im Namen von ${name}. \
Stil: ${s}. \
Gib nur den Nachrichtentext aus – keine Anrede, keine Grußformel, kein Markdown. Trenne Absätze mit einer Leerzeile.${x ? '\nPersönlicher Schreibstil: ' + x : ''}`;
  }
  return `Du bist ein professioneller E-Mail-Assistent für deutsche Geschäftskorrespondenz. \
Formuliere den informell eingesprochenen Text in einen professionellen E-Mail-Text um. \
Stil: ${s}. \
Nur den Nachrichtentext – keine Anrede, keine Grußformel, kein Markdown. Trenne Absätze mit einer Leerzeile.${x ? '\nZusatz: ' + x : ''}`;
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: { message: 'Method not allowed' } });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return json(500, { error: { message: 'OPENAI_API_KEY ist auf dem Server nicht gesetzt' } });

  const body = await req.json().catch(() => ({}));
  if (!body.content || typeof body.content !== 'string') return json(400, { error: { message: 'Kein Text übergeben' } });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1024,
      messages: [
        { role: 'system', content: systemPrompt(body) },
        { role: 'user',   content: body.content.slice(0, 50000) }
      ]
    })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return json(res.status, { error: { message: data?.error?.message || `HTTP ${res.status}` } });
  return json(200, { text: data.choices?.[0]?.message?.content || '' });
};
