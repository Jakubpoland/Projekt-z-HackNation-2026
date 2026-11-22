package maternity

import (
	"testing"

	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

func TestUntilBirthPaysMaternityRateToZus(t *testing.T) {
	got, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: false,
		TakeoverReason: "none",
		Mother: ParentInput{
			HasRight:    true,
			Title:       "employee",
			BasisGrosze: 1_000_000,
		},
		Father: ParentInput{HasRight: false, Title: "employee"},
		UntilBirth: &UntilBirthInput{
			Reason:         "bankruptcy",
			DaysUntilBirth: 20,
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Segments) != 1 {
		t.Fatalf("segments = %+v", got.Segments)
	}
	seg := got.Segments[0]
	if seg.Benefit != "maternity_amount_until_birth" || seg.RateBps != 10000 || seg.Payer != "zus" || seg.CalendarDays != 20 {
		t.Fatalf("segment = %+v", seg)
	}
	if seg.Total.Grosze != 33333*20 || got.GrandTotal.Grosze != seg.Total.Grosze {
		t.Fatalf("total = %d grand = %d", seg.Total.Grosze, got.GrandTotal.Grosze)
	}
}

func TestUntilBirthRefusesOtherJobAndOpenJudgment(t *testing.T) {
	base := Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: false,
		TakeoverReason: "none",
		Mother:         ParentInput{HasRight: true, Title: "employee", BasisGrosze: 1_000_000},
		Father:         ParentInput{HasRight: false},
		UntilBirth: &UntilBirthInput{
			Reason:                  "employer_death",
			OtherEmploymentProvided: true,
			DaysUntilBirth:          10,
		},
	}
	got, err := Simulate(params.Default(), base)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Segments) != 0 || got.GrandTotal.Grosze != 0 {
		t.Fatalf("other job should pay nothing, got %+v", got.Segments)
	}

	base.UntilBirth.OtherEmploymentProvided = false
	base.UntilBirth.Reason = "unlawful_dismissal"
	base.UntilBirth.JudgmentFinal = false
	got, err = Simulate(params.Default(), base)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Segments) != 0 {
		t.Fatal("open judgment should not pay")
	}

	base.UntilBirth.JudgmentFinal = true
	got, err = Simulate(params.Default(), base)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Segments) != 1 || got.Segments[0].CalendarDays != 10 {
		t.Fatalf("final judgment = %+v", got.Segments)
	}
}

func TestUntilBirthEmployeeOnly(t *testing.T) {
	got, err := Simulate(params.Default(), Input{
		Situation:      "birth",
		ChildCount:     1,
		InsuredOnEvent: true,
		TakeoverReason: "none",
		Mother: ParentInput{
			HasRight:    false,
			Title:       "mandate",
			BasisGrosze: 1_000_000,
		},
		Father: ParentInput{HasRight: false},
		UntilBirth: &UntilBirthInput{
			Reason:         "liquidation",
			DaysUntilBirth: 5,
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(got.Segments) != 0 {
		t.Fatalf("mandate should not get the employee benefit, got %+v", got.Segments)
	}
}
