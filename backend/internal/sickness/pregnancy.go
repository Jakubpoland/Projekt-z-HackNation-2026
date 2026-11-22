// Package sickness decides sick pay and pregnancy sickness benefit for one spell.
package sickness

import (
	"github.com/Jakubpoland/ZUS/backend/internal/apperr"
	"github.com/Jakubpoland/ZUS/backend/internal/money"
	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

// Input describes one incapacity for work during pregnancy.
type Input struct {
	IsEmployee bool `json:"isEmployee"`
	// Insurance is "compulsory", "voluntary" or "none".
	Insurance string `json:"insurance"`
	// CoveredDaysBefore is the uninterrupted insurance length before this spell.
	CoveredDaysBefore int `json:"coveredDaysBefore"`
	// WaitingPeriodAlreadyMet covers statutory exceptions the core does not enumerate.
	WaitingPeriodAlreadyMet bool `json:"waitingPeriodAlreadyMet"`
	// Age50Rule is true when the spell falls in a calendar year after the year the person turned 50.
	Age50Rule bool `json:"age50Rule"`
	// CodeB is the pregnancy marker on e-ZLA. The 100% sickness benefit requires it.
	CodeB bool `json:"codeB"`
	// InPregnancy selects the pregnancy benefit-period exception.
	InPregnancy        bool `json:"inPregnancy"`
	IncapacityDays     int  `json:"incapacityDays"`
	SickPayDaysUsed    int  `json:"sickPayDaysUsed"`
	PreviousPeriodDays int  `json:"previousPeriodDays"`
	// GapDays is the break since the previous incapacity. Negative means there was none.
	GapDays int `json:"gapDays"`
	// BasisGrosze is optional. Zero skips the money figures.
	BasisGrosze int64 `json:"basisGrosze"`
	// Rehab is optional. Omitted means the caller did not ask for świadczenie rehabilitacyjne.
	Rehab *RehabInput `json:"rehab,omitempty"`
}

// Result splits a spell into employer sick pay and ZUS (or payer) benefit.
type Result struct {
	Eligible          bool         `json:"eligible"`
	SickPayDays       int          `json:"sickPayDays"`
	BenefitDays       int          `json:"benefitDays"`
	UnpaidDays        int          `json:"unpaidDays"`
	PeriodLimitDays   int          `json:"periodLimitDays"`
	SickPayRateBps    int          `json:"sickPayRateBps"`
	BenefitRateBps    int          `json:"benefitRateBps"`
	SickPayDaily      money.Amount `json:"sickPayDaily"`
	BenefitDaily      money.Amount `json:"benefitDaily"`
	SickPayTotal      money.Amount `json:"sickPayTotal"`
	BenefitTotal      money.Amount `json:"benefitTotal"`
	Warnings          []Warning    `json:"warnings"`
	ParametersVersion string       `json:"parametersVersion"`
	// Rehab is set only when the caller asked for świadczenie rehabilitacyjne.
	Rehab *RehabResult `json:"rehab,omitempty"`
}

// Warning is a stable code plus a Polish sentence.
type Warning struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Calculate applies the pregnancy sick-pay and benefit-period rules.
func Calculate(p params.Parameters, in Input) (Result, error) {
	if in.IncapacityDays < 0 || in.SickPayDaysUsed < 0 || in.PreviousPeriodDays < 0 || in.CoveredDaysBefore < 0 {
		return Result{}, apperr.E("SICKNESS_RANGE", "Liczby dni nie mogą być ujemne.")
	}
	out := Result{
		ParametersVersion: p.Version,
		Warnings:          []Warning{},
		SickPayDaily:      money.NewAmount(0),
		BenefitDaily:      money.NewAmount(0),
		SickPayTotal:      money.NewAmount(0),
		BenefitTotal:      money.NewAmount(0),
	}
	if in.Insurance == "none" || in.Insurance == "" {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "NO_INSURANCE",
			Message: "Brak ubezpieczenia chorobowego. Zasiłek chorobowy nie przysługuje.",
		})
		out.UnpaidDays = in.IncapacityDays
		return finish(p, in, out)
	}
	if in.Insurance != "compulsory" && in.Insurance != "voluntary" {
		return Result{}, apperr.E("INSURANCE_KIND", "Ubezpieczenie musi być compulsory, voluntary albo none.")
	}

	waitingDays := p.WaitingDaysCompulsory
	if in.Insurance == "voluntary" {
		waitingDays = p.WaitingDaysVoluntary
	}
	if !in.WaitingPeriodAlreadyMet && in.CoveredDaysBefore < waitingDays {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "WAITING_PERIOD",
			Message: "Okres wyczekiwania nie jest spełniony. Dla ubezpieczenia obowiązkowego to co do zasady 30 dni, dla dobrowolnego 90 dni. Są wyjątki ustawowe, których ten rdzeń nie rozstrzyga automatycznie.",
		})
		out.UnpaidDays = in.IncapacityDays
		return finish(p, in, out)
	}

	limit := p.BenefitPeriodDays
	if in.InPregnancy {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "PREGNANCY_PERIOD_RESET",
			Message: "Niezdolność w ciąży nie dolicza do okresu zasiłkowego okresów sprzed przerwy.",
		})
	} else if in.GapDays >= 0 && in.GapDays <= p.BenefitPeriodGapDays {
		limit -= in.PreviousPeriodDays
		if limit < 0 {
			limit = 0
		}
	}
	out.PeriodLimitDays = limit

	payable := in.IncapacityDays
	if payable > limit {
		payable = limit
	}
	sickPayLimit := p.SickPayDaysUnder50
	if in.Age50Rule {
		sickPayLimit = p.SickPayDaysAge50
	}
	if in.IsEmployee {
		remainingSickPay := sickPayLimit - in.SickPayDaysUsed
		if remainingSickPay < 0 {
			remainingSickPay = 0
		}
		out.SickPayDays = payable
		if out.SickPayDays > remainingSickPay {
			out.SickPayDays = remainingSickPay
		}
		out.BenefitDays = payable - out.SickPayDays
	} else {
		out.BenefitDays = payable
	}
	out.UnpaidDays = in.IncapacityDays - out.SickPayDays - out.BenefitDays
	out.Eligible = out.SickPayDays+out.BenefitDays > 0

	out.SickPayRateBps = p.SickDefaultRateBps
	out.BenefitRateBps = p.SickDefaultRateBps
	if in.InPregnancy || in.CodeB {
		out.SickPayRateBps = p.SickPayPregnancyRateBps
	}
	if in.CodeB {
		out.BenefitRateBps = p.SickPregnancyRateBps
	} else if in.InPregnancy {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "CODE_B_MISSING",
			Message: "Zasiłek chorobowy w ciąży wynosi 100% podstawy, gdy e-ZLA ma kod B. Bez kodu B przyjęto stawkę podstawową.",
		})
	}

	if in.BasisGrosze > 0 {
		sickMonthly := money.ApplyBps(money.Grosze(in.BasisGrosze), out.SickPayRateBps)
		benefitMonthly := money.ApplyBps(money.Grosze(in.BasisGrosze), out.BenefitRateBps)
		sickDaily := money.DailyFromMonthly(sickMonthly, p.DailyDivisor)
		benefitDaily := money.DailyFromMonthly(benefitMonthly, p.DailyDivisor)
		out.SickPayDaily = money.NewAmount(sickDaily)
		out.BenefitDaily = money.NewAmount(benefitDaily)
		out.SickPayTotal = money.NewAmount(sickDaily * money.Grosze(out.SickPayDays))
		out.BenefitTotal = money.NewAmount(benefitDaily * money.Grosze(out.BenefitDays))
	}
	return finish(p, in, out)
}

func finish(p params.Parameters, in Input, out Result) (Result, error) {
	if err := applyRehab(p, in, &out); err != nil {
		return Result{}, err
	}
	return out, nil
}
