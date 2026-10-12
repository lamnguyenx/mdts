.PHONY: all install deps hotload frontend backend clean

# `make` builds everything and installs the CLI globally.
all: install

install: backend frontend
	npm install -g .

# Install dependencies for both the root and the frontend package.
deps:
	npm install
	cd packages/frontend && npm install

hotload: backend frontend
	npm link

frontend:
	@if [ ! -d packages/frontend/node_modules ]; then \
		echo "Installing frontend dependencies..."; \
		cd packages/frontend && npm install; \
	fi
	npm run build:frontend

backend:
	npm run build

clean:
	rm -rf dist
