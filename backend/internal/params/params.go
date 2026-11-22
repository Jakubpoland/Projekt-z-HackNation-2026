// Package params holds the legal rates and durations the calculators read.
// Values come from the HackNation annex and the Labour Code extract. An admin
// can replace them without a code change when the statute changes.
package params

import "github.com/Jakubpoland/ZUS/backend/internal/apperr"

// Parameters is the full tunable set used by every calculator.
type Parameters struct {
	Version string `json:"version"`

	SocialContributionNumerator   int64 `json:"socialContributionNumerator"`
	SocialContributionDenominator int64 `json:"socialContributionDenominator"`

	MaternityRateBps             int `json:"maternityRateBps"`
	ParentalRateBps              int `json:"parentalRateBps"`
	CombinedRequestRateBps       int `json:"combinedRequestRateBps"`
	SecondParentExclusiveRateBps int `json:"secondParentExclusiveRateBps"`
	PaternityRateBps             int `json:"paternityRateBps"`
	SupplementaryRateBps         int `json:"supplementaryRateBps"`
	SickPregnancyRateBps         int `json:"sickPregnancyRateBps"`
	SickDefaultRateBps           int `json:"sickDefaultRateBps"`
	SickPayPregnancyRateBps      int `json:"sickPayPregnancyRateBps"`

	// MaternityWeeksByChildren is indexed by child count: index 1 = one child.
	// Index 0 is unused. Counts above the last index use the last value.
	MaternityWeeksByChildren []int `json:"maternityWeeksByChildren"`

	ParentalWeeksOne           int `json:"parentalWeeksOne"`
	ParentalWeeksMulti         int `json:"parentalWeeksMulti"`
	ParentalWeeksOneZaZyciem   int `json:"parentalWeeksOneZaZyciem"`
	ParentalWeeksMultiZaZyciem int `json:"parentalWeeksMultiZaZyciem"`
	ExclusiveParentalWeeks     int `json:"exclusiveParentalWeeks"`

	ParentalCalendarCapOne           int `json:"parentalCalendarCapOne"`
	ParentalCalendarCapMulti         int `json:"parentalCalendarCapMulti"`
	ParentalCalendarCapOneZaZyciem   int `json:"parentalCalendarCapOneZaZyciem"`
	ParentalCalendarCapMultiZaZyciem int `json:"parentalCalendarCapMultiZaZyciem"`

	// Short parental leave (Labour Code art. 183 § 3 / § 4 pkt 3 and § 4³ pkt 3).
	ShortParentalWeeks               int `json:"shortParentalWeeks"`
	ShortParentalWeeksZaZyciem       int `json:"shortParentalWeeksZaZyciem"`
	ShortParentalCalendarCap         int `json:"shortParentalCalendarCap"`
	ShortParentalCalendarCapZaZyciem int `json:"shortParentalCalendarCapZaZyciem"`

	ParentalMaxParts             int `json:"parentalMaxParts"`
	ParentalChildAgeYearEnd      int `json:"parentalChildAgeYearEnd"`
	MotherMinWeeksBeforeHandoff  int `json:"motherMinWeeksBeforeHandoff"`
	MotherMinWeeksSpecialHandoff int `json:"motherMinWeeksSpecialHandoff"`
	EarlyMaternityMaxWeeks       int `json:"earlyMaternityMaxWeeks"`
	StillbirthWeeks              int `json:"stillbirthWeeks"`
	MinDaysAfterChildDeath       int `json:"minDaysAfterChildDeath"`
	DeathBeforeWeeks             int `json:"deathBeforeWeeks"`

	PaternityWeeks          int `json:"paternityWeeks"`
	PaternityMaxParts       int `json:"paternityMaxParts"`
	PaternityMinPartWeeks   int `json:"paternityMinPartWeeks"`
	PaternityChildAgeMonths int `json:"paternityChildAgeMonths"`

	MaternityEquivalentMinWeeks int `json:"maternityEquivalentMinWeeks"`
	SupplementaryCapLongWeeks   int `json:"supplementaryCapLongWeeks"`
	SupplementaryCapShortWeeks  int `json:"supplementaryCapShortWeeks"`
	WeekDays                    int `json:"weekDays"`

	SickPayDaysUnder50    int `json:"sickPayDaysUnder50"`
	SickPayDaysAge50      int `json:"sickPayDaysAge50"`
	BenefitPeriodDays     int `json:"benefitPeriodDays"`
	BenefitPeriodGapDays  int `json:"benefitPeriodGapDays"`
	WaitingDaysCompulsory int `json:"waitingDaysCompulsory"`
	WaitingDaysVoluntary  int `json:"waitingDaysVoluntary"`

	// Rehab rates are art. 19 of the sickness-benefit act: 90% for the first
	// three months, 75% afterwards, and 100% (SickPregnancyRateBps) when the
	// incapacity falls during pregnancy. Months are counted as DailyDivisor days
	// because this core pays a daily rate. The quarterly valorization index
	// (art. 19 ust. 2) is not stored here.
	RehabFirstRateBps int `json:"rehabFirstRateBps"`
	RehabLaterRateBps int `json:"rehabLaterRateBps"`
	RehabFirstMonths  int `json:"rehabFirstMonths"`
	RehabMaxMonths    int `json:"rehabMaxMonths"`

	CombinedRequestDeadlineDays int `json:"combinedRequestDeadlineDays"`
	PayerInsuredThreshold       int `json:"payerInsuredThreshold"`
	DailyDivisor                int `json:"dailyDivisor"`

	MinWageGrosze                      int64 `json:"minWageGrosze"`
	MaxVoluntaryContributionBaseGrosze int64 `json:"maxVoluntaryContributionBaseGrosze"`
	MaxNonEmployeeBenefitBasisGrosze   int64 `json:"maxNonEmployeeBenefitBasisGrosze"`
}

