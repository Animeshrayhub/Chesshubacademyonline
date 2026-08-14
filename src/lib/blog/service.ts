import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { fixGoogleDriveUrl } from '@/utils/imageUtils';
import type { BlogPost, BlogCategory } from '@/types';

export interface CreateBlogPostInput {
  title: string;
  category: BlogCategory | string;
  readingTimeMinutes: number;
  excerpt: string;
  content: string;
  imageUrl?: string;
  status: 'published' | 'draft';
  tags?: string[];
  featured?: boolean;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const INITIAL_SEED_POSTS: BlogPost[] = [
  {
    id: 'seed-post-1',
    slug: '10-proven-chess-opening-traps-every-student-must-know',
    title: '10 Proven Chess Opening Traps Every Student Must Know (With Diagrams & PGN)',
    excerpt: 'Master the Scholar\'s Mate refutation, Fried Liver Attack defense, Noah\'s Ark Trap, and Legal Trap to win more games in under 15 moves.',
    category: 'Opening Traps' as BlogCategory,
    author: 'GM Animesh Ray',
    authorTitle: 'FIDE Grandmaster & Chief Coach',
    authorImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1200&h=630&fit=crop&q=85',
    publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    featured: true,
    readingTimeMinutes: 7,
    tags: ['Opening Traps', 'Tactics', 'Scholar Mate', 'FIDE Training'],
    content: `
### Why Opening Traps Matter for Developing Players

Opening traps are tactical sequences occurring in the first 10-15 moves of a chess game that punish opponent mistakes, un-castled kings, or weak pawn structures. For junior and intermediate players, learning key opening traps provides two critical benefits:

1. **Immediate Tactical Opportunities**: Punish opponents who play on autopilot.
2. **Defensive Awareness**: Recognize opponent setup patterns before blundering material.

---

### Trap #1: The Scholar's Mate Refutation & Counter-Attack

Many beginner opponents play **1. e4 e5 2. Qh5 Nc6 3. Bc4**, threatening immediate checkmate on **f7**. Rather than panicking or making weakening pawn pushes, the refutation uses tactical counter-development:

\`\`\`pgn
1. e4 e5
2. Qh5 Nc6
3. Bc4 g6!
4. Qf3 Nf6
5. Ne2 Bg7
6. d3 O-O
\`\`\`

White has wasted critical time moving the Queen twice, leaving Black with complete central control and rapid piece development.

---

### Trap #2: The Noah's Ark Trap in the Ruy Lopez

This famous trap traps White's Light-Squared Bishop on the **b3** square in the Ruy Lopez opening:

\`\`\`pgn
1. e4 e5
2. Nf3 Nc6
3. Bb5 a6
4. Ba4 Nf6
5. O-O Be7
6. Re1 b5
7. Bb3 d6
8. c3 O-O
9. h3 Na5
10. Bc2 c5
11. d4 Qc7
12. Nbd2 cxd4
13. cxd4 Bd7
\`\`\`

When White greedily captures on **e5** without proper preparation, Black unleashes **...c4**, trapping the Bishop on **b3**.

---

### Grandmaster Summary & Practice Drills

To master these traps:
- Always check opponent checks, captures, and threats before making a pawn move.
- Prioritize rapid piece development and early king safety.
- Solve 5 tactical puzzle drills daily on ChessHub Academy to sharpen your pattern recognition!
    `,
  },
  {
    id: 'seed-post-2',
    slug: 'how-grandmaster-coaching-boosts-child-iq-focus-and-mathematical-logic',
    title: 'How Grandmaster Coaching Boosts Child IQ, Focus & Mathematical Logic',
    excerpt: 'Scientific studies from Harvard and Oxford demonstrate that structured chess training enhances working memory, pattern recognition, and decision-making resilience in school students.',
    category: 'Parent Guide' as BlogCategory,
    author: 'Sarah Jenkins, M.Ed.',
    authorTitle: 'Child Psychology Advisor',
    authorImageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?w=1200&h=630&fit=crop&q=85',
    publishedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    featured: false,
    readingTimeMinutes: 6,
    tags: ['Parent Guide', 'Child Psychology', 'Cognitive Benefits', 'Focus'],
    content: `
### The Science Behind Chess & Cognitive Development

Parents often ask: *"How does playing chess help my child in school?"*

Cognitive neuroscientists have long documented that learning chess engages both the left (logical, sequential) and right (spatial, creative) hemispheres of the brain. When junior players calculate variations 3 to 4 moves deep, they exercise executive functioning skills that directly translate to academic success.

---

### Key Cognitive Benefits Proven by Educational Research

1. **Enhanced Working Memory & Spatial Reasoning**:
   Visualizing move sequences requires holding complex spatial representations in memory. Students who practice 30 minutes of chess daily show up to a **24% improvement** in STEM problem-solving tests.

2. **Deeper Attention Span & Impulse Control**:
   In an era of rapid digital distractions, chess teaches children to slow down, evaluate candidate moves, and think before taking action.

3. **Emotional Resilience & Growth Mindset**:
   In chess, every loss is a clear, objective feedback loop. Guided by a Grandmaster coach, students learn to analyze their mistakes objectively without losing self-confidence.

---

### How Parents Can Support Their Child's Chess Journey

- **Celebrate Effort Over Winning**: Praise the child for thorough calculation and attendance consistency rather than rating numbers alone.
- **Maintain a Weekly Schedule**: 2 group or private live lessons weekly combined with 15 minutes of daily puzzle solving yields the highest long-term rating growth.
- **Encourage Tournament Experience**: Participating in friendly weekend tournaments builds poise and sportsmanship.
    `,
  },
  {
    id: 'seed-post-3',
    slug: 'ultimate-parents-guide-to-fide-ratings-tournaments-and-titles-2026',
    title: 'The Ultimate Parent\'s Guide to FIDE Ratings, Tournaments & Titles in 2026',
    excerpt: 'Everything parents need to know about navigating classical tournaments, earning international FIDE ratings, obtaining Candidate Master (CM) titles, and avoiding burnout.',
    category: 'Tournament Prep' as BlogCategory,
    author: 'GM Animesh Ray',
    authorTitle: 'FIDE Grandmaster & Chief Coach',
    authorImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&h=630&fit=crop&q=85',
    publishedAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    featured: false,
    readingTimeMinutes: 8,
    tags: ['FIDE Rating', 'Tournament Guide', 'Parents Guide', 'FIDE Titles'],
    content: `
### Demystifying International FIDE Ratings

The International Chess Federation (FIDE) ranks chess players globally using the Elo rating system. For young players starting out, understanding how ratings work removes anxiety and helps set clear, achievable milestones.

---

### FIDE Rating Categories & Milestones

- **Unrated (0 - 1000)**: Learning fundamental piece movement, basic tactics, and checkmate patterns.
- **Initial FIDE Rating (1400+)**: Achieved by scoring points against at least 5 rated players in official FIDE-rated tournaments.
- **Candidate Master (CM - 2200)**: Awarded by FIDE for exceptional international performance or World Youth championship placements.
- **Master & Grandmaster (FM, IM, GM - 2300 - 2500+)**: The pinnacle of professional chess excellence.

---

### Tournament Day Checklist for Parents

1. **Hydration & Healthy Snacks**: Classical games can last 3-4 hours. Pack water, bananas, and dark chocolate for sustained focus.
2. **Notation Sheet Record**: Ensure your child uses proper algebraic notation so the coach can perform deep post-game analysis.
3. **Rest & Recovery**: Avoid heavy cramming between rounds; encourage quiet walks or light stretch routines.
    `,
  },
  {
    id: 'seed-post-4',
    slug: 'from-800-to-1800-elo-6-month-tactical-training-blueprint',
    title: 'From 800 to 1800 Elo: A 6-Month Tactical Training Blueprint for Junior Players',
    excerpt: 'Discover the exact daily 3-ply calculation decision trees, endgame position drills, and candidate-move protocols used by top FIDE Academy juniors.',
    category: 'Grandmaster Tips' as BlogCategory,
    author: 'Coach Rahul Patel',
    authorTitle: 'Senior FIDE Trainer',
    authorImageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&q=80',
    imageUrl: 'https://images.unsplash.com/photo-1586165368502-1bad197a6461?w=1200&h=630&fit=crop&q=85',
    publishedAt: new Date(Date.now() - 86400000 * 12).toISOString(),
    featured: false,
    readingTimeMinutes: 9,
    tags: ['Elo Improvement', 'Tactics Blueprint', 'Study Plan', 'Endgames'],
    content: `
### The 6-Month Road to 1800 Elo

Reaching an 1800 Elo rating places a student in the top 5% of chess players worldwide. Achieving this benchmark requires structured deliberate practice across three core pillars:

---

### Phase 1: Months 1-2 (Tactical Dominance & Pattern Recognition)

- **Daily Goal**: Solve 15 tactics puzzles focusing on double attacks, pins, skewers, and back-rank checkmates.
- **Key Metric**: Achieve 85%+ accuracy on 2-ply and 3-ply combination drills.
- **Opening Strategy**: Focus on solid classical opening principles (Control center, develop knights/bishops, castle early).

---

### Phase 2: Months 3-4 (Calculation Decision Trees & Repertoire)

- **Candidate Move Protocol**: Before touching a piece, identify at least 3 candidate moves for both sides.
- **Pawn Structure Analysis**: Understand isolated pawns, doubled pawns, and passed pawn levers.

---

### Phase 3: Months 5-6 (Endgame Mastery & Tournament Readiness)

- **Essential Endgames**: Master King + Rook vs King, Opposition in King + Pawn endgames, and Lucena/Philidor Rook endgames.
- **Game Analysis**: Review every loss with a Grandmaster coach to eliminate recurring tactical blind spots.
    `,
  },
];

/**
 * Fetches all published blog posts for public website with automatic seed fallback.
 */
export async function getPublicBlogPosts(): Promise<BlogPost[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('blog_posts')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error || !data || data.length === 0) {
      try {
        const seedRows = INITIAL_SEED_POSTS.map((post) => ({
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          category: post.category,
          author: post.author,
          featured_image_url: post.imageUrl,
          published_at: post.publishedAt,
          featured: post.featured,
          reading_time_minutes: post.readingTimeMinutes,
          status: 'published',
          tags: post.tags,
        }));
        await admin.from('blog_posts').upsert(seedRows, { onConflict: 'slug' });
      } catch (seedErr) {
        console.warn('Auto-seed blog posts warning:', seedErr);
      }
      return INITIAL_SEED_POSTS;
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt || '',
      content: row.content || '',
      category: (row.category || 'Parent Guide') as BlogCategory,
      author: row.author || 'GM Animesh Ray',
      authorTitle: 'FIDE Grandmaster & Chief Coach',
      authorImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
      imageUrl: fixGoogleDriveUrl(row.featured_image_url) || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1200&h=630&fit=crop&q=85',
      publishedAt: row.published_at || row.created_at,
      featured: Boolean(row.featured),
      readingTimeMinutes: Number(row.reading_time_minutes) || 5,
      tags: row.tags || [],
    }));
  } catch (err) {
    console.error('Error in getPublicBlogPosts:', err);
    return INITIAL_SEED_POSTS;
  }
}

