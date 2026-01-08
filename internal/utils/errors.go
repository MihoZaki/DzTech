package utils

import (
	"encoding/json"
	"log/slog"
	"net/http"
)

type ErrorResponse struct {
	Type     string                 `json:"type"`
	Title    string                 `json:"title"`
	Status   int                    `json:"status"`
	Detail   string                 `json:"detail"`
	Instance string                 `json:"instance,omitempty"`
	Errors   map[string]interface{} `json:"errors,omitempty"`
}

func SendErrorResponse(w http.ResponseWriter, status int, title, detail string) {
	resp := ErrorResponse{
		Type:   "https://techstore.dev/errors/" + getStatusType(status),
		Title:  title,
		Status: status,
		Detail: detail,
	}

	slog.Warn("Sending error response",
		"status", status,
		"title", title,
		"detail", detail,
	)

	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(resp)
}

func SendValidationError(w http.ResponseWriter, fieldErrors map[string]string) {
	resp := ErrorResponse{
		Type:   "https://techstore.dev/errors/validation-error",
		Title:  "Validation Error",
		Status: http.StatusBadRequest,
		Detail: "One or more fields failed validation",
		Errors: make(map[string]interface{}),
	}

	for field, message := range fieldErrors {
		resp.Errors[field] = map[string]string{"reason": message}
	}

	slog.Warn("Sending validation error response",
		"field_errors", fieldErrors,
	)

	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(resp)
}

func getStatusType(status int) string {
	switch status {
	case http.StatusBadRequest:
		return "bad-request"
	case http.StatusUnauthorized:
		return "unauthorized"
	case http.StatusForbidden:
		return "forbidden"
	case http.StatusNotFound:
		return "not-found"
	case http.StatusConflict:
		return "conflict"
	case http.StatusUnprocessableEntity:
		return "unprocessable-entity"
	default:
		return "server-error"
	}
}
