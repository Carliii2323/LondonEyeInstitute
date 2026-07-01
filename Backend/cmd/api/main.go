package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"sge-london-eye/internal/config"
	"sge-london-eye/internal/cron"
	"sge-london-eye/internal/db"
	"sge-london-eye/internal/server"
	"sge-london-eye/internal/services"
	"sge-london-eye/internal/storage"
)

func main() {
	cfg := config.Load()

	if cfg.JWTSecret == "" {
		log.Fatal("JWT_SECRET es obligatorio")
	}

	pool, err := db.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("no se pudo conectar a la base de datos: %v", err)
	}
	defer pool.Close()

	// Composition root: services que necesitan los jobs de cron
	store := storage.NewLocalStorage(cfg.StoragePath, "/uploads")
	runner := cron.NewRunner(
		services.NewPaymentService(pool, store),
		services.NewAuthService(pool, cfg),
	)
	cronInstance := runner.Start()
	defer cronInstance.Stop()

	srv := server.New(cfg, pool, runner)

	go func() {
		if err := srv.Run(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("error inesperado del servidor: %v", err)
		}
	}()

	log.Printf("servidor corriendo en :%s (entorno: %s)", cfg.Port, cfg.Env)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("apagando servidor...")
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("error al apagar el servidor: %v", err)
	}
}
