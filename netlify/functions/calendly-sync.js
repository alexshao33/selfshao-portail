const CALENDLY_TOKEN = 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc0NjkzMzg0LCJqdGkiOiIzZWMzMjhlZi02NmFkLTQ2M2QtOWI2MC04ZTg1YTc1YjdmYzEiLCJ1c2VyX3V1aWQiOiJjMDUzOWY0MC1mODkzLTQyNjMtOTc5MS02Mzg2Zjc4Zjg4ZmMiLCJzY29wZSI6Imdyb3VwczpyZWFkIG9yZ2FuaXphdGlvbnM6cmVhZCBvcmdhbml6YXRpb25zOndyaXRlIHVzZXJzOnJlYWQgYXZhaWxhYmlsaXR5OnJlYWQgYXZhaWxhYmlsaXR5OndyaXRlIGV2ZW50X3R5cGVzOnJlYWQgZXZlbnRfdHlwZXM6d3JpdGUgbG9jYXRpb25zOnJlYWQgcm91dGluZ19mb3JtczpyZWFkIHNoYXJlczp3cml0ZSBzY2hlZHVsZWRfZXZlbnRzOnJlYWQgc2NoZWR1bGVkX2V2ZW50czp3cml0ZSBzY2hlZHVsaW5nX2xpbmtzOndyaXRlIn0.-JNmPJFkIWQS0meotgM9DqaGi14QhEBB8OOyOMFrq22lbeJuErqA5K0n5tFaSGrStrG4_PQbC_Makh_J9GQktw';

async function get(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Calendly ${res.status}`);
  return res.json();
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { email } = req.body;
    if (!email) throw new Error('Email manquant');

    const me = await get('https://api.calendly.com/users/me');
    const userUri = me.resource.uri;
    const now = new Date().toISOString();

    let matched = [];
    let nextUrl = `https://api.calendly.com/scheduled_events?user=${encodeURIComponent(userUri)}&status=active&max_start_time=${now}&count=100&sort=start_time:desc`;

    do {
      const data = await get(nextUrl);
      const events = data.collection || [];
      for (const ev of events) {
        const uuid = ev.uri.split('/').pop();
        try {
          const inv = await get(`https://api.calendly.com/scheduled_events/${uuid}/invitees?count=100&email=${encodeURIComponent(email)}`);
          if (inv.collection && inv.collection.length > 0) {
            matched.push({ date: ev.start_time.split('T')[0], name: ev.name });
          }
        } catch(e) {}
      }
      nextUrl = data.pagination?.next_page || null;
    } while (nextUrl);

    res.status(200).json({ events: matched });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
