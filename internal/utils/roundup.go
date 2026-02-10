package utils

import "math"

func RoundToDinarCents(cents int64) int64 {
	return int64(math.Round(float64(cents)/100.0)) * 100
}
