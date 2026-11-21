package sickness

import (
	"testing"

	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

func TestEmployeePregnancyCodeB(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		IsEmployee:        true,
		Insurance:         "compulsory",
		CoveredDaysBefore: 30,
		CodeB:             true,
		InPregnancy:       true,
		IncapacityDays:    40,
		BasisGrosze:       1_000_000,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.SickPayDays != 33 || got.BenefitDays != 7 || !got.Eligible {
		t.Fatalf("split = sick %d benefit %d", got.SickPayDays, got.BenefitDays)
	}
	if got.BenefitRateBps != 10000 || got.SickPayRateBps != 10000 {
		t.Fatalf("rates sick %d benefit %d", got.SickPayRateBps, got.BenefitRateBps)
	}
}

func TestAge50Uses14Days(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		IsEmployee:        true,
		Insurance:         "compulsory",
		CoveredDaysBefore: 100,
		Age50Rule:         true,
		CodeB:             true,
		InPregnancy:       true,
		IncapacityDays:    20,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.SickPayDays != 14 || got.BenefitDays != 6 {
		t.Fatalf("split = %+v", got)
	}
}

func TestNonEmployeeFromDayOne(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		IsEmployee:        false,
		Insurance:         "voluntary",
		CoveredDaysBefore: 90,
		CodeB:             true,
		InPregnancy:       true,
		IncapacityDays:    10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.SickPayDays != 0 || got.BenefitDays != 10 {
		t.Fatalf("split = %+v", got)
	}
}

func TestWaitingPeriodBlocksVoluntary(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		Insurance:         "voluntary",
		CoveredDaysBefore: 89,
		CodeB:             true,
		InPregnancy:       true,
		IncapacityDays:    5,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Eligible || got.UnpaidDays != 5 {
		t.Fatalf("expected blocked spell, got %+v", got)
	}
}

func TestPregnancyDoesNotCountPreviousSpell(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		IsEmployee:         false,
		Insurance:          "compulsory",
		CoveredDaysBefore:  30,
		CodeB:              true,
		InPregnancy:        true,
		IncapacityDays:     10,
		PreviousPeriodDays: 200,
		GapDays:            10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.PeriodLimitDays != 270 || got.BenefitDays != 10 {
		t.Fatalf("period %d benefit %d", got.PeriodLimitDays, got.BenefitDays)
	}
}

func TestBenefitPeriodCap(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		IsEmployee:        false,
		Insurance:         "compulsory",
		CoveredDaysBefore: 30,
		CodeB:             true,
		InPregnancy:       true,
		IncapacityDays:    300,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.BenefitDays != 270 || got.UnpaidDays != 30 {
		t.Fatalf("benefit %d unpaid %d", got.BenefitDays, got.UnpaidDays)
	}
}
