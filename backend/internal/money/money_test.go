package money

import "testing"

func TestRoundDivHalfUp(t *testing.T) {
	cases := []struct {
		n, d, want int64
	}{
		{1_000_000, 30, 33333},
		{815_000, 30, 27167},
		{700_000, 30, 23333},
		{6589026, 10000, 659},
	}
	for _, tc := range cases {
		if got := RoundDiv(tc.n, tc.d); got != tc.want {
			t.Fatalf("RoundDiv(%d,%d)=%d want %d", tc.n, tc.d, got, tc.want)
		}
	}
}

func TestDeductSocialContribution(t *testing.T) {
	// 4806.00 zł minus 13.71% = 4147.10 zł.
	got := DeductRate(4_806_00, 1371, 10000)
	if got != 4_147_10 {
		t.Fatalf("min basis = %d (%s), want 4147.10", got, Format(got))
	}
}

func TestFormat(t *testing.T) {
	if got := Format(4_147_10); got != "4147.10" {
		t.Fatalf("format = %s", got)
	}
	if got := Format(-50); got != "-0.50" {
		t.Fatalf("format neg = %s", got)
	}
}
