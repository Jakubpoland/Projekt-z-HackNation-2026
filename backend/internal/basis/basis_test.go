package basis

import (
	"testing"

	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

func TestEmployeeAverageSkipsShortMonth(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		Kind: "employee",
		Mode: "average",
		Months: []Month{
			{WorkedTimeBps: 10000, FixedGrosze: 10_000_00},
			{WorkedTimeBps: 4999, FixedGrosze: 1_000_00},
			{WorkedTimeBps: 5000, FixedGrosze: 8_000_00},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.MonthsIncluded != 2 || got.MonthsSkipped != 1 {
		t.Fatalf("months %+v", got)
	}
	// Average gross 9000.00, contribution 13.71% = 1233.90, net 7766.10.
	if got.Basis.Grosze != 7_766_10 {
		t.Fatalf("basis %s (%d)", got.Basis.Zloty, got.Basis.Grosze)
	}
}

func TestFirstMonthMinimumWage(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		Kind:                  "employee",
		Mode:                  "first_month",
		ContractMonthlyGrosze: 4_806_00,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Basis.Zloty != "4147.10" {
		t.Fatalf("basis %s", got.Basis.Zloty)
	}
}

func TestCarryOverWhenGapBelowMonth(t *testing.T) {
	gap := 0
	got, err := Calculate(params.Default(), Input{
		Kind:                       "employee",
		Mode:                       "average",
		PreviousBasisGrosze:        5_000_00,
		MonthsSincePreviousBenefit: &gap,
		Months:                     []Month{{WorkedTimeBps: 10000, FixedGrosze: 1}},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !got.CarriedOver || got.Basis.Grosze != 5_000_00 {
		t.Fatalf("carry %+v", got)
	}
}

func TestQuarterlyTwelfth(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		Kind:                 "employee",
		Mode:                 "average",
		Months:               []Month{{WorkedTimeBps: 10000, FixedGrosze: 0}},
		QuarterlyTotalGrosze: 12_000_00,
	})
	if err != nil {
		t.Fatal(err)
	}
	// 1000.00 gross minus 13.71% = 862.90.
	if got.Basis.Grosze != 862_90 {
		t.Fatalf("basis %s", got.Basis.Zloty)
	}
}

func TestNonEmployeeCap(t *testing.T) {
	revenues := make([]int64, 12)
	for i := range revenues {
		revenues[i] = 23_550_00
	}
	got, err := Calculate(params.Default(), Input{
		Kind:           "non_employee",
		RevenuesGrosze: revenues,
	})
	if err != nil {
		t.Fatal(err)
	}
	// 23550.00 minus half-up 13.71% (3228.71) is 20321.29, just under the annex cap of 20321.30.
	if got.CapApplied || got.Basis.Grosze != 20_321_29 {
		t.Fatalf("basis %+v cap %v", got.Basis, got.CapApplied)
	}
}

func TestVariableCompletion(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		Kind: "employee",
		Mode: "average",
		Months: []Month{{
			WorkedTimeBps:        8000,
			FixedGrosze:          0,
			VariableActualGrosze: 1_000_00,
			VariableDaysWorked:   10,
			VariableWorkingDays:  20,
		}},
	})
	if err != nil {
		t.Fatal(err)
	}
	// Completed variable 2000.00, minus 13.71% = 1725.80.
	if got.Basis.Grosze != 1_725_80 {
		t.Fatalf("basis %s", got.Basis.Zloty)
	}
}
