package sickness

import (
	"github.com/Jakubpoland/ZUS/backend/internal/apperr"
	"github.com/Jakubpoland/ZUS/backend/internal/money"
	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

// RehabInput is a request to estimate świadczenie rehabilitacyjne.
// The ZUS medical examiner decides the prognosis and the length.
// This core only prices a period the caller says was granted.
type RehabInput struct {
	Requested bool `json:"requested"`
	// AssessorGranted means a ZUS medical examiner or the medical board
	// already confirmed the prognosis and the period. The calculator does not
	// make that decision.
	AssessorGranted bool `json:"assessorGranted"`
	// BlockingEntitlement is art. 18 ust. 7: old-age pension, disability
	// pension, unemployment benefit, pre-retirement benefit or allowance,
	// parental supplementary benefit, teacher compensatory benefit, or health leave.
	BlockingEntitlement bool `json:"blockingEntitlement"`
	// InsuranceEnded asks for the art. 46 warning. The average-wage cap is not
	// in the parameter set, so the amount is not reduced.
	InsuranceEnded bool `json:"insuranceEnded"`
	Days           int  `json:"days"`
	// InPregnancy selects 100% of the sickness-benefit basis (art. 19 ust. 1).
	InPregnancy bool `json:"inPregnancy"`
}

// RehabResult is the priced rehabilitation period.
type RehabResult struct {
	Eligible     bool         `json:"eligible"`
	Days         int          `json:"days"`
	Capped       bool         `json:"capped"`
	FirstDays    int          `json:"firstDays"`
	LaterDays    int          `json:"laterDays"`
	FirstRateBps int          `json:"firstRateBps"`
	LaterRateBps int          `json:"laterRateBps"`
	FirstDaily   money.Amount `json:"firstDaily"`
	LaterDaily   money.Amount `json:"laterDaily"`
	Total        money.Amount `json:"total"`
	MaxDays      int          `json:"maxDays"`
}

func applyRehab(p params.Parameters, in Input, out *Result) error {
	if in.Rehab == nil || !in.Rehab.Requested {
		return nil
	}
	req := in.Rehab
	if req.Days < 0 {
		return apperr.E("REHAB_DAYS", "Liczba dni świadczenia rehabilitacyjnego nie może być ujemna.")
	}
	if p.DailyDivisor <= 0 {
		return apperr.E("PARAMS_DIVISOR", "Dzielnik stawki dziennej musi być dodatni.")
	}
	// The act says "three months" and "12 months". This core counts days and
	// divides a month by DailyDivisor, so a month here is that many days.
	maxDays := p.RehabMaxMonths * p.DailyDivisor
	firstWindow := p.RehabFirstMonths * p.DailyDivisor
	res := &RehabResult{
		MaxDays:    maxDays,
		FirstDaily: money.NewAmount(0),
		LaterDaily: money.NewAmount(0),
		Total:      money.NewAmount(0),
	}
	refuse := func(code, message string) {
		res.FirstRateBps = p.RehabFirstRateBps
		res.LaterRateBps = p.RehabLaterRateBps
		out.Rehab = res
		out.Warnings = append(out.Warnings, Warning{Code: code, Message: message})
	}
	if in.Insurance == "none" || in.Insurance == "" {
		refuse("REHAB_NO_INSURANCE", "Świadczenie rehabilitacyjne wymaga ubezpieczenia chorobowego. Bez niego nie jest liczone.")
		return nil
	}
	if !req.AssessorGranted {
		refuse("REHAB_NO_DECISION", "Świadczenie rehabilitacyjne przyznaje lekarz orzecznik ZUS albo komisja lekarska. Bez tej decyzji kwota wynosi zero.")
		return nil
	}
	if req.BlockingEntitlement {
		refuse("REHAB_BLOCKED", "Świadczenie rehabilitacyjne nie przysługuje osobie uprawnionej do emerytury, renty z tytułu niezdolności do pracy, zasiłku dla bezrobotnych, zasiłku albo świadczenia przedemerytalnego, rodzicielskiego świadczenia uzupełniającego, nauczycielskiego świadczenia kompensacyjnego albo urlopu dla poratowania zdrowia.")
		return nil
	}
	if req.Days == 0 {
		refuse("REHAB_DAYS", "Podaj liczbę dni świadczenia rehabilitacyjnego przyznaną przez ZUS.")
		return nil
	}

	days := req.Days
	if days > maxDays {
		days = maxDays
		res.Capped = true
		out.Warnings = append(out.Warnings, Warning{
			Code:    "REHAB_CAPPED",
			Message: "Świadczenie rehabilitacyjne przysługuje przez okres potrzebny do odzyskania zdolności do pracy, nie dłużej niż 12 miesięcy.",
		})
	}
	res.Days = days
	res.Eligible = true

	if req.InPregnancy {
		res.FirstDays = days
		res.FirstRateBps = p.SickPregnancyRateBps
		res.LaterRateBps = p.SickPregnancyRateBps
	} else {
		res.FirstDays = days
		if res.FirstDays > firstWindow {
			res.FirstDays = firstWindow
		}
		res.LaterDays = days - res.FirstDays
		res.FirstRateBps = p.RehabFirstRateBps
		res.LaterRateBps = p.RehabLaterRateBps
	}

	if in.BasisGrosze > 0 {
		firstMonthly := money.ApplyBps(money.Grosze(in.BasisGrosze), res.FirstRateBps)
		laterMonthly := money.ApplyBps(money.Grosze(in.BasisGrosze), res.LaterRateBps)
		res.FirstDaily = money.NewAmount(money.DailyFromMonthly(firstMonthly, p.DailyDivisor))
		res.LaterDaily = money.NewAmount(money.DailyFromMonthly(laterMonthly, p.DailyDivisor))
		total := money.Grosze(res.FirstDaily.Grosze)*money.Grosze(res.FirstDays) + money.Grosze(res.LaterDaily.Grosze)*money.Grosze(res.LaterDays)
		res.Total = money.NewAmount(total)
	}
	out.Rehab = res
	out.Warnings = append(out.Warnings, Warning{
		Code:    "REHAB_NO_INDEX",
		Message: "Podstawy świadczenia rehabilitacyjnego nie zwaloryzowano. Wskaźnik z Monitora Polskiego (art. 19 ust. 2) nie jest w zestawie parametrów.",
	})
	if req.InsuranceEnded {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "REHAB_ART46",
			Message: "Po ustaniu ubezpieczenia świadczenie rehabilitacyjne nie może przekroczyć 100% przeciętnego wynagrodzenia. Tej kwoty nie ma w parametrach, więc limitu nie zastosowano.",
		})
	}
	return nil
}
