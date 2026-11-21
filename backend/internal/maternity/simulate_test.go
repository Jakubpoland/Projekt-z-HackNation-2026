package maternity

import (
	"testing"

	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

func weeks(n int) *int { return &n }

func baseParents() (ParentInput, ParentInput) {
	mother := ParentInput{
		HasRight:          true,
		Title:             "employee",
		BasisGrosze:       1_000_000,
		PayerInsuredCount: intPtr(25),
	}
	father := ParentInput{
		HasRight:          true,
		Title:             "employee",
		BasisGrosze:       1_000_000,
		PayerInsuredCount: intPtr(5),
	}
	return mother, father
}

func intPtr(n int) *int { return &n }

func TestOneChildMotherTakesMaximum(t *testing.T) {
	mother, father := baseParents()
	father.HasRight = true
	got, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: true,
		Mother:         mother,
		Father:         father,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Entitlement.MaternityDays != 140 || got.Entitlement.ParentalPoolWeeks != 41 {
		t.Fatalf("entitlement %+v", got.Entitlement)
	}
	if got.Entitlement.MaxWeeksForOneParent != 32 || got.Entitlement.SharedWeeks != 23 {
		t.Fatalf("pool %+v", got.Entitlement)
	}
	if len(got.Segments) != 1 || got.Segments[0].Total.Grosze != 4_666_620 {
		t.Fatalf("segments %+v", got.Segments)
	}
	if got.Segments[0].Payer != "platnik" {
		t.Fatalf("payer %s", got.Segments[0].Payer)
	}
}

func TestCombinedRateLeavesFatherExclusiveAt70(t *testing.T) {
	mother, father := baseParents()
	mother.MaternityWeeks = weeks(20)
	mother.ParentalWeeks = 23
	father.ParentalWeeks = 9
	day := 10
	got, err := Simulate(params.Default(), Input{
		Situation:                        "birth",
		ChildCount:                       1,
		InsuredOnEvent:                   true,
		CombinedRateRequest:              true,
		DaysAfterEventForCombinedRequest: &day,
		Mother:                           mother,
		Father:                           father,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !got.CombinedRateApplied {
		t.Fatal("expected 81.5%")
	}
	byID := map[string]Segment{}
	for _, seg := range got.Segments {
		byID[seg.ID] = seg
	}
	if byID["mother-maternity"].RateBps != 8150 || byID["mother-maternity"].Total.Grosze != 3_803_380 {
		t.Fatalf("mother maternity %+v", byID["mother-maternity"])
	}
	if byID["mother-parental-exclusive"].RateBps != 8150 || byID["mother-parental-shared"].RateBps != 8150 {
		t.Fatal("mother parental should be 81.5%")
	}
	if byID["father-parental-exclusive"].RateBps != 7000 || byID["father-parental-exclusive"].Total.Grosze != 1_469_979 {
		t.Fatalf("father exclusive %+v", byID["father-parental-exclusive"])
	}
}

func TestCannotTakeOtherParentsNineWeeks(t *testing.T) {
	mother, father := baseParents()
	mother.MaternityWeeks = weeks(20)
	mother.ParentalWeeks = 33
	father.HasRight = true
	_, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: true,
		Mother:         mother,
		Father:         father,
	})
	if err == nil {
		t.Fatal("expected pool error")
	}
}

func TestSingleParentStillLosesNineWeeks(t *testing.T) {
	mother, father := baseParents()
	father.HasRight = false
	mother.MaternityWeeks = weeks(20)
	mother.ParentalWeeks = 32
	got, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: true,
		Mother:         mother,
		Father:         father,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Entitlement.MaxWeeksForOneParent != 32 {
		t.Fatalf("max %d", got.Entitlement.MaxWeeksForOneParent)
	}
}

func TestHalfTimeExtensionDropsPartialDay(t *testing.T) {
	mother, father := baseParents()
	mother.MaternityWeeks = weeks(20)
	mother.ParentalWeeks = 41 - 9
	mother.Work = &Fraction{Numerator: 1, Denominator: 2}
	// 32 weeks is above the one-parent max of 32? 41-9=32, exactly the max. OK.
	got, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: true,
		Mother:         mother,
		Father:         father,
	})
	if err != nil {
		t.Fatal(err)
	}
	var extension, calendar int
	for _, seg := range got.Segments {
		if seg.Benefit == "parental_leave" {
			extension += seg.ExtensionDays
			calendar += seg.CalendarDays
			if seg.Monthly.Grosze != 350_000 {
				t.Fatalf("half benefit monthly %s", seg.Monthly.Zloty)
			}
		}
	}
	// 32*7 = 224 base days, extension = 112 exactly.
	if extension != 112 || calendar != 336 {
		t.Fatalf("extension %d calendar %d", extension, calendar)
	}
}

