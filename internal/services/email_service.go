package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/MihoZaki/DzTech/internal/config"
	"github.com/wneessen/go-mail"
)

// EmailService defines the interface for sending emails.
type EmailService interface {
	SendPasswordResetEmail(ctx context.Context, toEmail, resetToken string) error
}

// ConcreteEmailService implements the EmailService interface using wneessen/go-mail.
type ConcreteEmailService struct {
	config *config.Config
	logger *slog.Logger
	client *mail.Client // Cached client instance
}

// NewEmailService creates a new instance of ConcreteEmailService.
func NewEmailService(cfg *config.Config, logger *slog.Logger) *ConcreteEmailService {
	// Define client options based on configuration
	opts := []mail.Option{
		mail.WithPort(cfg.SMTP.Port),
		mail.WithUsername(cfg.SMTP.Username),
		mail.WithPassword(cfg.SMTP.Password),
	}

	// Determine authentication method (auto-discover or specific like PLAIN/LOGIN)
	// For most external SMTP servers (Gmail, Mailtrap, SendGrid, etc.), auto-discovery works well.
	// If your SMTP server requires a specific auth method, you can use mail.WithSMTPAuth(mail.SMTPAuthLogin) or similar.
	opts = append(opts, mail.WithSMTPAuth(mail.SMTPAuthAutoDiscover))

	// Create the client
	client, err := mail.NewClient(cfg.SMTP.Host, opts...)
	if err != nil {
		// Log the initialization error
		logger.Error("Failed to initialize go-mail client", "host", cfg.SMTP.Host, "port", cfg.SMTP.Port, "error", err)
		// Return the service with a nil client to signal failure
		return &ConcreteEmailService{
			config: cfg,
			logger: logger,
			client: nil,
		}
	}
	logger.Info("succesfully connected to the go-mail client with the host", "host", cfg.SMTP.Host, "port", cfg.SMTP.Port)

	return &ConcreteEmailService{
		config: cfg,
		logger: logger,
		client: client,
	}
}

// SendPasswordResetEmail sends a password reset email using wneessen/go-mail.
func (e *ConcreteEmailService) SendPasswordResetEmail(ctx context.Context, toEmail, resetToken string) error {
	// Check if the client was initialized successfully
	if e.client == nil {
		return errors.New("email client not initialized, check SMTP configuration logs")
	}
	if e.config.SMTP.Sender == "" {
		return errors.New("SMTP sender address not configured in config")
	}

	baseURL := e.config.BaseURL
	if baseURL == "" {
		return errors.New("base URL not configured in config, cannot construct reset link")
	}
	resetURL := fmt.Sprintf("%s/auth/reset-password/%s", baseURL, resetToken)

	// Create the email message
	message := mail.NewMsg()
	if message == nil {
		return errors.New("failed to create new email message object")
	}

	// Set the sender (From header) - Use the configured sender address
	if err := message.From(e.config.SMTP.Sender); err != nil {
		e.logger.Error("Failed to set sender address in message", "error", err, "sender", e.config.SMTP.Sender)
		return fmt.Errorf("failed to set sender address: %w", err)
	}

	// Set the recipient (To header)
	if err := message.To(toEmail); err != nil {
		e.logger.Error("Failed to set recipient address in message", "error", err, "to", toEmail)
		return fmt.Errorf("failed to set recipient address: %w", err)
	}

	// Set the subject
	message.Subject("Password Reset Request")

	// Set the body (plain text)
	textBody := fmt.Sprintf(`Hello,

We received a request to reset your password for your YC Informatique account.

Click the link below to reset your password:
%s

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email.

Best regards,
YC Informatique Team
`, resetURL)
	message.SetBodyString(mail.TypeTextPlain, textBody)

	// Set the body (HTML)
	htmlBody := fmt.Sprintf(`<html>
<body>
<p>Hello,</p>

<p>We received a request to reset your password for your YC Informatique account.</p>

<p><a href="%s">Click here to reset your password</a></p>

<p>This link will expire in 1 hour.</p>

<p>If you didn't request this reset, please ignore this email.</p>

<p>Best regards,<br/>
YC Informatique Team</p>
</body>
</html>`, resetURL)
	message.SetBodyString(mail.TypeTextHTML, htmlBody)

	// Send the email using the cached client
	// Use DialAndSendWithContext to respect the request context and add a timeout
	ctxWithTimeout, cancel := context.WithTimeout(ctx, 15*time.Second) // Adjust timeout as needed
	defer cancel()

	if err := e.client.DialAndSendWithContext(ctxWithTimeout, message); err != nil {
		e.logger.Error("Failed to send password reset email via go-mail", "to", toEmail, "error", err)
		return fmt.Errorf("failed to send email via go-mail: %w", err)
	}

	e.logger.Info("Password reset email sent successfully via go-mail", "to", toEmail, "token_preview", resetToken[:10]+"...")
	return nil
}
