package handlers

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

/*
Tests de readValidatedUpload.

Vale la pena tenerlos porque este helper es el punto UNICO del que dependen los
cuatro puntos de subida (comprobante, DNI del admin, DNI del registro, avatar):
si se rompe, se rompen los cuatro a la vez, y uno de ellos maneja fotos de
documentos de identidad.
*/

// Cabeceras reales de cada formato: http.DetectContentType mira los primeros
// bytes del contenido, asi que con la firma alcanza para que los reconozca.
var (
	pngBytes  = append([]byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A}, bytes.Repeat([]byte{0}, 64)...)
	pdfBytes  = append([]byte("%PDF-1.4\n"), bytes.Repeat([]byte("x"), 64)...)
	htmlBytes = []byte("<html><script>alert(1)</script></html>")
)

func uploadCtx(t *testing.T, field, filename string, content []byte) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()

	var body bytes.Buffer
	w := multipart.NewWriter(&body)
	fw, err := w.CreateFormFile(field, filename)
	if err != nil {
		t.Fatalf("armar multipart: %v", err)
	}
	if _, err := fw.Write(content); err != nil {
		t.Fatalf("escribir contenido: %v", err)
	}
	w.Close()

	rec := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(rec)
	c.Request = httptest.NewRequest(http.MethodPost, "/", &body)
	c.Request.Header.Set("Content-Type", w.FormDataContentType())
	return c, rec
}

func TestReadValidatedUpload(t *testing.T) {
	gin.SetMode(gin.TestMode)

	const max int64 = 1 << 20

	cases := []struct {
		name     string
		field    string // campo que manda el cliente
		filename string
		content  []byte
		allowed  map[string]string
		wantOK   bool
		wantExt  string
		wantCode int
	}{
		{
			name: "PNG valido", field: "file", filename: "dni.png", content: pngBytes,
			allowed: docUploadTypes, wantOK: true, wantExt: ".png",
		},
		{
			name: "PDF valido como documento", field: "file", filename: "comprobante.pdf", content: pdfBytes,
			allowed: docUploadTypes, wantOK: true, wantExt: ".pdf",
		},
		{
			// El agujero de M5-01: antes esto se guardaba como DNI.
			name: "HTML rechazado", field: "file", filename: "dni.html", content: htmlBytes,
			allowed: docUploadTypes, wantOK: false, wantCode: http.StatusBadRequest,
		},
		{
			// Valida el CONTENIDO, no el nombre: el .png no lo salva.
			name: "HTML disfrazado de PNG rechazado", field: "file", filename: "dni.png", content: htmlBytes,
			allowed: docUploadTypes, wantOK: false, wantCode: http.StatusBadRequest,
		},
		{
			// M5-10: la extension sale del tipo detectado, no del nombre.
			name: "PNG con nombre .html se guarda como .png", field: "file", filename: "truco.html", content: pngBytes,
			allowed: docUploadTypes, wantOK: true, wantExt: ".png",
		},
		{
			// El avatar usa un set sin PDF.
			name: "PDF rechazado como imagen", field: "file", filename: "foto.pdf", content: pdfBytes,
			allowed: imageUploadTypes, wantOK: false, wantCode: http.StatusBadRequest,
		},
		{
			name: "campo ausente", field: "otro", filename: "x.png", content: pngBytes,
			allowed: docUploadTypes, wantOK: false, wantCode: http.StatusBadRequest,
		},
		{
			// M1-10: se corta por tamano antes de cargarlo entero en memoria.
			name: "archivo demasiado grande", field: "file", filename: "grande.png",
			content: append(pngBytes, bytes.Repeat([]byte("x"), int(max)+1)...),
			allowed: docUploadTypes, wantOK: false, wantCode: http.StatusBadRequest,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c, rec := uploadCtx(t, "file", tc.filename, tc.content)

			data, ext, ok := readValidatedUpload(c, tc.field, "el archivo", max, tc.allowed)

			if ok != tc.wantOK {
				t.Fatalf("ok = %v, se esperaba %v (respuesta: %s)", ok, tc.wantOK, rec.Body.String())
			}
			if !tc.wantOK {
				if rec.Code != tc.wantCode {
					t.Fatalf("HTTP = %d, se esperaba %d", rec.Code, tc.wantCode)
				}
				return
			}
			if ext != tc.wantExt {
				t.Fatalf("ext = %q, se esperaba %q", ext, tc.wantExt)
			}
			if len(data) == 0 {
				t.Fatal("devolvio contenido vacio")
			}
		})
	}
}
