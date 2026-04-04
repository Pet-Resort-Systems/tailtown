# Tailtown - Pet Resort Management System

A modern, full-featured SaaS management system written in Typescript for pet resorts, providing comprehensive tools for reservations, customer management, and pet care services.

## Development Environment

- Use `pnpm` instead of `npm`.

### Git Worktrees

Follow this guidelines when the workspace is a linked git worktree:

- Ensure dependencies are installed before running any `pnpm` command like `pnpm run typecheck` or `pnpm run tsc`.
- Copy env files from main worktree by running `pnpm run env:copy` if `.env` files are missing.

<!-- opensrc:start -->

## Source Code Reference

Source code for dependencies is available in `opensrc/` for deeper understanding of implementation details.

See `opensrc/sources.json` for the list of available packages and their versions.

Use this source code when you need to understand how a package works internally, not just its types/interface.

### Fetching Additional Source Code

To fetch source code for a package or repository you need to understand, run:

```bash
npx opensrc <package>           # npm package (e.g., npx opensrc zod)
npx opensrc pypi:<package>      # Python package (e.g., npx opensrc pypi:requests)
npx opensrc crates:<package>    # Rust crate (e.g., npx opensrc crates:serde)
npx opensrc <owner>/<repo>      # GitHub repo (e.g., npx opensrc vercel/ai)
```

<!-- opensrc:end -->
