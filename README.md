# Text Diff

A minimal, private, client-side text diff web app served by a lightweight Go server.

## Features

- Side-by-side text comparison.
- Client-side diffing; text is not uploaded to the server.
- Up to 20,000 lines per side.
- Light and dark themes.
- Responsive, Apple-inspired interface.

## Run Locally

```bash
go run ./cmd/server
```

Open `http://localhost:8080`.

Optional flags:

```bash
go run ./cmd/server -addr :3000 -web web
```

## Build

```bash
go build -o bin/text-diff ./cmd/server
```

## Test

```bash
go test ./...
npm run test:js
```

## Health Check

```bash
curl http://localhost:8080/healthz
```

## Docker

Build locally:

```bash
docker build -t text-diff:local .
```

Run locally:

```bash
docker run --rm -p 8080:8080 -e VERSION=local text-diff:local
```

Production with Compose:

```bash
TEXT_DIFF_VERSION=v0.1.0 docker compose up -d
```

The Compose file expects images published as `ghcr.io/furkansahin16/text-diff:<tag>`.
