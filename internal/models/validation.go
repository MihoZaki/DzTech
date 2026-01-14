package models

import "github.com/go-playground/validator/v10"

// Global validator instance for the models package
var validate *validator.Validate

func init() {
	validate = validator.New()
}
