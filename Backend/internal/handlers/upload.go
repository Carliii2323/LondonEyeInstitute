package handlers

import (
	"errors"
	"io"
	"net/http"
	"sort"
	"strconv"
	"strings"

	"sge-london-eye/internal/dto"

	"github.com/gin-gonic/gin"
)

/*
Subidas de archivos — una sola regla para los cuatro puntos de subida
(comprobante de pago, DNI del admin, DNI del registro y avatar).

Antes cada handler tenia su propia copia de la validacion y fueron divergiendo:
el de DNI —el dato mas sensible del sistema— era el unico que NO validaba el
tipo, solo el tamano (hallazgo M5-01).

Que resuelve este helper:

  - M5-01: valida el tipo REAL del archivo. http.DetectContentType mira los
    primeros bytes del contenido, no la extension del nombre ni el
    Content-Type que declara el cliente, que son datos que el cliente elige.

  - M5-10: la extension que se devuelve sale del tipo DETECTADO. Antes se
    usaba filepath.Ext(nombre del cliente), asi que quien subia el archivo
    decidia con que extension quedaba guardado en el disco del servidor.

  - M1-10 (parte): MaxBytesReader corta el cuerpo del pedido ANTES de leerlo
    entero en memoria. Antes el tamano se chequeaba DESPUES del io.ReadAll,
    o sea que el archivo grande ya estaba cargado cuando se lo rechazaba.
*/

// Topes por clase de subida.
const (
	maxDocUploadBytes int64 = 5 << 20 // comprobantes y DNI (un PDF pesa mas que una foto)
	maxAvatarBytes    int64 = 2 << 20 // foto de perfil
)

// multipartOverhead — margen sobre el tope del archivo para los bordes del
// multipart y los demas campos del formulario (el registro manda varios).
const multipartOverhead int64 = 64 << 10

// docUploadTypes — comprobantes y DNI: imagenes o PDF (muchos bancos emiten PDF).
var docUploadTypes = map[string]string{
	"image/jpeg":      ".jpg",
	"image/png":       ".png",
	"image/webp":      ".webp",
	"application/pdf": ".pdf",
}

// imageUploadTypes — avatares: solo imagenes; un PDF no es una foto de perfil.
var imageUploadTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

// limitRequestBody acota el cuerpo del pedido.
//
// Hay que llamarlo ANTES de parsear el formulario: una vez que ShouldBind o
// FormFile leyeron el cuerpo, ponerle el limite no protege nada. Por eso el
// registro (que bindea los campos antes de tocar el archivo) lo llama aparte.
func limitRequestBody(c *gin.Context, maxBytes int64) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes+multipartOverhead)
}

// readValidatedUpload lee el archivo del campo `field` validando tamano y tipo
// real. Devuelve el contenido y la extension CANONICA del tipo detectado.
//
// Si algo falla responde el error al cliente y devuelve ok=false: el handler
// solo tiene que cortar. `label` es como se nombra el archivo en el mensaje
// ("el comprobante", "el frente del DNI").
func readValidatedUpload(c *gin.Context, field, label string, maxBytes int64, allowed map[string]string) ([]byte, string, bool) {
	limitRequestBody(c, maxBytes)

	file, header, err := c.Request.FormFile(field)
	if err != nil {
		if isTooLarge(err) {
			badUpload(c, label+" supera el limite de "+humanMB(maxBytes))
		} else {
			badUpload(c, label+" es obligatorio (campo '"+field+"')")
		}
		return nil, "", false
	}
	defer file.Close()

	// Chequeo barato con lo que declara el multipart, antes de leer nada.
	if header.Size > maxBytes {
		badUpload(c, label+" supera el limite de "+humanMB(maxBytes))
		return nil, "", false
	}

	data, err := io.ReadAll(file)
	if err != nil {
		if isTooLarge(err) {
			badUpload(c, label+" supera el limite de "+humanMB(maxBytes))
			return nil, "", false
		}
		c.JSON(http.StatusInternalServerError, dto.ApiError{Error: "error al leer el archivo"})
		return nil, "", false
	}

	ext, okType := allowed[http.DetectContentType(data)]
	if !okType {
		badUpload(c, label+" tiene un formato no admitido (se aceptan "+formatList(allowed)+")")
		return nil, "", false
	}

	return data, ext, true
}

func isTooLarge(err error) bool {
	var tooBig *http.MaxBytesError
	return errors.As(err, &tooBig)
}

func badUpload(c *gin.Context, msg string) {
	c.JSON(http.StatusBadRequest, dto.ApiError{Error: msg, Code: "INVALID_UPLOAD"})
}

func humanMB(b int64) string {
	return strconv.FormatInt(b/(1<<20), 10) + " MB"
}

// formatList arma "JPG, PDF, PNG, WEBP". Ordenado para que el mensaje sea
// estable (recorrer un map en Go da un orden distinto cada vez).
func formatList(allowed map[string]string) string {
	names := make([]string, 0, len(allowed))
	for _, ext := range allowed {
		names = append(names, strings.ToUpper(strings.TrimPrefix(ext, ".")))
	}
	sort.Strings(names)
	return strings.Join(names, ", ")
}
