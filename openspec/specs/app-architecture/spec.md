# app-architecture Specification

## Purpose

Modular architecture skeleton for Restaurante La Zíngara. Establishes the vertical-slice structure and cross-domain contract boundaries that all future domain changes inherit. The bootstrap does NOT create real slices — it establishes the skeleton and rules.

## Requirements

### Requirement: AR-001 — Vertical Slice Skeleton

The system MUST have an `app/features/` directory with a `.gitkeep` file. This directory is the home for domain slices (`carta`, `reservas`, `mesas`, `eventos`, `auth`, `configuracion`). Each domain slice is an autonomous vertical with its own internal layers. Cross-domain communication is EXCLUSIVELY via contracts in `shared/`. No slices exist at bootstrap — the skeleton is structural preparation.

#### Scenario: Slice home directory exists

- GIVEN the bootstrap scaffold is complete
- WHEN listing `app/features/`
- THEN the directory exists
- AND contains `.gitkeep`
- AND is tracked by git while empty

### Requirement: AR-002 — Contract Home

The system MUST have `shared/` with `shared/types/` and `shared/contracts/` subdirectories, each with a `.gitkeep`. These directories are the contract boundary: every domain slice exposes its public interface through files here (e.g., `carta.contract.ts`). Nuxt 4 auto-imports `shared/` on both app and server sides, making contracts available without explicit imports.

#### Scenario: Contract home structure exists

- GIVEN the bootstrap scaffold is complete
- WHEN listing `shared/`
- THEN `shared/types/.gitkeep` exists
- AND `shared/contracts/.gitkeep` exists

### Requirement: AR-003 — No Slice-to-Slice Direct Imports

No file under `app/features/{domainA}/` SHALL import from `app/features/{domainB}/`. Cross-domain communication MUST go through `shared/contracts/`. This is a structural rule enforced by the directory skeleton and naming convention. A lint rule (eslint plugin) for automated enforcement is OUT OF SCOPE — it is a future hardening task (separate change).

#### Scenario: Skeleton establishes structural boundary

- GIVEN `app/features/` and `shared/contracts/` exist
- WHEN a future domain change adds a slice (e.g., `app/features/carta/`)
- THEN the convention mandates its public interface lives in `shared/contracts/carta.contract.ts`
- AND internal slice files MUST NOT import from sibling `app/features/*` directories

#### Scenario: Contract boundary is verifiable

- GIVEN the project directory structure
- WHEN a reviewer inspects cross-domain imports
- THEN any import from `app/features/domA/` into `app/features/domB/` is a violation
- AND may be detected manually via grep or filesystem traversal

### Requirement: AR-004 — Home Page Decision

The `/` home page MUST remain at `app/pages/index.vue` — it is NOT a domain slice. Rationale: `/` is a shell-level route composing multiple domains, not a standalone domain. This preserves the convention that `app/features/` is only for true vertical domains. The decision is documented here so future implementers understand why `app/features/home/` does not exist.

#### Scenario: Home page is NOT a domain slice

- GIVEN the project directory structure
- WHEN listing `app/features/`
- THEN no `home/` subdirectory exists
- AND the home page is at `app/pages/index.vue`

#### Scenario: Shell pages don't violate slice rules

- GIVEN `app/pages/index.vue` imports from multiple domain contracts in `shared/contracts/`
- WHEN implemented by future changes
- THEN the page is a composition surface, NOT a domain slice
- AND does NOT violate AR-003 because `app/pages/` is not under `app/features/`
