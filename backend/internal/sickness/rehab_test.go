package sickness

import (
	"testing"

	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

func TestRehabPregnancyIsFullRate(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		IsEmployee:        true,
		Insurance:         "compulsory",
		CoveredDaysBefore: 30,
		CodeB:             true,
		InPregnancy:       true,
		IncapacityDays:    1,
		BasisGrosze:       1_000_000,
		Rehab: &RehabInput{
			Requested:       true,
			AssessorGranted: true,
			Days:            30,
			InPregnancy:     true,
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Rehab == nil || !got.Rehab.Eligible || got.Rehab.FirstRateBps != 10000 || got.Rehab.LaterDays != 0 {
		t.Fatalf("rehab = %+v", got.Rehab)
	}
	if got.Rehab.Total.Grosze != 33333*30 {
		t.Fatalf("total = %d", got.Rehab.Total.Grosze)
	}
}

func TestRehabSplitsNinetyThenSeventyFive(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		Insurance:         "compulsory",
		CoveredDaysBefore: 30,
		IncapacityDays:    1,
		BasisGrosze:       1_000_000,
		Rehab: &RehabInput{
			Requested:       true,
			AssessorGranted: true,
			Days:            100,
			InPregnancy:     false,
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Rehab.FirstDays != 90 || got.Rehab.LaterDays != 10 {
		t.Fatalf("split = %+v", got.Rehab)
	}
	if got.Rehab.FirstRateBps != 9000 || got.Rehab.LaterRateBps != 7500 {
		t.Fatalf("rates = %+v", got.Rehab)
	}
	want := int64(90*30000 + 10*25000)
	if got.Rehab.Total.Grosze != want {
		t.Fatalf("total = %d, want %d", got.Rehab.Total.Grosze, want)
	}
}

func TestRehabCapsAtTwelveMonths(t *testing.T) {
	got, err := Calculate(params.Default(), Input{
		Insurance:         "compulsory",
		CoveredDaysBefore: 30,
		IncapacityDays:    1,
		Rehab: &RehabInput{
			Requested:       true,
			AssessorGranted: true,
			Days:            400,
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if !got.Rehab.Capped || got.Rehab.Days != 360 {
		t.Fatalf("cap = %+v", got.Rehab)
	}
}

func TestRehabRefusesWithoutDecisionOrWhenBlocked(t *testing.T) {
	base := Input{
		Insurance:         "compulsory",
		CoveredDaysBefore: 30,
		IncapacityDays:    1,
		Rehab: &RehabInput{
			Requested: true,
			Days:      10,
		},
	}
	got, err := Calculate(params.Default(), base)
	if err != nil {
		t.Fatal(err)
	}
	if got.Rehab.Eligible || got.Rehab.Total.Grosze != 0 {
		t.Fatalf("expected refusal without decision, got %+v", got.Rehab)
	}

	base.Rehab.AssessorGranted = true
	base.Rehab.BlockingEntitlement = true
	got, err = Calculate(params.Default(), base)
	if err != nil {
		t.Fatal(err)
	}
	if got.Rehab.Eligible {
		t.Fatal("blocking entitlement should refuse rehab")
	}
}