/**
 * Fetches a single public blog post by slug with seed fallback.
 */
export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!data) {
      const seedMatch = INITIAL_SEED_POSTS.find((p) => p.slug === slug);
      if (seedMatch) return seedMatch;
      return null;
    }

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      excerpt: data.excerpt || '',
      content: data.content || '',
      category: (data.category || 'Parent Guide') as BlogCategory,
      author: data.author || 'GM Animesh Ray',
      authorTitle: 'FIDE Grandmaster & Chief Coach',
      authorImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
      imageUrl: fixGoogleDriveUrl(data.featured_image_url) || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1200&h=630&fit=crop&q=85',
      publishedAt: data.published_at || data.created_at,
      featured: Boolean(data.featured),
      readingTimeMinutes: Number(data.reading_time_minutes) || 5,
      tags: data.tags || [],
    };
  } catch (err) {
    console.error('Error in getBlogPostBySlug:', err);
    return INITIAL_SEED_POSTS.find((p) => p.slug === slug) || null;
  }
}

export async function getAdminBlogPosts(status?: 'published' | 'draft'): Promise<BlogPost[]> {
  try {
    const admin = createSupabaseAdmin();
    let query = admin.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (status) {
      query = query.eq('status', status);
    }
    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      return INITIAL_SEED_POSTS;
    }
    return data.map((row: any) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt || '',
      content: row.content || '',
      category: (row.category || 'Parent Guide') as BlogCategory,
      author: row.author || 'GM Animesh Ray',
      authorTitle: 'FIDE Grandmaster & Chief Coach',
      authorImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
      imageUrl: fixGoogleDriveUrl(row.featured_image_url) || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1200&h=630&fit=crop&q=85',
      publishedAt: row.published_at || row.created_at,
      featured: Boolean(row.featured),
      readingTimeMinutes: Number(row.reading_time_minutes) || 5,
      tags: row.tags || [],
    }));
  } catch (err) {
    return INITIAL_SEED_POSTS;
  }
}

