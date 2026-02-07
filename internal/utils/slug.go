package utils

import (
	"github.com/gosimple/slug"
)

// GenerateSlug creates a URL-friendly slug from an input string.
// It converts the input to lowercase, replaces spaces with hyphens,
// removes special characters, etc.
// Example: "AMD Ryzen 9 7950X" -> "amd-ryzen-9-7950x"
func GenerateSlug(input string) string {
	return slug.Make(input)
}