// Default is the 2026 parameter set from the challenge annex and the Labour Code.
func Default() Parameters {
	return Parameters{
		Version: "2026.1",

		SocialContributionNumerator:   1371,
		SocialContributionDenominator: 10000,

		MaternityRateBps:             10000,
		ParentalRateBps:              7000,
		CombinedRequestRateBps:       8150,
		SecondParentExclusiveRateBps: 7000,
		PaternityRateBps:             10000,
		SupplementaryRateBps:         10000,
		SickPregnancyRateBps:         10000,
		SickDefaultRateBps:           8000,
		SickPayPregnancyRateBps:      10000,

		MaternityWeeksByChildren: []int{0, 20, 31, 33, 35, 37},

		ParentalWeeksOne:           41,
		ParentalWeeksMulti:         43,
		ParentalWeeksOneZaZyciem:   65,
		ParentalWeeksMultiZaZyciem: 67,
		ExclusiveParentalWeeks:     9,

		ParentalCalendarCapOne:           82,
		ParentalCalendarCapMulti:         86,
		ParentalCalendarCapOneZaZyciem:   130,
		ParentalCalendarCapMultiZaZyciem: 134,

		ShortParentalWeeks:               38,
		ShortParentalWeeksZaZyciem:       62,
		ShortParentalCalendarCap:         76,
		ShortParentalCalendarCapZaZyciem: 124,

		ParentalMaxParts:             5,
		ParentalChildAgeYearEnd:      6,
		MotherMinWeeksBeforeHandoff:  14,
		MotherMinWeeksSpecialHandoff: 8,
		EarlyMaternityMaxWeeks:       6,
		StillbirthWeeks:              8,
		MinDaysAfterChildDeath:       7,
		DeathBeforeWeeks:             8,

		PaternityWeeks:          2,
		PaternityMaxParts:       2,
		PaternityMinPartWeeks:   1,
		PaternityChildAgeMonths: 12,

		MaternityEquivalentMinWeeks: 9,
		SupplementaryCapLongWeeks:   15,
		SupplementaryCapShortWeeks:  8,
		WeekDays:                    7,

		SickPayDaysUnder50:    33,
		SickPayDaysAge50:      14,
		BenefitPeriodDays:     270,
		BenefitPeriodGapDays:  60,
		WaitingDaysCompulsory: 30,
		WaitingDaysVoluntary:  90,

		RehabFirstRateBps: 9000,
		RehabLaterRateBps: 7500,
		RehabFirstMonths:  3,
		RehabMaxMonths:    12,

		CombinedRequestDeadlineDays: 21,
		PayerInsuredThreshold:       20,
		DailyDivisor:                30,

		MinWageGrosze:                      4_806_00,
		MaxVoluntaryContributionBaseGrosze: 23_550_00,
		MaxNonEmployeeBenefitBasisGrosze:   20_321_30,
	}
}