func TestFortyOneWeeksHalfTimeDropsHalfDay(t *testing.T) {
	// Both parents together can cover 41 only if each stays within exclusive+shared
	// and shared sum is 23. Father 9 + mother 32 = 41. Apply half time only to father 9.
	mother, father := baseParents()
	mother.MaternityWeeks = weeks(20)
	mother.ParentalWeeks = 32
	father.ParentalWeeks = 9
	father.Work = &Fraction{Numerator: 1, Denominator: 2}
	got, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: true,
		Mother:         mother,
		Father:         father,
	})
	if err != nil {
		t.Fatal(err)
	}
	for _, seg := range got.Segments {
		if seg.ID == "father-parental-exclusive" {
			// 63 * 1/2 = 31 days, partial day dropped from 31.5.
			if seg.ExtensionDays != 31 {
				t.Fatalf("extension %d", seg.ExtensionDays)
			}
		}
	}
}

func TestStillbirthIsEightWeeks(t *testing.T) {
	mother, father := baseParents()
	got, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: true,
		Children:       []ChildState{{Stillbirth: true}},
		Mother:         mother,
		Father:         father,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Entitlement.MaternityDays != 56 {
		t.Fatalf("days %d", got.Entitlement.MaternityDays)
	}
}

func TestSupplementaryPrematureRoundsUpAndCaps(t *testing.T) {
	weeks, err := SupplementaryWeeks(params.Default(), SupplementaryInput{
		PregnancyWeekAtBirth:   26,
		LowestBirthWeightGrams: 900,
		HospitalDays:           10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if weeks != 2 {
		t.Fatalf("weeks %d", weeks)
	}
	capped, err := SupplementaryWeeks(params.Default(), SupplementaryInput{
		PregnancyWeekAtBirth:   30,
		LowestBirthWeightGrams: 1500,
		HospitalDays:           80,
	})
	if err != nil {
		t.Fatal(err)
	}
	if capped != 8 {
		t.Fatalf("cap %d", capped)
	}
}

func TestFatherNeedsFourteenWeeks(t *testing.T) {
	mother, father := baseParents()
	mother.MaternityWeeks = weeks(13)
	father.MaternityWeeks = weeks(7)
	_, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: true,
		Mother:         mother,
		Father:         father,
	})
	if err == nil {
		t.Fatal("expected minimum stay")
	}
}

func TestLateCombinedRequestFallsBack(t *testing.T) {
	mother, father := baseParents()
	mother.MaternityWeeks = weeks(20)
	day := 22
	got, err := Simulate(params.Default(), Input{
		Situation:                        "birth",
		ChildCount:                       1,
		InsuredOnEvent:                   true,
		CombinedRateRequest:              true,
		DaysAfterEventForCombinedRequest: &day,
		Mother:                           mother,
		Father:                           father,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.CombinedRateApplied || got.Segments[0].RateBps != 10000 {
		t.Fatalf("rate %+v", got)
	}
}

func TestFosterFloorWhenCloseToAgeLimit(t *testing.T) {
	mother, father := baseParents()
	mother.MaternityWeeks = weeks(9)
	got, err := Simulate(params.Default(), Input{
		Situation:      "foster",
		ChildCount:     1,
		InsuredOnEvent: true,
		Acceptance:     &AcceptanceInput{DaysUntilAgeLimit: 30},
		Mother:         mother,
		Father:         father,
	})
	if err != nil {
		t.Fatal(err)
	}
	if !got.Entitlement.ShortParental || got.Entitlement.MaternityDays != 63 || got.Entitlement.ParentalPoolWeeks != 38 {
		t.Fatalf("entitlement %+v", got.Entitlement)
	}
}

func TestNoInsuranceBlocksClaim(t *testing.T) {
	mother, _ := baseParents()
	mother.MaternityWeeks = weeks(20)
	_, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: false,
		Mother:         mother,
	})
	if err == nil {
		t.Fatal("expected insurance error")
	}
}

func TestBusinessPayerIsZUS(t *testing.T) {
	mother, father := baseParents()
	mother.Title = "business"
	mother.PayerInsuredCount = nil
	got, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: true,
		Mother:         mother,
		Father:         father,
	})
	if err != nil {
		t.Fatal(err)
	}
	if got.Segments[0].Payer != "zus" {
		t.Fatalf("payer %s", got.Segments[0].Payer)
	}
}
