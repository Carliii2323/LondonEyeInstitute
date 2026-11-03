package storage

import (
	"context"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func nuevo(t *testing.T) *LocalStorage {
	t.Helper()
	return NewLocalStorage(t.TempDir(), "/uploads")
}

func TestSaveGuardaYDevuelveURL(t *testing.T) {
	s := nuevo(t)
	url, err := s.Save(context.Background(), "dni", "123.png", []byte("contenido"))
	if err != nil {
		t.Fatalf("Save fallo: %v", err)
	}
	if url != "/uploads/dni/123.png" {
		t.Errorf("url = %q, se esperaba /uploads/dni/123.png", url)
	}

	datos, err := s.Read(context.Background(), url)
	if err != nil {
		t.Fatalf("Read fallo: %v", err)
	}
	if string(datos) != "contenido" {
		t.Errorf("leido = %q, se esperaba \"contenido\"", datos)
	}
}

// Los DNI son documentos de identidad de menores. Si alguien baja estos
// permisos, el chmod que se hace a mano en el servidor deja de servir: cada
// archivo nuevo vuelve a nacer legible por todo el mundo.
func TestSavePermisosCerrados(t *testing.T) {
	if runtime.GOOS == "windows" {
		t.Skip("Windows no respeta los modos de archivo de Unix")
	}

	base := t.TempDir()
	s := NewLocalStorage(base, "/uploads")
	if _, err := s.Save(context.Background(), "dni", "123.png", []byte("x")); err != nil {
		t.Fatalf("Save fallo: %v", err)
	}

	dir, err := os.Stat(filepath.Join(base, "dni"))
	if err != nil {
		t.Fatalf("stat del directorio: %v", err)
	}
	if got := dir.Mode().Perm(); got != 0o700 {
		t.Errorf("permisos del directorio = %04o, se esperaba 0700", got)
	}

	archivo, err := os.Stat(filepath.Join(base, "dni", "123.png"))
	if err != nil {
		t.Fatalf("stat del archivo: %v", err)
	}
	if got := archivo.Mode().Perm(); got != 0o600 {
		t.Errorf("permisos del archivo = %04o, se esperaba 0600", got)
	}
}

// assertInsideBase es un control de seguridad: sin el, un subdir o un nombre
// de archivo con ".." escribe donde quiera del disco.
func TestSaveRechazaPathTraversal(t *testing.T) {
	casos := []struct {
		nombre   string
		subdir   string
		filename string
		// crear son directorios que ya existen antes del intento. Sin esto el
		// caso del directorio publico "pasa" por el motivo equivocado: falla
		// con ENOENT porque base/avatars no existe, no porque se valide el
		// nombre. En produccion ese directorio existe apenas alguien suba un
		// avatar, y entonces la escritura funcionaria.
		crear []string
	}{
		{"subdir sube un nivel", "..", "x.png", nil},
		{"subdir sube varios", "../../etc", "passwd", nil},
		{"filename sube un nivel", "dni", "../x.png", nil},
		{"filename sube varios", "dni", "../../../x.png", nil},
		// El caso que de verdad importa: /uploads/avatars se sirve publico y
		// las subidas de DNI no. Sin el guard, Join lo deja en base/avatars.
		{"filename salta al directorio publico", "dni", "../avatars/colado.png", []string{"avatars"}},
		{"filename con separador", "dni", "avatars/colado.png", nil},
		{"filename vacio", "dni", "", nil},
		{"filename es un punto", "dni", ".", nil},
	}

	for _, c := range casos {
		t.Run(c.nombre, func(t *testing.T) {
			base := t.TempDir()
			s := NewLocalStorage(base, "/uploads")
			for _, d := range c.crear {
				if err := os.MkdirAll(filepath.Join(base, d), 0o700); err != nil {
					t.Fatalf("preparando %s: %v", d, err)
				}
			}

			if _, err := s.Save(context.Background(), c.subdir, c.filename, []byte("x")); err == nil {
				t.Fatal("Save acepto un nombre que sale del subdirectorio pedido")
			}

			// Y que no haya dejado nada escrito afuera.
			padre := filepath.Dir(base)
			entradas, err := os.ReadDir(padre)
			if err != nil {
				t.Fatalf("ReadDir del padre: %v", err)
			}
			for _, e := range entradas {
				if strings.Contains(e.Name(), "x.png") || e.Name() == "passwd" {
					t.Errorf("se escribio %q fuera del directorio base", e.Name())
				}
			}

			// Y que no haya quedado nada en la raiz de la base ni en avatars.
			adentro, err := os.ReadDir(base)
			if err != nil {
				t.Fatalf("ReadDir de la base: %v", err)
			}
			permitidos := map[string]bool{"dni": true}
			for _, d := range c.crear {
				permitidos[d] = true
			}
			for _, e := range adentro {
				if !permitidos[e.Name()] {
					t.Errorf("se creo %q en la base, fuera del subdir pedido", e.Name())
				}
			}

			for _, d := range c.crear {
				colados, err := os.ReadDir(filepath.Join(base, d))
				if err != nil {
					t.Fatalf("ReadDir de %s: %v", d, err)
				}
				if len(colados) != 0 {
					t.Errorf("se escribieron %d archivos en %s/, que es publico", len(colados), d)
				}
			}
		})
	}
}

func TestReadRechazaPathTraversal(t *testing.T) {
	base := t.TempDir()
	s := NewLocalStorage(base, "/uploads")

	if _, err := s.Read(context.Background(), "/uploads/../../../etc/passwd"); err == nil {
		t.Error("Read acepto un path fuera del directorio base")
	}
}

func TestDeleteRechazaPathTraversal(t *testing.T) {
	base := t.TempDir()
	s := NewLocalStorage(base, "/uploads")

	if err := s.Delete(context.Background(), "/uploads/../../../etc/passwd"); err == nil {
		t.Error("Delete acepto un path fuera del directorio base")
	}
}

// Borrar algo que no existe no es un error: el alta de alumno llama a Delete
// para limpiar el archivo anterior, que puede no haber existido nunca.
func TestDeleteInexistenteNoFalla(t *testing.T) {
	s := nuevo(t)
	if err := s.Delete(context.Background(), "/uploads/dni/no-existe.png"); err != nil {
		t.Errorf("Delete de un archivo inexistente devolvio error: %v", err)
	}
}
