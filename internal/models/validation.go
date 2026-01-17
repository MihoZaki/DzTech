package models

import "github.com/go-playground/validator/v10"

// Global validator instance for the models package
var Validate *validator.Validate

type Validator interface {
	Validate() error
}

func init() {
	Validate = validator.New()
}
