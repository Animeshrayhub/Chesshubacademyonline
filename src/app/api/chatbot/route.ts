import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { message, utmSource, previousSkill } = await req.json();
    const query = (message || '').toLowerCase().trim();

    let responseText = '';
    let actionButton: { label: string; href: string } | undefined = undefined;
    let leadScore = 'Cold';

    // Skill Assessment Intent (Items 3 & 5)
    if (query.includes('beginner') || query.includes('new') || query.includes('starter') || query.includes('just starting')) {
      leadScore = 'Hot';
      responseText = "♟️ Perfect! Our Beginner Track (0-1000 ELO) is tailored for young learners starting from scratch. We cover piece movement, basic checkmates, and tactical vision.\n\nWould you like to share your student's age or Lichess/Chess.com username for a custom demo evaluation?";
      actionButton = { label: '📅 Book Free Beginner Demo', href: '/book-demo?track=beginner' };
    } else if (query.includes('intermediate') || query.includes('advanced') || query.includes('elo') || query.includes('rating')) {
      leadScore = 'Hot';
      responseText = "🏆 Excellent! For intermediate/advanced students, FIDE-rated coaches conduct deep calculation drills, opening repertoire planning, and master game analysis.\n\nEnter your Lichess username below or click to schedule a 1v1 trial!";
      actionButton = { label: '📅 Book 1v1 Master Demo', href: '/book-demo?track=advanced' };
    } 
    // Lead capture & WhatsApp trigger (Item 2 & 25)
    else if (query.includes('demo') || query.includes('trial') || query.includes('book') || query.includes('free')) {
      leadScore = 'Hot';
      responseText = "🎉 Great choice! You can book a free 1-on-1 live demo class with our FIDE-rated coaches. During the demo, our coach evaluates the student's skill level and creates a personalized training roadmap.";
      const waMessage = encodeURIComponent(`Hi ChessHub Admin, I want to book a Free Demo Class. Source: ${utmSource || 'Website Chatbot'}`);
      actionButton = { 
        label: '📲 WhatsApp Admin Instant Booking (+91 70086 65245)', 
        href: `https://wa.me/917008665245?text=${waMessage}` 
      };
    } 
    // Pricing Intent
    else if (query.includes('fee') || query.includes('price') || query.includes('cost') || query.includes('pay')) {
      leadScore = 'Warm';
      responseText = "💰 ChessHub Academy offers flexible monthly plans for Individual (1-on-1), Buddy (1-on-2), and Group cohorts starting from $15/class with full access to homework, Stockfish bot practice, and Lichess tournaments.";
      actionButton = { label: '🎓 View Programs & Fees', href: '/programs' };
    } 
    // Coaches Intent
    else if (query.includes('coach') || query.includes('teacher') || query.includes('fide') || query.includes('instructor')) {
      leadScore = 'Warm';
      responseText = "👨‍🏫 Meet our official FIDE Certified Faculty:\n• Animesh Ray — FIDE Development Instructor (DI) (FIDE ID: 33391718)\n• Manoj Kumar Rai — FIDE National Instructor (NI) (FIDE ID: 35017217)\n• Ayush Pattanaik — FIDE National Instructor (NI) (Peak Rating: 1891)\n• Pradipta Patnaik — Academy Chess Coach (~1750 Elo)";
      actionButton = { label: '🏆 Meet Our FIDE Coaches', href: '/about#team' };
    } 

    // Default A/B response (Item 26)
    else {
      responseText = "🤖 Welcome to ChessHub Academy! We provide live online 1v1 and group chess coaching with interactive wooden boards, Stockfish engine analysis, daily streak rewards, and Lichess tournaments. How can I guide you today?";
      actionButton = { label: '🚀 Book a Free Demo Class', href: '/book-demo' };
    }

    return NextResponse.json({
      success: true,
      data: {
        responseText,
        actionButton,
        leadScore,
        utmSource: utmSource || 'direct',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to process AI response' },
      { status: 500 }
    );
  }
}
