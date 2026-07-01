package services

import (
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgtype"
)

func Test_addMoney(t *testing.T) {
	cases := []struct {
		name string
		a, b string
		want string
	}{
		{"clásico de float 0.10+0.20", "0.10", "0.20", "0.30"},
		{"cuota + recargo", "5000.00", "500.00", "5500.00"},
		{"con decimales", "7367.50", "736.75", "8104.25"},
		{"cero + cero", "0", "0", "0.00"},
		{"entero + cero", "9200", "0.00", "9200.00"},
		{"a inválido → 0.00", "abc", "10", "0.00"},
		{"b inválido → 0.00", "10", "xyz", "0.00"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := addMoney(c.a, c.b); got != c.want {
				t.Errorf("addMoney(%q,%q) = %q; want %q", c.a, c.b, got, c.want)
			}
		})
	}
}

func Test_buildDueDate(t *testing.T) {
	cases := []struct {
		name             string
		year             int
		month            time.Month
		dueDay           int
		wantY, wantM, wantD int
	}{
		{"día 31 en febrero no bisiesto → 28", 2026, time.February, 31, 2026, 2, 28},
		{"día 31 en febrero bisiesto → 29", 2024, time.February, 31, 2024, 2, 29},
		{"día 31 en abril (30 días) → 30", 2026, time.April, 31, 2026, 4, 30},
		{"día normal sin cap", 2026, time.May, 10, 2026, 5, 10},
		{"día 31 en mayo (31 días) → 31", 2026, time.May, 31, 2026, 5, 31},
		{"día 1", 2026, time.July, 1, 2026, 7, 1},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := buildDueDate(c.year, c.month, c.dueDay)
			if got.Year() != c.wantY || int(got.Month()) != c.wantM || got.Day() != c.wantD {
				t.Errorf("buildDueDate(%d,%v,%d) = %04d-%02d-%02d; want %04d-%02d-%02d",
					c.year, c.month, c.dueDay, got.Year(), got.Month(), got.Day(), c.wantY, c.wantM, c.wantD)
			}
		})
	}
}

func Test_isNoPaymentMonth(t *testing.T) {
	cases := []struct {
		name   string
		month  int
		months []int32
		want   bool
	}{
		{"julio en {7}", 7, []int32{7}, true},
		{"junio en {7}", 6, []int32{7}, false},
		{"array vacío", 7, []int32{}, false},
		{"enero en {1,7}", 1, []int32{1, 7}, true},
		{"diciembre en {1,7}", 12, []int32{1, 7}, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := isNoPaymentMonth(c.month, c.months); got != c.want {
				t.Errorf("isNoPaymentMonth(%d,%v) = %v; want %v", c.month, c.months, got, c.want)
			}
		})
	}
}

func Test_validateLateFeeValue(t *testing.T) {
	cases := []struct {
		name    string
		value   string
		kind    string
		wantErr bool
	}{
		{"porcentaje 10 ok", "10", "porcentaje", false},
		{"porcentaje 100 ok (límite)", "100", "porcentaje", false},
		{"porcentaje 150 error", "150", "porcentaje", true},
		{"porcentaje 0 ok", "0", "porcentaje", false},
		{"negativo error", "-5", "porcentaje", true},
		{"fijo grande ok (sin tope)", "5000", "fijo", false},
		{"fijo 101 ok (no aplica tope)", "101", "fijo", false},
		{"no numérico error", "abc", "fijo", true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			err := validateLateFeeValue(c.value, c.kind)
			if (err != nil) != c.wantErr {
				t.Errorf("validateLateFeeValue(%q,%q) err=%v; wantErr=%v", c.value, c.kind, err, c.wantErr)
			}
		})
	}
}

func Test_dedupeMonths(t *testing.T) {
	cases := []struct {
		name    string
		in      []int
		want    []int32
		wantErr bool
	}{
		{"vacío ok", []int{}, []int32{}, false},
		{"válido ordenado", []int{1, 7}, []int32{1, 7}, false},
		{"válido orden mezclado (preserva orden)", []int{7, 1}, []int32{7, 1}, false},
		{"duplicado error", []int{7, 7}, nil, true},
		{"fuera de rango alto error", []int{13}, nil, true},
		{"fuera de rango bajo error", []int{0}, nil, true},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got, err := dedupeMonths(c.in)
			if (err != nil) != c.wantErr {
				t.Fatalf("dedupeMonths(%v) err=%v; wantErr=%v", c.in, err, c.wantErr)
			}
			if c.wantErr {
				return
			}
			if len(got) != len(c.want) {
				t.Fatalf("dedupeMonths(%v) = %v; want %v", c.in, got, c.want)
			}
			for i := range got {
				if got[i] != c.want[i] {
					t.Errorf("dedupeMonths(%v)[%d] = %d; want %d", c.in, i, got[i], c.want[i])
				}
			}
		})
	}
}

