package models

type LoginResponse struct {
	Token string `json:"access_token"` // Rename for clarity
	User  User   `json:"user"`
}

type RefreshResponse struct {
	AccessToken string `json:"access_token"` // New access token
}

type RefreshRequest struct {
}

type LogoutRequest struct {
}

func (lr *LoginResponse) Validate() error {
	return nil
}

func (rr *RefreshResponse) Validate() error {
	return nil
}

func (rr *RefreshRequest) Validate() error {
	return Validate.Struct(rr)
}

func (lr *LogoutRequest) Validate() error {
	return Validate.Struct(lr)
}
