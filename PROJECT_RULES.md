# ChessHub Academy - Project Rules

Version: 1.0

Status: Active

---

# 1. General Rules

Every implementation must follow:

- MASTER_BLUEPRINT.md
- BRAND_DESIGN_SYSTEM.md
- PROJECT_RULES.md
- ROADMAP.md

Never violate these documents.

If a conflict exists:

MASTER_BLUEPRINT.md takes priority.

---

# 2. Development Philosophy

Build for production.

Never build demo code.

Never build temporary code.

Never sacrifice quality for speed.

Every feature should be scalable.

Every file should be maintainable.

---

# 3. Coding Standards

Language

- TypeScript only

Framework

- Next.js App Router

Styling

- Tailwind CSS

No inline styles unless absolutely necessary.

---

# 4. Component Rules

Every UI element must be reusable.

Never duplicate code.

If a component appears more than once,
convert it into a reusable component.

Examples

- Button
- Card
- Section
- SectionTitle
- Input
- Modal
- FAQItem
- ProgramCard
- CoachCard
- TestimonialCard

---

# 5. Folder Rules

components/

Reusable components only.

features/

Business specific components.

layout/

Header

Footer

Sidebar

Mobile Menu

hooks/

Reusable hooks only.

utils/

Pure utility functions.

services/

External integrations.

constants/

Application constants only.

Never place colors inside constants.

Colors belong in CSS.

---

# 6. File Naming

Components

PascalCase

Example

BookDemoCard.tsx

Hooks

camelCase

Example

useAuth.ts

Utilities

camelCase

Example

formatDate.ts

Constants

UPPER_CASE

---

# 7. TypeScript Rules

No any.

Prefer interfaces.

Prefer explicit types.

Keep strict mode enabled.

Never disable TypeScript checks.

---

# 8. React Rules

Use functional components.

Prefer Server Components.

Use Client Components only when required.

Keep components small.

Avoid deeply nested JSX.

---

# 9. Next.js Rules

Use App Router.

Use Metadata API.

Use next/image.

Use next/font.

Lazy load heavy components.

Dynamic import large libraries.

---

# 11. Performance Rules

Target

Performance ≥90

Accessibility ≥95

SEO ≥95

Best Practices ≥95

Avoid unnecessary JavaScript.

Optimize images.

Avoid layout shifts.

---

# 12. Accessibility

WCAG AA

Keyboard navigation

Focus states

ARIA labels

Semantic HTML

Minimum font size

16px

---

# 13. SEO

Every public page must include:

Title

Description

Canonical URL

Open Graph

Twitter Card

Structured Data

Sitemap

Robots

---

# 14. Animations

Maximum duration

300ms

Allowed

Fade

Slide

Hover

Float

Avoid

Bounce

Spin

Heavy effects

---

# 15. Security

Validate all inputs.

Never trust client data.

Protect routes.

Use Role Based Access Control.

---

# 16. Git Rules

Small commits.

Meaningful commit messages.

Never commit broken code.

Always lint before committing.

---

# 17. Quality Checklist

Before completing any feature:

✅ No TypeScript errors

✅ No ESLint warnings

✅ Responsive

✅ Accessible

✅ Reusable

✅ SEO friendly

✅ Performance checked

---

# 18. AI Agent Rules

Before making changes:

Read

MASTER_BLUEPRINT.md

BRAND_DESIGN_SYSTEM.md

PROJECT_RULES.md

ROADMAP.md

Always provide an Implementation Plan.

Wait for approval.

Only then write code.

Never modify unrelated files.

Never install packages unless requested.

Never change architecture without approval.

If a reusable component already exists,

reuse it.

Do not create duplicates.
