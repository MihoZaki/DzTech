# Load .env file
set dotenv-load := true

# Justfile - Backend Helper Commands
default:
  @just --list

[group('migration')]
[doc('Migrate the database up one time')]
migrate-up:
  goose -dir migrations up

[group('migration')]
[doc('Migrate the database down one time')]
migrate-down:
  goose -dir migrations down

[group('migration')]
[doc('Return the migration status')]
migrate-status:
  goose -dir migrations status

[group('migration')]
[doc('Create a new migration based on the argument provided')]
migrate-create name:
  echo "Creating migration: {{name}}"
  goose -dir migrations create {{name}} sql

[group('database')]
[doc('Create tech_store_dev Datebase')]
db-create:
  createdb tech_store_dev

[group('database')]
[doc('Drop tech_store_dev Database')]
db-drop:
  dropdb tech_store_dev

[group('development')]
[doc('Start the server (Default Port: 8080)')]
dev:
  go run cmd/server/main.go

[group('development')]
[doc('Run the seed script')]
seed:
  go run scripts/seed.go

[group('development')]
[doc('Run all the tests')]
test:
  go test ./...

[group('development')]
[doc('Build the backend API')]
build:
  go build -o bin/server cmd/server/main.go

[group('development')]
[doc('Run the database migration & Start the server')]
serve:
  just migrate-up
  just dev

[group('development')]
[doc('Reset the entire database')]
reset:
  just db-drop
  just db-create
  just migrate-up
