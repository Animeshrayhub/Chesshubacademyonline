async function main() {
  try {
    const res = await fetch('https://titqwyiiagdxmzkgimpe.supabase.co/rest/v1/', {
      headers: {
        'apikey': 'anon' // dummy key
      }
    });
    console.log('Status:', res.status);
    console.log('Headers:');
    res.headers.forEach((val, key) => {
      console.log(`  ${key}: ${val}`);
    });
  } catch (err) {
    console.error(err);
  }
}

main();
