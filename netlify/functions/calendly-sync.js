const CALENDLY_TOKEN = 'eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc0NjkzMzg0LCJqdGkiOiIzZWMzMjhlZi02NmFkLTQ2M2QtOWI2MC04ZTg1YTc1YjdmYzEiLCJ1c2VyX3V1aWQiOiJjMDUzOWY0MC1mODkzLTQyNjMtOTc5MS02Mzg2Zjc4Zjg4ZmMiLCJzY29wZSI6Imdyb3VwczpyZWFkIG9yZ2FuaXphdGlvbnM6cmVhZCBvcmdhbml6YXRpb25zOndyaXRlIHVzZXJzOnJlYWQgYXZhaWxhYmlsaXR5OnJlYWQgYXZhaWxhYmlsaXR5OndyaXRlIGV2ZW50X3R5cGVzOnJlYWQgZXZlbnRfdHlwZXM6d3JpdGUgbG9jYXRpb25zOnJlYWQgcm91dGluZ19mb3JtczpyZWFkIHNoYXJlczp3cml0ZSBzY2hlZHVsZWRfZXZlbnRzOnJlYWQgc2NoZWR1bGVkX2V2ZW50czp3cml0ZSBzY2hlZHVsaW5nX2xpbmtzOndyaXRlIn0.-JNmPJFkIWQS0meotgM9DqaGi14QhEBB8OOyOMFrq22lbeJuErqA5K0n5tFaSGrStrG4_PQbC_Makh_J9GQktw';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');
    if (!email) throw new Error('Email manquant');

    // Get user URI
    const meRes = await fetch('https://api.calendly.com/users/me', {
      headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` }
    });
    const me = await meRes.json();
    const userUri = me.resource.uri;

    // Use invitees search endpoint - searches ALL invitees by email directly
    const now = new Date().toISOString();
    let matched = [];
    let nextUrl = `https://api.calendly.com/scheduled_events/invitees?user=${encodeURIComponent(userUri)}&email=${encodeURIComponent(email)}&count=100&status=active`;

    do {
      const res = await fetch(nextUrl, {
        headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` }
      });
      const data = await res.json();
      const invitees = data.collection || [];

      for (const inv of invitees) {
        // Only past events
        if (new Date(inv.scheduled_event?.end_time || inv.event?.end_time || now) < new Date()) {
          const eventRes = await fetch(inv.event || inv.scheduled_event, {
            headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` }
          });
          const eventData = await eventRes.json();
          const ev = eventData.resource || eventData;
          matched.push({
            date: (ev.start_time || '').split('T')[0],
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
