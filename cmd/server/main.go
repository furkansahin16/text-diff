package main

import (
	"flag"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"
)

func main() {
	addr := flag.String("addr", ":8080", "HTTP listen address")
	webDir := flag.String("web", "web", "static web directory")
	flag.Parse()
	version := envOrDefault("VERSION", "dev")

	absWebDir, err := filepath.Abs(*webDir)
	if err != nil {
		log.Fatalf("resolve web directory: %v", err)
	}

	if info, err := os.Stat(absWebDir); err != nil || !info.IsDir() {
		log.Fatalf("web directory not found: %s", absWebDir)
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("X-App-Version", version)
		_, _ = w.Write([]byte("ok " + version + "\n"))
	})
	mux.Handle("GET /", cacheHeaders(http.FileServer(http.Dir(absWebDir))))

	server := &http.Server{
		Addr:              *addr,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("text-diff %s listening on %s", version, *addr)
	log.Printf("serving static files from %s", absWebDir)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func envOrDefault(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}

	return value
}

func cacheHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/" || r.URL.Path == "/index.html" {
			w.Header().Set("Cache-Control", "no-cache")
		} else {
			w.Header().Set("Cache-Control", "public, max-age=3600")
		}

		next.ServeHTTP(w, r)
	})
}
