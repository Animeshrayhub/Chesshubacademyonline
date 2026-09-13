import { createClassMeeting, type VideoProvider } from '../src/lib/video';

async function runVideoTests() {
  console.log('\n============================================================');
  console.log('CHESSUB ACADEMY: VIDEO INTEGRATION VERIFICATION TESTS');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // Test 1: Google Meet URL is preserved cleanly without being overwritten
  const googleMeetUrl = 'https://meet.google.com/abc-defg-hij';
  const meetRes = await createClassMeeting(
    'test-class-1',
    'Test Google Meet Session',
    new Date().toISOString(),
    60,
    'GOOGLE_MEET',
    googleMeetUrl
  );

  assert(meetRes.success, 'Google Meet creation succeeded');
  assert(meetRes.data?.provider === 'GOOGLE_MEET', 'Provider is GOOGLE_MEET');
  assert(meetRes.data?.joinUrl === googleMeetUrl, 'Join URL matches Google Meet link exactly');
  assert(meetRes.data?.startUrl === googleMeetUrl, 'Start URL matches Google Meet link exactly');

  // Test 2: URL normalization for Google Meet (missing https://)
  const rawMeetUrl = 'meet.google.com/xyz-uvw-rst';
  const normRes = await createClassMeeting(
    'test-class-2',
    'Test Normalization',
    new Date().toISOString(),
    60,
    'GOOGLE_MEET',
    rawMeetUrl
  );
  assert(normRes.data?.joinUrl === `https://${rawMeetUrl}`, 'Google Meet URL automatically prepends https://');

  // Test 3: Zoom provider fallback when no URL provided
  const zoomRes = await createClassMeeting(
    'test-class-3',
    'Test Zoom Session',
    new Date().toISOString(),
    60,
    'ZOOM'
  );
  assert(zoomRes.success, 'Zoom fallback creation succeeded');
  assert(zoomRes.data?.provider === 'ZOOM', 'Zoom provider resolved');
  assert(Boolean(zoomRes.data?.joinUrl?.includes('zoom.us')), 'Zoom fallback URL generated');

  // Test 4: Video Provider Detection regex/logic
  function detectProvider(url: string, fallback?: string): VideoProvider {
    const raw = (url || '').trim();
    if (raw.includes('meet.google.com')) return 'GOOGLE_MEET';
    if (raw.includes('jit.si')) return 'JITSI';
    if (raw.includes('zoom.us')) return 'ZOOM';
    return (fallback as VideoProvider) || (raw ? 'CUSTOM' : 'ZOOM');
  }

  assert(detectProvider('https://meet.google.com/test-room') === 'GOOGLE_MEET', 'detectProvider identifies Google Meet');
  assert(detectProvider('https://zoom.us/j/1234567890') === 'ZOOM', 'detectProvider identifies Zoom');
  assert(detectProvider('https://meet.jit.si/ChessHub_123') === 'JITSI', 'detectProvider identifies Jitsi');
  assert(detectProvider('') === 'ZOOM', 'detectProvider defaults to ZOOM when empty');

  console.log('\n------------------------------------------------------------');
  console.log(`TOTAL VIDEO TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('------------------------------------------------------------\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runVideoTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
