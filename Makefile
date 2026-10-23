.PHONY: all install deps hotload frontend backend clean

# `make` builds everything and installs the CLI globally.
all: install

install: backend frontend
	bun install -g .

# Install dependencies for both the root and the frontend package.
deps:
	bun install
	cd packages/frontend && bun install

hotload: backend frontend
	bun link

frontend:
	@if [ ! -d packages/frontend/node_modules ]; then \
		echo "Installing frontend dependencies..."; \
		cd packages/frontend && bun install; \
	fi
	bun run build:frontend

backend:
	bun run build

clean:
	rm -rf dist