func Test_timeOfDay_roundtrip(t *testing.T) {
	cases := []struct {
		name      string
		in        string
		wantValid bool
		wantStr   string // resultado de timeToString tras parsear
	}{
		{"18:00", "18:00", true, "18:00"},
		{"medianoche", "00:00", true, "00:00"},
		{"fin del día", "23:59", true, "23:59"},
		{"vacío → NULL", "", false, ""},
		{"hora fuera de rango", "25:00", false, ""},
		{"minuto fuera de rango", "18:70", false, ""},
		{"basura", "abc", false, ""},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			parsed := parseTimeOfDay(c.in)
			if parsed.Valid != c.wantValid {
				t.Errorf("parseTimeOfDay(%q).Valid = %v; want %v", c.in, parsed.Valid, c.wantValid)
			}
			if got := timeToString(parsed); got != c.wantStr {
				t.Errorf("timeToString(parseTimeOfDay(%q)) = %q; want %q", c.in, got, c.wantStr)
			}
		})
	}
}

func Test_numericToString(t *testing.T) {
	var valid pgtype.Numeric
	_ = valid.Scan("9200.00")

	cases := []struct {
		name string
		in   pgtype.Numeric
		want string
	}{
		{"valor válido", valid, "9200.00"},
		{"NULL → 0.00", pgtype.Numeric{}, "0.00"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := numericToString(c.in); got != c.want {
				t.Errorf("numericToString() = %q; want %q", got, c.want)
			}
		})
	}
}

func Test_numericToFloat64Ptr(t *testing.T) {
	var grade pgtype.Numeric
	_ = grade.Scan("8.50")

	t.Run("valor válido", func(t *testing.T) {
		got := numericToFloat64Ptr(grade)
		if got == nil || *got != 8.5 {
			t.Errorf("numericToFloat64Ptr(8.50) = %v; want 8.5", got)
		}
	})
	t.Run("NULL → nil", func(t *testing.T) {
		if got := numericToFloat64Ptr(pgtype.Numeric{}); got != nil {
			t.Errorf("numericToFloat64Ptr(NULL) = %v; want nil", got)
		}
	})
}

func Test_isEditableYearAt(t *testing.T) {
	cases := []struct {
		name  string
		now   time.Time
		year  int
		grace int
		want  bool
	}{
		{"año actual siempre", date(2026, 6, 4), 2026, 31, true},
		{"año anterior fuera de enero", date(2026, 6, 4), 2025, 31, false},
		{"año anterior en enero dentro de gracia", date(2027, 1, 15), 2026, 31, true},
		{"año anterior último día de gracia", date(2027, 1, 31), 2026, 31, true},
		{"año anterior en febrero fuera", date(2027, 2, 1), 2026, 31, false},
		{"año anterior en enero pasada la gracia", date(2027, 1, 15), 2026, 10, false},
		{"dos años atrás nunca", date(2026, 6, 4), 2024, 31, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := isEditableYearAt(c.now, c.year, c.grace); got != c.want {
				t.Errorf("isEditableYearAt(%v,%d,%d) = %v; want %v", c.now, c.year, c.grace, got, c.want)
			}
		})
	}
}

func Test_isWithinAttendanceWindowAt(t *testing.T) {
	// editableWindowMonths = 2 → ventana = mes actual + mes anterior completo
	cases := []struct {
		name string
		now  time.Time
		date time.Time
		want bool
	}{
		{"hoy mismo", date(2026, 6, 4), date(2026, 6, 4), true},
		{"mes anterior (1° de mayo)", date(2026, 6, 4), date(2026, 5, 1), true},
		{"último día antes de la ventana", date(2026, 6, 4), date(2026, 4, 30), false},
		{"dos meses atrás", date(2026, 6, 4), date(2026, 3, 1), false},
		{"borde de año: enero ve diciembre", date(2026, 1, 15), date(2025, 12, 15), true},
		{"borde de año: enero no ve noviembre", date(2026, 1, 15), date(2025, 11, 30), false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			if got := isWithinAttendanceWindowAt(c.now, c.date); got != c.want {
				t.Errorf("isWithinAttendanceWindowAt(%v,%v) = %v; want %v", c.now, c.date, got, c.want)
			}
		})
	}
}

// date es un helper para construir fechas en los tests (medianoche UTC).
func date(y, m, d int) time.Time {
	return time.Date(y, time.Month(m), d, 0, 0, 0, 0, time.UTC)
}
