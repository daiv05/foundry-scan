# F14 - Opportunities Management UI

## Objective

Interface for exploring, filtering, evaluating, and annotating discovered opportunities.

## Scope

### Page: /opportunities - Listing

- List of all opportunities from all scans
- Filters by: `user_status` (new, evaluating, discarded, building, archived), score range
- Sort by score (default DESC)
- OpportunityCard for each item

### Page: /opportunities/[id] - Details

- Name and prominent score
- ScoreBar: 4 horizontal bars (pain, trend, competition, MVP) + total

- Green 8+, yellow 5-7, red <5
- Problem described
- Evidence with tags
- TrendBadge: up / horizontal / down arrow
- CompetitionMeter: saturation indicator (green/yellow/red)
- Target user
- MVP features
- Monetization
- Build time estimate
- LLM's reasoning

### Status and Notes

- Buttons to change `user_status`: new --> Evaluating --> Building (or discarded/archived)
- `PATCH /api/opportunities/{id}` with new status
- **NotesPanel:** Free text field for personal notes (my thoughts, decisions, links to research). Automatic saving.

### Key Components

- **OpportunityCard** - name, color-coded score badge, issue, evidence tags, status button
- **ScoreBar** - 4 bars + total with colors
- **TrendBadge** - up/horizontal/down arrow
- **CompetitionMeter** - traffic light indicator
- **NotesPanel** - textarea with autosave

## Acceptance Criteria

- [x] Lists all opportunities with filters and sorting options
- [x] Details panel displays all LLM information
- [x] ScoreBar with correct colors
- [x] Status change works and persists
- [x] Personal notes are automatically saved
- [ ] TrendBadge and CompetitionMeter display data correctly (pending - F16+)

## Dependencies

- F11 (shell and routing)
- F03 (opportunity endpoints)
- F10 (opportunities parsed in DB)

## Ref SPEC

Section 8.1 (routes), 8.2 (components)