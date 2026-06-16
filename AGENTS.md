# Agent Operating Instructions

This file defines how AI agents must behave when working in this project. Read this before any work.

## Startup Protocol

Before starting any task:
1. Read `projectbrief.md` to understand what we're building and why
2. Read `ARCHITECT_IMPLEMENTATION.md` to understand system structure
3. Read `FILE_STRUCTURE.md` before creating folders or moving files
4. Check `CHANGELOG.md` for recent changes that might affect your work

## Non-Negotiables

### Never Do These:
- Push directly to main/master branch
- Create new top-level folders without updating FILE_STRUCTURE.md
- Modify files in `config/` or `secrets/` without explicit approval
- Skip reading projectbrief.md and ARCHITECT_IMPLEMENTATION.md
- Make architecture decisions without documenting in CHANGELOG.md
- Leave TODO comments without creating tracking issues

### Always Do These:
- Use feature branches: `feat/<scope>-<short-description>`
- Follow existing code patterns (check similar files first)
- Update documentation when behavior changes
- Run tests before committing
- Keep commits atomic (one logical change per commit)

## Coding Standards

- **Style:** Match existing code. Don't reformat files unless asked.
- **Comments:** Explain *why*, not *what*. Code should be self-documenting.
- **Functions:** Max 50 lines. Extract if larger.
- **Types:** Always define interfaces for public APIs.
- **Tests:** New features need tests. Bug fixes need regression tests.

## Documentation Protocol

### When You Make Changes:
1. **Code changes** → Update ARCHITECT_IMPLEMENTATION.md if structure changes
2. **New folders** → Update FILE_STRUCTURE.md immediately
3. **All changes** → Add entry to CHANGELOG.md under "Unreleased"

### CHANGELOG Format:
```
## Unreleased
### [Added/Changed/Fixed]
- Brief description (#issue-number)
  - **Why:** Explain the reasoning
  - **Impact:** What this changes
```

## Definition of Done

A task is complete when:
- [ ] Code works as specified
- [ ] Tests pass (run full test suite)
- [ ] Documentation updated (if behavior changed)
- [ ] CHANGELOG.md updated
- [ ] No linting errors
- [ ] Commit message follows convention

## Memory Strategy

**What to remember across sessions:**
- Architecture decisions and their rationale
- Workarounds and technical debt
- User preferences and feedback

**Where to store it:**
- Quick decisions → CHANGELOG.md
- Architecture choices → ARCHITECT_IMPLEMENTATION.md
- User preferences → projectbrief.md

## Working with Other Agents

When you see recent changes in CHANGELOG.md:
1. Read what changed and why
2. Check if it affects your current task
3. Coordinate if there are conflicts
4. Never overwrite another agent's work without understanding it

## Questions?

If requirements are unclear:
1. Check projectbrief.md first
2. Check recent CHANGELOG entries
3. Ask for clarification rather than guessing

**Remember:** Your job is to build reliable, maintainable code while keeping the documentation current. Future agents (including yourself) will depend on what you document today.
