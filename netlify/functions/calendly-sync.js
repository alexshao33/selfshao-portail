const CALENDLY_TOKEN = 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc0NjkzMzg0LCJqdGkiOiIzZWMzMjhlZi02NmFkLTQ2M2QtOWI2MC04ZTg1YTc1YjdmYzEiLCJ1c2VyX3V1aWQiOiJjMDUzOWY0MC1mODkzLTQyNjMtOTc5MS02Mzg2Zjc4Zjg4ZmMiLCJzY29wZSI6Imdyb3VwczpyZWFkIG9yZ2FuaXphdGlvbnM6cmVhZCBvcmdhbml6YXRpb25zOndyaXRlIHVzZXJzOnJlYWQgYXZhaWxhYmlsaXR5OnJlYWQgYXZhaWxhYmlsaXR5OndyaXRlIGV2ZW50X3R5cGVzOnJlYWQgZXZlbnRfdHlwZXM6d3JpdGUgbG9jYXRpb25zOnJlYWQgcm91dGluZ19mb3JtczpyZWFkIHNoYXJlczp3cml0ZSBzY2hlZHVsZWRfZXZlbnRzOnJlYWQgc2NoZWR1bGVkX2V2ZW50czp3cml0ZSBzY2hlZHVsaW5nX2xpbmtzOndyaXRlIn0.-JNmPJFkIWQS0meotgM9DqaGi14QhEBB8OOyOMFrq22lbeJuErqA5K0n5tFaSGrStrG4_PQbC_Makh_J9GQktw';

async function get(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` }
  });
  if (!res.ok) throw new Error(`Calendly ${res.status}: ${await res.text()}`);
  return res.json();
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) throw new Error('Email manquant');

    // Get organization URI
    const me = await get('https://api.calendly.com/users/me');
    const orgUri = me.resource.current_organization;

    // Search invitees by email across entire organization
    const now = new Date().toISOString();
    let matched = [];
    let nextUrl = `https://api.calendly.com/scheduled_events/invitees?organization=${encodeURIComponent(orgUri)}&email=${encodeURIComponent(email)}&count=100`;

    do {
      const data = await get(nextUrl);
      for (const inv of (data.collection || [])) {
        // Get the event details to check if it's in the past
        const eventUri = inv.scheduled_event;
        const evData = await get(eventUri);
        const ev = evData.resource;
        if (ev && new Date(ev.end_time) < new Date()) {
          matched.push({
            date: ev.start_time.split('T')[0],
            name: ev.name || 'Séance'
          });
        }
      }
      nextUrl = data.pagination?.next_page || null;
    } while (nextUrl);

    return { statusCode: 200, headers, body: JSON.stringify({ events: matched }) };

  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
  }
};
