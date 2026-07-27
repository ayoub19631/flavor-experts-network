---
last_updated: 2026-05-14T11:49:43Z
---

# Architecture Design

## System Overview
Single-page landing website for Flavor Experts Network LinkedIn group. Pure frontend, no backend needed. All content is static/mock data.

## Tech Stack
- React 18 + TypeScript
- Vite (build tool)
- Tailwind CSS (styling)
- shadcn/ui (component library)
- lucide-react (icons)

## Module Design
| Module | Responsibility | Key Files |
|--------|---------------|-----------|
| Index Page | Main landing page composing all sections | src/pages/Index.tsx |
| Hero | Hero banner with group name, tagline, CTA | src/components/HeroSection.tsx |
| About | Group mission + founder bio | src/components/AboutSection.tsx |
| News | Industry news cards | src/components/NewsSection.tsx |
| Resources | Educational resources gallery | src/components/ResourcesSection.tsx |
| Contact | Contact form | src/components/ContactSection.tsx |
| Footer | Links and copyright | src/components/FooterSection.tsx |
| Navbar | Navigation bar | src/components/Navbar.tsx |

## Tech Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Single page | All sections in one page | Landing page pattern, best for conversion |
| Static data | Mock JSON in components | No backend needed for landing page |
| shadcn/ui | Pre-installed components | Professional look with minimal effort |

## File Tree Plan
```
src/
├── pages/
│   └── Index.tsx          # Main page composing all sections
├── components/
│   ├── Navbar.tsx         # Navigation bar
│   ├── HeroSection.tsx    # Hero with CTA
│   ├── AboutSection.tsx   # About group + founder
│   ├── NewsSection.tsx    # Industry news
│   ├── ResourcesSection.tsx # Educational resources
│   ├── ContactSection.tsx # Contact form
│   └── FooterSection.tsx  # Footer
└── index.css              # Custom theme colors
```

## Implementation Guide
1. Generate images (hero banner, founder photo, food science visuals)
2. Update index.css with professional food-tech color theme
3. Build all 7 component files
4. Compose in Index.tsx
5. Lint, build, check UI

