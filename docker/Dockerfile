FROM oven/bun:latest

# mdts uses git for file status and diffs; the Bun image does not ship git.
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*
