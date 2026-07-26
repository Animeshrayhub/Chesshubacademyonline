const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

function loadEnvFile(path) {
  try {
    if (!fs.existsSync(path)) return;
    const content = fs.readFileSync(path, 'utf8');
    for (const line of content.split('\n')) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
      if (match) {
        let val = match[2].trim();
        if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
        process.env[match[1].trim()] = val;
      }
    }
  } catch(e) {}
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Let's resolve the user IDs and profiles
  // Coach: Animesh Ray
  const { data: coachUser } = await supabase
    .from('users')
    .select('id')
    .eq('first_name', 'Animesh')
    .eq('last_name', 'Ray')
    .maybeSingle();

  console.log('Coach User:', coachUser);
  if (!coachUser) {
    console.error('Coach Animesh Ray not found.');
    return;
  }

  const { data: coachProfile } = await supabase
    .from('coach_profiles')
    .select('id')
    .eq('user_id', coachUser.id)
    .maybeSingle();

  console.log('Coach Profile:', coachProfile);

  // Students: tisuuu, Rahul Patel, Tisha, tisha Ray
  const studentNames = [
    { first: 'tisuuu', last: '' },
    { first: 'Rahul', last: 'Patel' },
    { first: 'Tisha', last: '' },
    { first: 'tisha', last: 'Ray' }
  ];

  const studentUserIds = [];
  for (const sn of studentNames) {
    let q = supabase.from('users').select('id, first_name, last_name').eq('first_name', sn.first);
    if (sn.last) q = q.eq('last_name', sn.last);
    const { data } = await q.maybeSingle();
    if (data) {
      studentUserIds.push(data.id);
      console.log(`Found student: ${data.first_name} ${data.last_name} (${data.id})`);
    } else {
      console.log(`Student not found: ${sn.first} ${sn.last}`);
    }
  }

  console.log('Student User IDs:', studentUserIds);

  // Now, let's test Zoom meeting creation
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  console.log('Zoom credentials present:', !!clientId, !!clientSecret, !!accountId);

  // 1. Fetch Server-to-Server OAuth Access Token
  const tokenUrl = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('Token response status:', tokenRes.status);
    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error(`Token response error: ${errText}`);
    } else {
      const tokenData = await tokenRes.json();
      console.log('Token fetched successfully!');
    }
  } catch (err) {
    console.error('Fetch failed:', err);
  }
}

main();
