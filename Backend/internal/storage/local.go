package storage

import (
	"context"
	"errors"
	"os"
	"path/filepath"
	"strings"
)

type LocalStorage struct {
	basePath string // ej: "./uploads"
	baseURL  string // ej: "/uploads"
}

func NewLocalStorage(basePath, baseURL string) *LocalStorage {
	return &LocalStorage{basePath: basePath, baseURL: baseURL}
}

func (s *LocalStorage) Save(_ context.Context, subdir, filename string, data []byte) (string, error) {
	// filename es un NOMBRE, no un path. assertInsideBase solo garantiza que
	// el resultado caiga dentro de basePath, y un ".." en el nombre se queda
	// adentro: Join(base/dni, "../avatars/x.png") da base/avatars/x.png, que
	// pasa el chequeo. Hoy no es explotable (el nombre es un UUID del servidor
	// mas una extension de un map fijo), pero /uploads/avatars se sirve
	// publico, asi que un nombre con ".." seria escribir en un directorio
	// publico desde una subida privada.
	if filename == "" || filename == "." || filename == ".." || strings.ContainsAny(filename, `/\`) {
		return "", errors.New("nombre de archivo invalido")
	}

	dir := filepath.Join(s.basePath, subdir)

	if err := s.assertInsideBase(dir); err != nil {
		return "", err
	}

	// 0700 y no 0755: aca van fotos de DNI de alumnos, en su mayoria menores.
	// MkdirAll no toca los permisos de un directorio que ya existe, asi que si
	// el directorio se creo antes con 0755 hay que cerrarlo a mano una vez.
	if err := os.MkdirAll(dir, 0700); err != nil {
		return "", err
	}

	destPath := filepath.Join(dir, filename)
	if err := s.assertInsideBase(destPath); err != nil {
		return "", err
	}

	// 0600: el unico que necesita leerlos es este proceso (UID 1000), que es
	// el que los escribio. Caddy no toca el disco, hace reverse_proxy de
	// /uploads/* hacia aca, y los avatares los sirve este mismo proceso.
	if err := os.WriteFile(destPath, data, 0600); err != nil {
		return "", err
	}

	return s.baseURL + "/" + subdir + "/" + filename, nil
}

func (s *LocalStorage) Read(_ context.Context, url string) ([]byte, error) {
	rel := strings.TrimPrefix(url, s.baseURL)
	fullPath := filepath.Join(s.basePath, filepath.FromSlash(rel))

	if err := s.assertInsideBase(fullPath); err != nil {
		return nil, err
	}

	return os.ReadFile(fullPath)
}

func (s *LocalStorage) Delete(_ context.Context, url string) error {
	rel := strings.TrimPrefix(url, s.baseURL)
	fullPath := filepath.Join(s.basePath, filepath.FromSlash(rel))

	if err := s.assertInsideBase(fullPath); err != nil {
		return err
	}

	err := os.Remove(fullPath)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return nil
}

// assertInsideBase verifica que el path resuelto esté dentro de basePath.
func (s *LocalStorage) assertInsideBase(path string) error {
	absBase, err := filepath.Abs(s.basePath)
	if err != nil {
		return err
	}
	absPath, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	if !strings.HasPrefix(absPath, absBase+string(filepath.Separator)) {
		return errors.New("path fuera del directorio permitido")
	}
	return nil
}
