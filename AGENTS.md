# Parallelization and Subagents

- **Parallelize independent tasks**: When multiple tasks don't depend on each other, run them in parallel (e.g., multiple search queries, reading multiple files, running lint + typecheck + tests)
- **Batch API calls**: When making multiple API/tool calls that don't depend on each other's results, batch them in a single response
- **Use subagents for independent threads**: Spawn a subagent when:
  - The task requires many steps or focused exploration (e.g., code reviews, research, refactoring a module, writing tests, investigating bugs)
  - User explicitly requests it
  - User says things like "let's sidetrack to...", "can you also look into...", or similar tangential requests
  - The task can run non-interactively after gathering initial requirements
- **Context exchange via documents**: When spawning a subagent:
  - Create a document (e.g., `REVIEW-*.md`, `RESEARCH-*.md`) that defines scope, captures findings, and serves as handoff point
  - Alternatively, user may point to an existing document to use as context

# Workflow

There are 3 types of artifacts: **implementation**, **documents**, **tests**. Only change one at a time, then return to user for verification before changing others.

When implementing code changes:
1. Iterate on types and interfaces first
2. Get user confirmation
3. Then proceed with actual implementation

When user asks for a seemingly small change:
1. Ask if they want to code review instead
2. If yes, collect feedback using aider-style AI comments in code and markdown:
   - `AI!` - Action needed: change to be made
   - `AI?` - Question: needs clarification or review
3. Confirm with user before applying all changes at once

For complex code reviews, maintain a review document to capture context that won't fit into `AI!`/`AI?` comments (e.g., design rationale, alternative approaches considered, dependencies between changes). Name the document descriptively based on its content (e.g., `REVIEW-config-provider-refactor.md`).

When adding `AI!`/`AI?` comments during a code review, also update the corresponding review document with the design context and rationale.

During code review mode:
- Do not modify code - only add `AI!`/`AI?` comments and update review documents
- When user wants to proceed with changes, first revisit all `AI!`/`AI?` comments with context and clarify with user anything unclear or inconsistent before applying.

# Learning from Patterns

When completing a user request, consider if it represents a generalizable pattern that could benefit future interactions. If so:
1. Ask the user if they want to add it as an instruction to AGENTS.md
2. Show them the exact text you would add
3. Allow them to modify it before adding

# Boundaries

- Always: follow existing patterns unless explicitly asked not to
- Ask first: Adding new dependencies, changing public interfaces
- Never: Commit secrets, modify node_modules, push without permission

# Research Tasks

When asked a seemingly generic question without an immediate answer:
1. Ask if user wants to start a research task
2. If yes, create a descriptive research document (e.g., `RESEARCH-mcp-transport-protocols.md`)
3. Start with a research plan in the document
4. Ask follow-up questions directly to the user (not just in the document) to clarify the desired outcome
5. Once scope is clear, exclusively use web search and code search tools - do not make local code changes
6. Prioritize deep research tools if available
7. Populate the research document with findings, always including source URLs
8. Return to normal operation after research is complete

When user explicitly asks to use web search or research tools (e.g., "use perplexity to look for..."):
1. Immediately create a research document before starting the search
2. Follow steps 3-8 above

When starting a research task in a new conversation:
1. Confirm with user if this is a generic research task (not tied to implementing changes in this codebase)
2. If generic: do not read or modify code until user explicitly tells you to - focus purely on web research and documentation
3. If implementation-related: proceed with normal research + code exploration workflow
