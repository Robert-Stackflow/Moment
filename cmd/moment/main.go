package main

import (
	"context"
	"flag"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	_ "time/tzdata"

	"github.com/Robert-Stackflow/Moment/internal/moment"
)

func main() {
	data := flag.String("data", env("MOMENT_DATA_DIR", "data"), "data directory")
	addr := flag.String("addr", env("MOMENT_ADDR", ":9999"), "HTTP listen address")
	dist := flag.String("dist", env("MOMENT_DIST_DIR", "dist"), "frontend directory")
	flag.Parse()
	app, err := moment.Open(*data, *dist, os.Getenv("MOMENT_COOKIE_SECURE") == "true")
	if err != nil {
		log.Fatal(err)
	}
	defer app.Close()
	server := &http.Server{Addr: *addr, Handler: app.Router(), ReadHeaderTimeout: 10 * time.Second, ReadTimeout: 5 * time.Minute, WriteTimeout: 5 * time.Minute, IdleTimeout: 60 * time.Second, MaxHeaderBytes: 1 << 20}
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-ctx.Done()
		timeout, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		_ = server.Shutdown(timeout)
	}()
	log.Printf("Moment listening on %s", *addr)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
