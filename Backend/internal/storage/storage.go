package storage

import "context"

// Storage define las operaciones sobre archivos del sistema.
// LocalStorage implementa esta interfaz usando el disco local.
// En producción se puede reemplazar por S3, R2, etc. sin tocar los services.
type Storage interface {
	Save(ctx context.Context, subdir, filename string, data []byte) (url string, err error)
	Delete(ctx context.Context, url string) error
	Read(ctx context.Context, url string) (data []byte, err error)
}
