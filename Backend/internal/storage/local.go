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
	dir := filepath.Join(s.basePath, subdir)

	if err := s.assertInsideBase(dir); err != nil {
		return "", err
	}

	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}

	destPath := filepath.Join(dir, filename)
	if err := s.assertInsideBase(destPath); err != nil {
		return "", err
	}

	if err := os.WriteFile(destPath, data, 0644); err != nil {
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
