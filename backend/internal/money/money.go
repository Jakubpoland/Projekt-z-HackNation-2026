// Package money counts Polish złoty in grosze and rounds the way the benefit core does.
package money

import "fmt"

// Grosze is an amount of money in 1/100 of a złoty.
type Grosze int64

// Amount is the JSON shape of a money value.
type Amount struct {
	Grosze int64  `json:"grosze"`
	Zloty  string `json:"zloty"`
}

// NewAmount formats grosze for API responses.
func NewAmount(g Grosze) Amount {
	return Amount{Grosze: int64(g), Zloty: Format(g)}
}

// Format renders grosze as a złoty string with two decimal places.
func Format(g Grosze) string {
	sign := ""
	v := int64(g)
	if v < 0 {
		sign = "-"
		v = -v
	}
	return fmt.Sprintf("%s%d.%02d", sign, v/100, v%100)
}

// RoundDiv divides n by d and rounds half away from zero.
func RoundDiv(n, d int64) int64 {
	if d <= 0 {
		panic("money: divisor must be positive")
	}
	sign := int64(1)
	if n < 0 {
		sign = -1
		n = -n
	}
	return sign * ((n + d/2) / d)
}

// MulDiv returns round(n * num / den).
func MulDiv(n, num, den int64) Grosze {
	if den <= 0 {
		panic("money: divisor must be positive")
	}
	return Grosze(RoundDiv(n*num, den))
}

// DeductRate returns gross minus round(gross * num / den).
func DeductRate(gross Grosze, num, den int64) Grosze {
	return gross - MulDiv(int64(gross), num, den)
}

// ApplyBps returns round(amount * bps / 10000). 10000 bps is 100%.
func ApplyBps(amount Grosze, bps int) Grosze {
	return MulDiv(int64(amount), int64(bps), 10000)
}

// DailyFromMonthly is the ZUS daily rate: monthly basis / 30, rounded to a grosz.
func DailyFromMonthly(monthly Grosze, divisor int) Grosze {
	if divisor <= 0 {
		divisor = 30
	}
	return Grosze(RoundDiv(int64(monthly), int64(divisor)))
}
