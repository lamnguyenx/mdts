.PHONY: all install hotload frontend backend

all: backend frontend install

hotload: backend frontend
	npm link

install: all
	npm install -g .

frontend:
	npm run build:frontend

backend:
	npm run build
