# Contributing to mdts

Thanks for your interest in contributing to **mdts**!  
This project aims to be a simple, fast, and useful tool for working with Markdown files — especially for those building LLM workflows or documentation pipelines.

All kinds of contributions are welcome: bug reports, ideas, code changes, or even just feedback.

## Getting Started

Clone the repo and install dependencies:

```
git clone https://github.com/unhappychoice/mdts.git
cd mdts
bun install
cd packages/frontend
bun install
```

The project uses [Bun](https://bun.sh) for dependency management and builds. Jest is
executed with Node.js, so Node 24+ must also be available.

mdts is written in TypeScript. You'll find the source in `src/`, and tests in `test/`.

Handy commands:

### Run 
``` 
bun run dev            # Watch mode for development
bun run start          # Build and run
```

### Test and lint
```
bun run watch          # Run tests and lints automatically
bun run watch:frontend # Run tests and lints automatically
bun run test           # Run tests
bun run test:frontend  # Run frontend tests
bun run lint           # Run lint and format check
bun run lint:frontend  # Run frontend lint and format check
```

## Contribution Guidelines

### Issues

- Bug reports are helpful — please include reproduction steps if possible.
- Feature suggestions are also welcome, especially if you can describe the use case.

### Pull Requests

Before opening a PR:

- Run lint and tests:

```
bun run lint
bun run lint:frontend
bun run test
bun run test:frontend
```

- Keep changes minimal and focused. Small, clear PRs are easier to review.
- If you're adding a new feature, try to update the relevant documentation as well.
- English is preferred for code comments, but it's not a strict rule.

### Philosophy

mdts is designed to be:

- Static: input → output with no surprises
- Fast: minimal dependencies, quick execution
- Markdown-first: results should be readable in any Markdown viewer

We’re not trying to be everything to everyone — just a solid CLI tool for working with Markdown and embedded code blocks.

## Contact

Maintained by [@unhappychoice](https://github.com/unhappychoice).  
If you’ve built something cool with mdts, or have an idea to share, we'd love to hear it!

---

Happy hacking! 🚀
