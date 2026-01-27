package models

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type RefreshResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

func (rr *RefreshRequest) Validate() error {
	return Validate.Struct(rr)
}

func (lr *LogoutRequest) Validate() error {
	return Validate.Struct(lr)
}

type LoginResponseWithToken struct {
	Token        string `json:"access_token"`  // Rename for clarity if both tokens are returned here
	RefreshToken string `json:"refresh_token"` // Add refresh token
	User         User   `json:"user"`
}

func (lr *LoginResponseWithToken) Validate() error {
	return nil
}
