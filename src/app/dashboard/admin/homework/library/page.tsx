import React from 'react';
import HomeworkLibraryRegistry from '@/features/admin/HomeworkLibraryRegistry';
import { listHomeworkLibrary, listCategories, listThemes, listHwCollections, listHwCourses } from '@/lib/homework';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Homework Library — Admin | ChessHub Academy' };

export default async function AdminHomeworkLibraryPage() {
  const [libraryRes, catsRes, themesRes, collsRes, coursesRes] = await Promise.all([
    listHomeworkLibrary({ pageSize: 20 }),
    listCategories(),
    listThemes(),
    listHwCollections(),
    listHwCourses(),
  ]);

  const templates  = libraryRes.success  && libraryRes.data  ? libraryRes.data.templates  : [];
  const total      = libraryRes.success  && libraryRes.data  ? libraryRes.data.total       : 0;
  const categories = catsRes.success     && catsRes.data     ? catsRes.data                : [];
  const themes     = themesRes.success   && themesRes.data   ? themesRes.data              : [];
  const collections= collsRes.success    && collsRes.data    ? collsRes.data               : [];
  const courses    = coursesRes.success  && coursesRes.data  ? coursesRes.data             : [];

  return (
    <HomeworkLibraryRegistry
      initialTemplates={templates}
      initialTotal={total}
      categories={categories}
      themes={themes}
      collections={collections}
      courses={courses}
    />
  );
}
