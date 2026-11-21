package params

// Catalog is the read-only description the frontend uses to build the calculator.
type Catalog struct {
	ParametersVersion string        `json:"parametersVersion"`
	MaternityWeeks    []ChildWeeks  `json:"maternityWeeks"`
	Parental          ParentalTable `json:"parental"`
	Paternity         PaternityInfo `json:"paternity"`
	RatesBps          RatesBps      `json:"ratesBps"`
	Basis             BasisInfo     `json:"basis"`
	Sickness          SicknessInfo  `json:"sickness"`
	Notes             []string      `json:"notes"`
}

// ChildWeeks is one row of a duration table.
type ChildWeeks struct {
	Children int `json:"children"`
	Weeks    int `json:"weeks"`
}

// ParentalTable describes the parental pool and the part-time caps.
type ParentalTable struct {
	OneChildWeeks               int `json:"oneChildWeeks"`
	MultiChildWeeks             int `json:"multiChildWeeks"`
	OneChildZaZyciemWeeks       int `json:"oneChildZaZyciemWeeks"`
	MultiChildZaZyciemWeeks     int `json:"multiChildZaZyciemWeeks"`
	ExclusiveWeeksPerParent     int `json:"exclusiveWeeksPerParent"`
	MaxParts                    int `json:"maxParts"`
	UseUntilEndOfYearChildTurns int `json:"useUntilEndOfYearChildTurns"`
	CalendarCapOne              int `json:"calendarCapOne"`
	CalendarCapMulti            int `json:"calendarCapMulti"`
	CalendarCapOneZaZyciem      int `json:"calendarCapOneZaZyciem"`
	CalendarCapMultiZaZyciem    int `json:"calendarCapMultiZaZyciem"`
	ShortWeeks                  int `json:"shortWeeks"`
	ShortZaZyciemWeeks          int `json:"shortZaZyciemWeeks"`
}

// PaternityInfo is the father-only leave.
type PaternityInfo struct {
	Weeks        int `json:"weeks"`
	MaxParts     int `json:"maxParts"`
	MinPartWeeks int `json:"minPartWeeks"`
	UntilMonths  int `json:"untilMonths"`
}

// RatesBps lists benefit percentages in basis points (10000 = 100%).
type RatesBps struct {
	Maternity             int `json:"maternity"`
	Parental              int `json:"parental"`
	CombinedRequest       int `json:"combinedRequest"`
	SecondParentExclusive int `json:"secondParentExclusive"`
	Paternity             int `json:"paternity"`
	Supplementary         int `json:"supplementary"`
	SickPregnancy         int `json:"sickPregnancy"`
	SickDefault           int `json:"sickDefault"`
}

// BasisInfo exposes the 2026 contribution figures the basis calculator uses.
type BasisInfo struct {
	SocialContributionNumerator   int64  `json:"socialContributionNumerator"`
	SocialContributionDenominator int64  `json:"socialContributionDenominator"`
	MinWage                       Amount `json:"minWage"`
	MaxVoluntaryContributionBase  Amount `json:"maxVoluntaryContributionBase"`
	MaxNonEmployeeBenefitBasis    Amount `json:"maxNonEmployeeBenefitBasis"`
	DailyDivisor                  int    `json:"dailyDivisor"`
}

// Amount is duplicated here to keep the catalog free of an import cycle with money.
type Amount struct {
	Grosze int64  `json:"grosze"`
	Zloty  string `json:"zloty"`
}

// SicknessInfo is the pregnancy sick-pay / benefit period.
type SicknessInfo struct {
	SickPayDaysUnder50    int `json:"sickPayDaysUnder50"`
	SickPayDaysAge50      int `json:"sickPayDaysAge50"`
	BenefitPeriodDays     int `json:"benefitPeriodDays"`
	BenefitPeriodGapDays  int `json:"benefitPeriodGapDays"`
	WaitingDaysCompulsory int `json:"waitingDaysCompulsory"`
	WaitingDaysVoluntary  int `json:"waitingDaysVoluntary"`
	PayerInsuredThreshold int `json:"payerInsuredThreshold"`
}

