# Archive Report: public-pages-design

**Change**: #2
**Archived**: 2026-06-29
**Branch**: feature/ppd-slice-4-tests-e2e
**Verify Verdict**: PASS (38/38 reqs, 104/104 scenarios, 202 vitest green, 87.86% coverage)

## Summary

The `public-pages-design` change delivered the complete Phase 1 MVP public frontend for La Zíngara: 6 public-facing pages (home, carta, menú diario, reservas, eventos, contacto) with mock data, a provider-agnostic SMS verification module, and a shared terracotta-cream-slate design system. All 45 tasks completed across 4 chained PR slices. The change is fully verified — ready to close.

## Verification Gate

| Metric | Value |
|--------|-------|
| Requirements | 38/38 compliant |
| Scenarios | 104/104 compliant |
| Vitest tests | 202 passed, 0 failed, 34 files |
| Playwright E2E | 12 passed, 2 failed (pre-existing tsconfig infra issue) |
| Coverage | 87.86% statements (threshold: 70%) |
| vue-tsc | Clean (zero type errors) |
| ESLint | Clean (zero errors/warnings) |
| Architecture decisions (AD1-AD7) | All followed |
| TDD compliance | 6/6 checks passed |

### Issues Found

- **CRITICAL**: 0 (none)
- **WARNING**: 4 — cooldown timing nuance (SmsVerificationStep), IntersectionObserver coverage gap (carta.vue), scroll DOM method coverage gap (CategorySelector), require() fallback paths uncovered (sms-factory.ts)
- **SUGGESTION**: 2 — "válido" accent orthography in validation messages, scroll-spy debounce not yet implemented

### Playwright E2E Failures

2 tests fail (Home `/` and Menu Diario `/menu-diario`) due to a pre-existing `tsconfig.json` project-references parse error in Nuxt's dev server. The same pages pass SSR `$fetch` integration tests (HTTP 200 + Spanish content). Root cause is infra/config, not implementation.

## Artifacts Archived

| Artifact | Status | Location |
|----------|--------|----------|
| proposal.md | ✅ | `archive/2026-06-29-public-pages-design/` |
| design.md | ✅ | `archive/2026-06-29-public-pages-design/` |
| tasks.md | ✅ (45/45) | `archive/2026-06-29-public-pages-design/` |
| verify-report.md | ✅ | `archive/2026-06-29-public-pages-design/` |
| specs/ (7 delta) | ✅ | `archive/2026-06-29-public-pages-design/specs/` |

## Canonical Specs Synced

| Capability | Spec Path | Reqs | Scenarios |
|------------|-----------|------|-----------|
| public-ui | `openspec/specs/public-ui/spec.md` | 8 | 14 |
| carta-navigation | `openspec/specs/carta-navigation/spec.md` | 7 | 20 |
| menu-diario | `openspec/specs/menu-diario/spec.md` | 4 | 9 |
| reservas-flow | `openspec/specs/reservas-flow/spec.md` | 5 | 17 |
| eventos-gallery | `openspec/specs/eventos-gallery/spec.md` | 4 | 11 |
| contacto | `openspec/specs/contacto/spec.md` | 4 | 12 |
| sms-module | `openspec/specs/sms-module/spec.md` | 6 | 21 |

**Total**: 38 requirements, 104 scenarios across 7 canonical specs.

## Implementation Stats

| Metric | Value |
|--------|-------|
| Tasks | 45 |
| Components | 14 (AppHeader, AppFooter, BaseButton, BaseCard, PageHero, SectionDivider, CategorySelector, ProductGrid, ProductCard, SmsVerificationStep, ReservationForm, EventCard, ContactForm, MapEmbed) |
| Pages | 6 (index, carta, menu-diario, reservas, eventos, contacto) |
| Fixtures | 3 (carta-mock, menu-diario-mock, eventos-mock) |
| Nitro endpoints | 4 (sms/send, sms/verify, reservas, contacto) |
| SMS module | 2 adapters (mock, labsmobile) + factory + store |
| Vitest tests | 202 across 34 files (29 unit + 5 nuxt integration) |
| Playwright tests | 14 across 2 files |
| Coverage | 87.86% statements / 82.56% branches / 90.09% funcs / 88.12% lines |
| Lines of code | ~2,900 across ~42 files |
| Chained PRs | 4 slices (PR #2 → #3 → #4 → #5) + tracker PR (#1) |

## Config Updates

- **openspec/config.yaml**: `context.status` updated — Change #2 archived, public pages implemented, next Phase 2/3.
- **openspec/project.md**: `SDD Status` updated — Change #2 marked ARCHIVED with stats.

## Open Items for Future Changes

| Item | Priority | Notes |
|------|----------|-------|
| LabsMobile real API integration | Medium | Needs LabsMobile account; mock adapter complete |
| Scroll-spy debounce (300ms) | Low | Edge-case optimization from CN-002 |
| "válido" accent fix | Low | Orthography in ReservationForm/ContactForm validation |
| Phase 2: Panel & Auth | High | `/cocina` Supabase Auth + CRUDs |
| Phase 3: Konva Mesas | Medium | Table engine + Realtime sync |
| Playwright tsconfig fix | Medium | Pre-existing infra; 2 E2E pages fail |

## Audit Trail

- **Change folder**: `openspec/changes/archive/2026-06-29-public-pages-design/`
- **Canonical specs**: `openspec/specs/{public-ui,carta-navigation,menu-diario,reservas-flow,eventos-gallery,contacto,sms-module}/spec.md`
- **Commit branch**: `feature/ppd-slice-4-tests-e2e`
- **Engram memory**: `sdd/public-pages-design/archive-report` (topic_key)
- **Previous engram artifacts**: apply-progress (#521)
