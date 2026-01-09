package shared

type User struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	FullName  string `json:"full_name"`
	IsAdmin   bool   `json:"is_admin"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type ErrorResponse struct {
	Type     string                 `json:"type"`
	Title    string                 `json:"title"`
	Status   int                    `json:"status"`
	Detail   string                 `json:"detail"`
	Instance string                 `json:"instance,omitempty"`
	Errors   map[string]interface{} `json:"errors,omitempty"`
}

type Pagination struct {
	Page      int `json:"page"`
	PerPage   int `json:"per_page"`
	Total     int `json:"total"`
	TotalPage int `json:"total_page"`
}

type Product struct {
	ID               string                 `json:"id"`
	Name             string                 `json:"name"`
	Slug             string                 `json:"slug"`
	Description      string                 `json:"description"`
	ShortDescription string                 `json:"short_description"`
	PriceCents       int64                  `json:"price_cents"`
	StockQuantity    int                    `json:"stock_quantity"`
	Status           string                 `json:"status"`
	Brand            string                 `json:"brand"`
	ImageUrls        []string               `json:"image_urls"`
	SpecHighlights   map[string]interface{} `json:"spec_highlights"`
	CategoryID       string                 `json:"category_id"`
	CreatedAt        string                 `json:"created_at"`
	UpdatedAt        string                 `json:"updated_at"`
}

type Category struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Slug     string `json:"slug"`
	Type     string `json:"type"`
	ParentID string `json:"parent_id,omitempty"`
}
