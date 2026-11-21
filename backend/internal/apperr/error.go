// Package apperr carries domain errors that the HTTP layer maps to JSON.
package apperr

import "fmt"

// Error is a stable, machine-readable failure of a calculation or request.
type Error struct {
	Code    string
	Message string
}

func (e *Error) Error() string {
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

// E builds a domain error.
func E(code, message string) *Error {
	return &Error{Code: code, Message: message}
}