// BuildCatalog projects the current parameters into the public catalog.
func BuildCatalog(p Parameters) Catalog {
	rows := make([]ChildWeeks, 0, len(p.MaternityWeeksByChildren)-1)
	for i := 1; i < len(p.MaternityWeeksByChildren); i++ {
		label := i
		rows = append(rows, ChildWeeks{Children: label, Weeks: p.MaternityWeeksByChildren[i]})
	}
	return Catalog{
		ParametersVersion: p.Version,
		MaternityWeeks:    rows,
		Parental: ParentalTable{
			OneChildWeeks:               p.ParentalWeeksOne,
			MultiChildWeeks:             p.ParentalWeeksMulti,
			OneChildZaZyciemWeeks:       p.ParentalWeeksOneZaZyciem,
			MultiChildZaZyciemWeeks:     p.ParentalWeeksMultiZaZyciem,
			ExclusiveWeeksPerParent:     p.ExclusiveParentalWeeks,
			MaxParts:                    p.ParentalMaxParts,
			UseUntilEndOfYearChildTurns: p.ParentalChildAgeYearEnd,
			CalendarCapOne:              p.ParentalCalendarCapOne,
			CalendarCapMulti:            p.ParentalCalendarCapMulti,
			CalendarCapOneZaZyciem:      p.ParentalCalendarCapOneZaZyciem,
			CalendarCapMultiZaZyciem:    p.ParentalCalendarCapMultiZaZyciem,
			ShortWeeks:                  p.ShortParentalWeeks,
			ShortZaZyciemWeeks:          p.ShortParentalWeeksZaZyciem,
		},
		Paternity: PaternityInfo{
			Weeks:        p.PaternityWeeks,
			MaxParts:     p.PaternityMaxParts,
			MinPartWeeks: p.PaternityMinPartWeeks,
			UntilMonths:  p.PaternityChildAgeMonths,
		},
		RatesBps: RatesBps{
			Maternity:             p.MaternityRateBps,
			Parental:              p.ParentalRateBps,
			CombinedRequest:       p.CombinedRequestRateBps,
			SecondParentExclusive: p.SecondParentExclusiveRateBps,
			Paternity:             p.PaternityRateBps,
			Supplementary:         p.SupplementaryRateBps,
			SickPregnancy:         p.SickPregnancyRateBps,
			SickDefault:           p.SickDefaultRateBps,
		},
		Basis: BasisInfo{
			SocialContributionNumerator:   p.SocialContributionNumerator,
			SocialContributionDenominator: p.SocialContributionDenominator,
			MinWage:                       amount(p.MinWageGrosze),
			MaxVoluntaryContributionBase:  amount(p.MaxVoluntaryContributionBaseGrosze),
			MaxNonEmployeeBenefitBasis:    amount(p.MaxNonEmployeeBenefitBasisGrosze),
			DailyDivisor:                  p.DailyDivisor,
		},
		Sickness: SicknessInfo{
			SickPayDaysUnder50:    p.SickPayDaysUnder50,
			SickPayDaysAge50:      p.SickPayDaysAge50,
			BenefitPeriodDays:     p.BenefitPeriodDays,
			BenefitPeriodGapDays:  p.BenefitPeriodGapDays,
			WaitingDaysCompulsory: p.WaitingDaysCompulsory,
			WaitingDaysVoluntary:  p.WaitingDaysVoluntary,
			PayerInsuredThreshold: p.PayerInsuredThreshold,
		},
		Notes: []string{
			"Część 9 tygodni urlopu rodzicielskiego każdego z rodziców jest niezbywalna i wchodzi w pulę, a nie dokłada się do niej.",
			"Wniosek matki złożony nie później niż 21 dni po porodzie ustala 81,5% za urlop macierzyński i rodzicielski, z wyjątkiem 9 tygodni drugiego rodzica (70%).",
			"Urlop ojcowski, uzupełniający urlop macierzyński i zasiłek chorobowy z kodem B nie wchodzą w stawkę 81,5%.",
			"Łączenie urlopu rodzicielskiego z pracą dotyczy pracownika i maksymalnie połowy etatu. Wydłużenie = dni urlopu × wymiar etatu, z odrzuceniem niepełnego dnia.",
			"Stawka dzienna = miesięczna / 30, z zaokrągleniem połowy w górę do grosza.",
			"Formularze ZUR, ZAO i Z-3b są zlikwidowane od 24 października 2026. Wniosek o zasiłek to ZAM.",
		},
	}
}

func amount(g int64) Amount {
	sign := ""
	v := g
	if v < 0 {
		sign = "-"
		v = -v
	}
	return Amount{Grosze: g, Zloty: sprintfZloty(sign, v)}
}

func sprintfZloty(sign string, v int64) string {
	return sign + itoa(v/100) + "." + two(v%100)
}

func itoa(n int64) string {
	if n == 0 {
		return "0"
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	return string(buf[i:])
}

func two(n int64) string {
	return string([]byte{byte('0' + n/10), byte('0' + n%10)})
}
