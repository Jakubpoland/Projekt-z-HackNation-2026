package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

func TestHealthAndSimulateRoundTrip(t *testing.T) {
	srv := New(params.NewStore(params.Default()))
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/v1/health", nil))
	if rec.Code != http.StatusOK {
		t.Fatalf("health %d", rec.Code)
	}

	body := []byte(`{
		"situation":"birth",
		"childCount":1,
		"insuredOnEvent":true,
		"mother":{"hasRight":true,"title":"employee","basisGrosze":1000000,"payerInsuredCount":25},
		"father":{"hasRight":true,"title":"employee","basisGrosze":800000,"payerInsuredCount":5}
	}`)
	rec = httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculations/simulate", bytes.NewReader(body))
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("simulate %d %s", rec.Code, rec.Body.String())
	}
	var payload struct {
		GrandTotal struct {
			Zloty string `json:"zloty"`
		} `json:"grandTotal"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatal(err)
	}
	if payload.GrandTotal.Zloty != "46666.20" {
		t.Fatalf("total %s", payload.GrandTotal.Zloty)
	}
}

func TestAdminRejectsBrokenRate(t *testing.T) {
	srv := New(params.NewStore(params.Default()))
	p := params.Default()
	p.MaternityRateBps = 20000
	raw, _ := json.Marshal(p)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPut, "/api/v1/admin/parameters", bytes.NewReader(raw))
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusUnprocessableEntity {
		t.Fatalf("status %d %s", rec.Code, rec.Body.String())
	}
}

func TestUnknownFieldIsRejected(t *testing.T) {
	srv := New(params.NewStore(params.Default()))
	raw := []byte(`{"kind":"employee","mode":"first_month","contractMonthlyGrosze":100,"extra":1}`)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodPost, "/api/v1/calculations/basis", bytes.NewReader(raw))
	srv.Handler().ServeHTTP(rec, req)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("status %d", rec.Code)
	}
}
