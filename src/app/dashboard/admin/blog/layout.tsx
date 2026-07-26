import PageHeader from '@/components/dashboard/ui/PageHeader';
import SubNav from '@/components/dashboard/layout/SubNav';
import type { SubNavItem } from '@/types/dashboard';

const BLOG_TABS: SubNavItem[] = [
  { label: 'All Posts',   href: '/dashboard/admin/blog',          iconKey: 'fileText' },
  { label: 'Create Post', href: '/dashboard/admin/blog/create',     iconKey: 'plus' },
  { label: 'Categories',  href: '/dashboard/admin/blog/categories', iconKey: 'folder' },
  { label: 'Tags',        href: '/dashboard/admin/blog/tags',       iconKey: 'tag' },
  { label: 'Drafts',      href: '/dashboard/admin/blog/drafts',     iconKey: 'clipboard' },
  { label: 'Media',       href: '/dashboard/admin/blog/media',      iconKey: 'image' },
];

export default function AdminBlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Academy Blog Management"
        subtitle="Manage public marketing articles, news updates, student highlights, and parent study guides."
      />
      <SubNav items={BLOG_TABS} />
      <div className="pt-2">{children}</div>
    </div>
  );
}
