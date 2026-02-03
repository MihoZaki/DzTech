package services

import "errors"

// Sentinel errors for ProductService
var (
	ErrProductNotFound   = errors.New("product not found")
	ErrCategoryNotFound  = errors.New("category not found")
	ErrInsufficientStock = errors.New("insufficient stock")
	// Add more as needed, e.g., ErrUserNotFound, ErrInsufficientStock, etc.
)

// Custom error types can also carry more context if needed
type NotFoundError struct {
	Entity string
	ID     string // Or uuid.UUID, depending on context
}

func (e NotFoundError) Error() string {
	return e.Entity + " not found with ID: " + e.ID
}

func IsNotFoundError(err error) bool {
	var target NotFoundError
	return errors.As(err, &target)
}

// Or use errors.Is with sentinel errors
func IsProductNotFound(err error) bool {
	return errors.Is(err, ErrProductNotFound)
}

func IsCategoryNotFound(err error) bool {
	return errors.Is(err, ErrCategoryNotFound)
}