// Validate rejects a parameter set that would divide by zero or drop a duration.
func (p Parameters) Validate() error {
	if p.Version == "" {
		return apperr.E("PARAMS_VERSION", "Wersja parametrów nie może być pusta.")
	}
	if p.SocialContributionDenominator <= 0 || p.DailyDivisor <= 0 || p.WeekDays <= 0 {
		return apperr.E("PARAMS_DIVISOR", "Mianowniki i dzielniki muszą być dodatnie.")
	}
	if p.SocialContributionNumerator < 0 || p.SocialContributionNumerator > p.SocialContributionDenominator {
		return apperr.E("PARAMS_RATE", "Stopa składki jest poza zakresem 0–100%.")
	}
	rates := []int{
		p.MaternityRateBps, p.ParentalRateBps, p.CombinedRequestRateBps,
		p.SecondParentExclusiveRateBps, p.PaternityRateBps, p.SupplementaryRateBps,
		p.SickPregnancyRateBps, p.SickDefaultRateBps, p.SickPayPregnancyRateBps,
		p.RehabFirstRateBps, p.RehabLaterRateBps,
	}
	for _, r := range rates {
		if r < 0 || r > 10000 {
			return apperr.E("PARAMS_RATE", "Stawka zasiłku musi być w zakresie 0–10000 bps.")
		}
	}
	if len(p.MaternityWeeksByChildren) < 2 {
		return apperr.E("PARAMS_WEEKS", "Brakuje wymiaru urlopu macierzyńskiego.")
	}
	if p.ExclusiveParentalWeeks < 0 || p.ParentalWeeksOne <= p.ExclusiveParentalWeeks*2 {
		return apperr.E("PARAMS_WEEKS", "Pula urlopu rodzicielskiego musi pomieścić dwie części niezbywalne.")
	}
	if p.PayerInsuredThreshold < 0 || p.BenefitPeriodDays <= 0 || p.MinWageGrosze <= 0 {
		return apperr.E("PARAMS_RANGE", "Próg płatnika, okres zasiłkowy i płaca minimalna muszą być dodatnie.")
	}
	if p.RehabFirstMonths <= 0 || p.RehabMaxMonths < p.RehabFirstMonths {
		return apperr.E("PARAMS_RANGE", "Świadczenie rehabilitacyjne trwa najpierw kilka miesięcy i nie dłużej niż 12.")
	}
	return nil
}

// Clone returns a deep copy safe to hand to callers.
func (p Parameters) Clone() Parameters {
	out := p
	out.MaternityWeeksByChildren = append([]int(nil), p.MaternityWeeksByChildren...)
	return out
}

// MaternityWeeks returns the maternity (or maternity-equivalent) length for a child count.
func (p Parameters) MaternityWeeks(children int) (int, error) {
	if children < 1 {
		return 0, apperr.E("CHILD_COUNT", "Liczba dzieci musi być dodatnia.")
	}
	table := p.MaternityWeeksByChildren
	if children >= len(table) {
		return table[len(table)-1], nil
	}
	weeks := table[children]
	if weeks <= 0 {
		return 0, apperr.E("PARAMS_WEEKS", "Wymiar urlopu macierzyńskiego nie jest ustawiony.")
	}
	return weeks, nil
}

// ParentalPool is the shared parental-leave pool before the non-transferable split.
func (p Parameters) ParentalPool(children int, zaZyciem, short bool) (int, error) {
	if children < 1 {
		return 0, apperr.E("CHILD_COUNT", "Liczba dzieci musi być dodatnia.")
	}
	if short {
		if zaZyciem {
			return p.ShortParentalWeeksZaZyciem, nil
		}
		return p.ShortParentalWeeks, nil
	}
	multi := children >= 2
	switch {
	case multi && zaZyciem:
		return p.ParentalWeeksMultiZaZyciem, nil
	case multi:
		return p.ParentalWeeksMulti, nil
	case zaZyciem:
		return p.ParentalWeeksOneZaZyciem, nil
	default:
		return p.ParentalWeeksOne, nil
	}
}

// ParentalCalendarCap is the maximum calendar length after combining leave with work.
func (p Parameters) ParentalCalendarCap(children int, zaZyciem, short bool) (int, error) {
	if _, err := p.ParentalPool(children, zaZyciem, short); err != nil {
		return 0, err
	}
	if short {
		if zaZyciem {
			return p.ShortParentalCalendarCapZaZyciem, nil
		}
		return p.ShortParentalCalendarCap, nil
	}
	multi := children >= 2
	switch {
	case multi && zaZyciem:
		return p.ParentalCalendarCapMultiZaZyciem, nil
	case multi:
		return p.ParentalCalendarCapMulti, nil
	case zaZyciem:
		return p.ParentalCalendarCapOneZaZyciem, nil
	default:
		return p.ParentalCalendarCapOne, nil
	}
}
