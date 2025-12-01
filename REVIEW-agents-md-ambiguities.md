# Review: AGENTS.md Ambiguities

## 1. Parallelization and Subagents

| Issue | Ambiguity | Resolution |
|-------|-----------|------------|
| "many steps" | How many is "many"? 3? 5? 10? | |
| "focused exploration" | Unclear threshold - when does browsing become "focused exploration"? | |
| Subagent handoff | What happens after subagent completes? Auto-merge findings? Wait for user? | |
| Document location | Where should `REVIEW-*.md` / `RESEARCH-*.md` files be created? Root? `.factory/`? | |

## 2. Workflow

| Issue | Ambiguity | Resolution |
|-------|-----------|------------|
| "seemingly small change" | Subjective - what's small? One line? One file? One function? | |
| "return to user for verification" | Always wait? Or proceed if confident? | |
| Types/interfaces first | Only for new code? What about modifications to existing code? | |
| Code review vs implementation | If user doesn't respond to "code review?" question, what's the default? | |

## 3. Boundaries

| Issue | Ambiguity | Resolution |
|-------|-----------|------------|
| "existing patterns" | How to identify patterns in unfamiliar codebase? | |
| "changing public interfaces" | What counts as public? Exported functions? API endpoints? | |
| "Ask first" | Blocks on user response - what if user is unresponsive? | |

## 4. Research Tasks

| Issue | Ambiguity | Resolution |
|-------|-----------|------------|
| "seemingly generic question" | vs. a specific question that needs research? | |
| "without an immediate answer" | How long to try before concluding no immediate answer? | |
| Conflict with subagents section | Research tasks section says "ask if user wants to start" but subagents section says "spawn when task requires focused exploration" - which takes precedence? | |
| "Return to normal operation" | Should the research doc be deleted? Kept? Committed? | |

## 5. Missing Guidance

| Issue | Resolution |
|-------|------------|
| No guidance on error handling / recovery | |
| No guidance on when to abandon a failing approach | |
| No guidance on file cleanup (temp docs, artifacts) | |
| Subagents and Research Tasks overlap - both mention documents but with different workflows | |

---

## Priority Fixes

1. **Subagents vs Research Tasks conflict** - need to clarify relationship
2. **Document lifecycle** - where to create, when to clean up
3. **Thresholds** - "many steps", "small change" need concrete guidance