export async function saveBlogPost(input: CreateBlogPostInput, id?: string): Promise<{ success: boolean; data?: BlogPost; error?: string }> {
  try {
    const admin = createSupabaseAdmin();
    const slug = slugify(input.title);

    const payload = {
      title: input.title,
      slug,
      category: input.category,
      reading_time_minutes: input.readingTimeMinutes,
      excerpt: input.excerpt,
      content: input.content,
      featured_image_url: input.imageUrl,
      status: input.status,
      tags: input.tags || [],
      featured: input.featured || false,
      published_at: input.status === 'published' ? new Date().toISOString() : null,
    };

    if (id) {
      const { data, error } = await admin
        .from('blog_posts')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        data: {
          id: data.id,
          slug: data.slug,
          title: data.title,
          excerpt: data.excerpt,
          content: data.content,
          category: data.category as BlogCategory,
          author: data.author || 'GM Animesh Ray',
          authorTitle: 'FIDE Grandmaster & Chief Coach',
          authorImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
          imageUrl: fixGoogleDriveUrl(data.featured_image_url) || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1200&h=630&fit=crop&q=85',
          publishedAt: data.published_at || data.created_at,
          featured: Boolean(data.featured),
          readingTimeMinutes: Number(data.reading_time_minutes) || 5,
          tags: data.tags || [],
        },
      };
    } else {
      const { data, error } = await admin
        .from('blog_posts')
        .insert(payload)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return {
        success: true,
        data: {
          id: data.id,
          slug: data.slug,
          title: data.title,
          excerpt: data.excerpt,
          content: data.content,
          category: data.category as BlogCategory,
          author: data.author || 'GM Animesh Ray',
          authorTitle: 'FIDE Grandmaster & Chief Coach',
          authorImageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&q=80',
          imageUrl: fixGoogleDriveUrl(data.featured_image_url) || 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=1200&h=630&fit=crop&q=85',
          publishedAt: data.published_at || data.created_at,
          featured: Boolean(data.featured),
          readingTimeMinutes: Number(data.reading_time_minutes) || 5,
          tags: data.tags || [],
        },
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function createBlogPost(input: CreateBlogPostInput): Promise<BlogPost | null> {
  const result = await saveBlogPost(input);
  return result.success && result.data ? result.data : null;
}

export async function deleteBlogPost(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('blog_posts').delete().eq('id', id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
