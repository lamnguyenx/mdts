.PHONY: all install frontend backend

all: backend frontend install

install: all
	npm install -g .

frontend:
	npm run build:frontend

backend:
	npm run build
