package models

import (
	"context" // Import context package
)

type ContextUserKey string
const ContextKeyUser ContextUserKey = "user"

func GetUserFromContext(ctx context.Context) (*User, bool) {
	// Retrieve the value associated with the ContextKeyUser key from the context
	user, ok := ctx.Value(ContextKeyUser).(*User) // Type assertion
	// ctx.Value returns interface{}, so we assert it to *User
	return user, ok // Return the user object (or nil) and a boolean indicating success/failure
}

