package storage

import (
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/google/uuid"
)

type Storer interface {
	UploadFile(file multipart.File, fileHeader *multipart.FileHeader) (string, error)
	DeleteFile(fileURL string) error
	GetFileURL(filename string) string
}

type LocalStorage struct {
	basePath     string
	publicPath   string     // The path portion of the URL that serves the files (e.g., "/uploads")
	allowedTypes []string   // e.g., ["image/jpeg", "image/png"]
	maxSize      int64      // e.g., 5 * 1024 * 1024 for 5MB
	mutex        sync.Mutex // Protect concurrent writes to the filesystem if needed (optional, depends on usage)
}

func NewLocalStorage(basePath, publicPath string, allowedTypes []string, maxSize int64) *LocalStorage {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		panic(fmt.Sprintf("failed to create local storage base path %s: %v", basePath, err))
	}

	return &LocalStorage{
		basePath:     basePath,
		publicPath:   publicPath,
		allowedTypes: allowedTypes,
		maxSize:      maxSize,
	}
}

func (ls *LocalStorage) UploadFile(file multipart.File, fileHeader *multipart.FileHeader) (string, error) {
	ls.mutex.Lock()
	defer ls.mutex.Unlock()
	if fileHeader.Size > ls.maxSize {
		return "", fmt.Errorf("file size %d exceeds maximum allowed size %d", fileHeader.Size, ls.maxSize)
	}
	ext := strings.ToLower(filepath.Ext(fileHeader.Filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
		return "", fmt.Errorf("file type %s is not allowed", ext)
	}
	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	fullPath := filepath.Join(ls.basePath, filename)

	dst, err := os.Create(fullPath)
	if err != nil {
		return "", fmt.Errorf("failed to create destination file %s: %w", fullPath, err)
	}
	defer dst.Close()
	_, err = io.Copy(dst, file)
	if err != nil {
		os.Remove(fullPath)
		return "", fmt.Errorf("failed to copy uploaded file to %s: %w", fullPath, err)
	}
	return fmt.Sprintf("%s/%s", strings.TrimSuffix(ls.publicPath, "/"), filename), nil
}

func (ls *LocalStorage) DeleteFile(fileURL string) error {
	ls.mutex.Lock()
	defer ls.mutex.Unlock()
	if !strings.HasPrefix(fileURL, ls.publicPath+"/") {
		return fmt.Errorf("file URL %s does not match base path %s", fileURL, ls.publicPath)
	}
	filename := strings.TrimPrefix(fileURL, ls.publicPath+"/")
	fullPath := filepath.Join(ls.basePath, filename)

	return os.Remove(fullPath)
}
func (ls *LocalStorage) GetFileURL(filename string) string {
	return fmt.Sprintf("%s/%s", strings.TrimSuffix(ls.publicPath, "/"), filename)
}
