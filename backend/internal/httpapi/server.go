// Package httpapi exposes the benefit core over JSON.
package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"time"

	"github.com/Jakubpoland/ZUS/backend/internal/apperr"
	"github.com/Jakubpoland/ZUS/backend/internal/basis"
	"github.com/Jakubpoland/ZUS/backend/internal/maternity"
	"github.com/Jakubpoland/ZUS/backend/internal/params"
	"github.com/Jakubpoland/ZUS/backend/internal/sickness"
)

// Server is the HTTP adapter. It has no database.
type Server struct {
	store *params.Store
	mux   *http.ServeMux
}

// New wires the routes to the parameter store.
func New(store *params.Store) *Server {
	s := &Server{store: store, mux: http.NewServeMux()}
	s.mux.HandleFunc("GET /api/v1/health", s.health)
	s.mux.HandleFunc("GET /api/v1/parameters", s.getParameters)
	s.mux.HandleFunc("PUT /api/v1/admin/parameters", s.putParameters)
	s.mux.HandleFunc("GET /api/v1/catalog", s.catalog)
	s.mux.HandleFunc("POST /api/v1/calculations/simulate", s.simulate)
	s.mux.HandleFunc("POST /api/v1/calculations/basis", s.basis)
	s.mux.HandleFunc("POST /api/v1/calculations/sickness", s.sickness)
	return s
}

// Handler is the root handler, with CORS for the Next.js app on the other laptop.
func (s *Server) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		s.mux.ServeHTTP(w, r)
	})
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":            "ok",
		"parametersVersion": s.store.Get().Version,
		"time":              time.Now().UTC().Format(time.RFC3339),
	})
}

func (s *Server) getParameters(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Get())
}

func (s *Server) putParameters(w http.ResponseWriter, r *http.Request) {
	var body params.Parameters
	if err := decode(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "JSON", err.Error())
		return
	}
	if err := s.store.Put(body); err != nil {
		writeDomain(w, err)
		return
	}
	writeJSON(w, http.StatusOK, s.store.Get())
}

func (s *Server) catalog(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, params.BuildCatalog(s.store.Get()))
}

func (s *Server) simulate(w http.ResponseWriter, r *http.Request) {
	var body maternity.Input
	if err := decode(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "JSON", err.Error())
		return
	}
	result, err := maternity.Simulate(s.store.Get(), body)
	if err != nil {
		writeDomain(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) basis(w http.ResponseWriter, r *http.Request) {
	var body basis.Input
	if err := decode(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "JSON", err.Error())
		return
	}
	result, err := basis.Calculate(s.store.Get(), body)
	if err != nil {
		writeDomain(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func (s *Server) sickness(w http.ResponseWriter, r *http.Request) {
	var body sickness.Input
	if err := decode(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "JSON", err.Error())
		return
	}
	result, err := sickness.Calculate(s.store.Get(), body)
	if err != nil {
		writeDomain(w, err)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

func decode(r *http.Request, dst any) error {
	defer r.Body.Close()
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return err
	}
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		return errors.New("żądanie może zawierać tylko jeden obiekt JSON")
	}
	return nil
}

func writeDomain(w http.ResponseWriter, err error) {
	var domain *apperr.Error
	if errors.As(err, &domain) {
		writeError(w, http.StatusUnprocessableEntity, domain.Code, domain.Message)
		return
	}
	writeError(w, http.StatusInternalServerError, "INTERNAL", "Nieoczekiwany błąd obliczeń.")
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{"code": code, "message": message},
	})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
