package maternity

import (
	"github.com/Jakubpoland/ZUS/backend/internal/apperr"
	"github.com/Jakubpoland/ZUS/backend/internal/money"
	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

// Simulate builds the entitlement and the requested split into paid segments.
func Simulate(p params.Parameters, in Input) (Result, error) {
	if err := p.Validate(); err != nil {
		return Result{}, err
	}
	if in.TakeoverReason == "" {
		in.TakeoverReason = "none"
	}
	maternity, short, err := maternityDays(p, in)
	if err != nil {
		return Result{}, err
	}
	pool, err := p.ParentalPool(in.ChildCount, in.ZaZyciem, short)
	if err != nil {
		return Result{}, err
	}
	capWeeks, err := p.ParentalCalendarCap(in.ChildCount, in.ZaZyciem, short)
	if err != nil {
		return Result{}, err
	}
	supplementary := 0
	if in.Supplementary != nil {
		supplementary, err = SupplementaryWeeks(p, *in.Supplementary)
		if err != nil {
			return Result{}, err
		}
	}
	exclusive := p.ExclusiveParentalWeeks
	shared := pool - exclusive*2
	if shared < 0 {
		return Result{}, apperr.E("PARAMS_WEEKS", "Pula urlopu rodzicielskiego jest krótsza niż dwie części niezbywalne.")
	}

	out := Result{
		Entitlement: Entitlement{
			MaternityDays:            maternity,
			MaternityWeeks:           maternity / p.WeekDays,
			ParentalPoolWeeks:        pool,
			ExclusiveWeeksPerParent:  exclusive,
			SharedWeeks:              shared,
			MaxWeeksForOneParent:     pool - exclusive,
			ParentalCalendarCapWeeks: capWeeks,
			SupplementaryWeeks:       supplementary,
			PaternityWeeks:           p.PaternityWeeks,
			ShortParental:            short,
		},
		Segments:          []Segment{},
		Warnings:          []Warning{},
		Documents:         []Document{},
		ParametersVersion: p.Version,
		MotherTotal:       money.NewAmount(0),
		FatherTotal:       money.NewAmount(0),
		GrandTotal:        money.NewAmount(0),
	}

	if in.Situation == "birth" && in.PreBirthWeeks > p.EarlyMaternityMaxWeeks {
		return Result{}, apperr.E("PRE_BIRTH", "Przed porodem można wykorzystać co najwyżej 6 tygodni urlopu macierzyńskiego.")
	}
	if in.Situation != "birth" && in.PreBirthWeeks > 0 {
		return Result{}, apperr.E("PRE_BIRTH", "Wcześniejsze rozpoczęcie urlopu dotyczy tylko urodzenia dziecka.")
	}

	if err := applyUntilBirth(p, in, &out); err != nil {
		return Result{}, err
	}

	if !in.InsuredOnEvent {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "NO_INSURANCE_ON_EVENT",
			Message: "Brak ubezpieczenia chorobowego w dniu porodu albo przyjęcia dziecka oznacza brak prawa do zasiłku macierzyńskiego z tego tytułu.",
		})
		if parentClaims(in.Mother) || parentClaims(in.Father) {
			return Result{}, apperr.E("NO_INSURANCE_ON_EVENT", "Nie można naliczyć zasiłku macierzyńskiego bez ubezpieczenia chorobowego w dniu porodu albo przyjęcia dziecka.")
		}
		finalize(in, &out)
		return out, nil
	}

	motherDays, err := requestedMaternityDays(p, in.Mother)
	if err != nil {
		return Result{}, err
	}
	fatherDays, err := requestedMaternityDays(p, in.Father)
	if err != nil {
		return Result{}, err
	}
	if in.Mother.MaternityWeeks == nil && in.Mother.MaternityDays == nil &&
		in.Father.MaternityWeeks == nil && in.Father.MaternityDays == nil {
		if in.Mother.HasRight {
			motherDays = maternity
		} else if in.Father.HasRight {
			fatherDays = maternity
		}
	}
	if err := checkMaternitySplit(p, in, maternity, motherDays, fatherDays); err != nil {
		return Result{}, err
	}
	if in.PreBirthWeeks > 0 && motherDays < in.PreBirthWeeks*p.WeekDays {
		return Result{}, apperr.E("PRE_BIRTH", "Tygodnie przed porodem mieszczą się w urlopie matki i nie mogą być od niego dłuższe.")
	}

	if err := checkParental(p, in, exclusive, shared); err != nil {
		return Result{}, err
	}
	if in.Father.PaternityWeeks < 0 || in.Father.PaternityWeeks > p.PaternityWeeks {
		return Result{}, apperr.E("PATERNITY", "Urlop ojcowski trwa 0, 1 albo 2 tygodnie.")
	}
	if in.Mother.PaternityWeeks > 0 {
		return Result{}, apperr.E("PATERNITY", "Urlop ojcowski jest wyłącznym prawem ojca.")
	}

	parts := in.ParentalParts
	usedParental := in.Mother.ParentalWeeks + in.Father.ParentalWeeks
	if usedParental > 0 && parts == 0 {
		parts = 1
	}
	if parts > p.ParentalMaxParts {
		return Result{}, apperr.E("PARENTAL_PARTS", "Urlop rodzicielski można podzielić na co najwyżej 5 części.")
	}

	combined, err := combinedRate(p, in, &out)
	if err != nil {
		return Result{}, err
	}
	out.CombinedRateApplied = combined

	if motherDays > 0 {
		rate := p.MaternityRateBps
		if combined {
			rate = p.CombinedRequestRateBps
		}
		seg, err := segment(p, "mother-maternity", "mother", "maternity_leave", in.Mother, rate, motherDays, motherDays, 0, Fraction{})
		if err != nil {
			return Result{}, err
		}
		out.Segments = append(out.Segments, seg)
	}
	if fatherDays > 0 {
		rate := p.MaternityRateBps
		if combined {
			rate = p.CombinedRequestRateBps
		}
		seg, err := segment(p, "father-maternity", "father", "maternity_leave", in.Father, rate, fatherDays, fatherDays, 0, Fraction{})
		if err != nil {
			return Result{}, err
		}
		out.Segments = append(out.Segments, seg)
	}

	if supplementary > 0 {
		person, parent := supplementaryParent(in)
		seg, err := segment(p, person+"-supplementary", person, "supplementary_maternity_leave", parent, p.SupplementaryRateBps, supplementary*p.WeekDays, supplementary*p.WeekDays, 0, Fraction{})
		if err != nil {
			return Result{}, err
		}
		out.Segments = append(out.Segments, seg)
	}

	if err := appendParental(p, in, combined, capWeeks, &out); err != nil {
		return Result{}, err
	}

	if in.Father.PaternityWeeks > 0 {
		if !in.Father.HasRight {
			return Result{}, apperr.E("NO_RIGHT", "Ojciec nie ma prawa do urlopu ojcowskiego w tej symulacji.")
		}
		days := in.Father.PaternityWeeks * p.WeekDays
		seg, err := segment(p, "father-paternity", "father", "paternity_leave", in.Father, p.PaternityRateBps, days, days, 0, Fraction{})
		if err != nil {
			return Result{}, err
		}
		out.Segments = append(out.Segments, seg)
		out.Warnings = append(out.Warnings, Warning{
			Code:    "PATERNITY_DEADLINE",
			Message: "Urlop ojcowski trzeba wykorzystać do ukończenia przez dziecko 12. miesiąca życia, a przy adopcji w ciągu 12 miesięcy od uprawomocnienia przysposobienia i nie później niż do 14. roku życia.",
		})
	}

	appendParentWarnings(p, &out, "mother", in.Mother)
	appendParentWarnings(p, &out, "father", in.Father)
	if short {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "SHORT_MATERNITY_EQUIVALENT",
			Message: "Do granicy wieku zostało mniej niż nominalny wymiar, więc przyjęto 9 tygodni urlopu na warunkach urlopu macierzyńskiego i skróconą pulę urlopu rodzicielskiego.",
		})
	}
	if in.ZaZyciem {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "ZA_ZYCIEM",
			Message: "Dłuższy urlop rodzicielski wymaga zaświadczenia „Za życiem”.",
		})
	}

	finalize(in, &out)
	return out, nil
}

func finalize(in Input, out *Result) {
	var mother, father money.Grosze
	for _, seg := range out.Segments {
		switch seg.Person {
		case "mother":
			mother += money.Grosze(seg.Total.Grosze)
		case "father":
			father += money.Grosze(seg.Total.Grosze)
		}
	}
	out.MotherTotal = money.NewAmount(mother)
	out.FatherTotal = money.NewAmount(father)
	out.GrandTotal = money.NewAmount(mother + father)
	out.Documents = documents(in, *out)
}

// applyUntilBirth prices zasiłek w wysokości zasiłku macierzyńskiego until the birth.
// It is paid by ZUS after the employment ended, at the maternity-leave rate.
func applyUntilBirth(p params.Parameters, in Input, out *Result) error {
	if in.UntilBirth == nil {
		return nil
	}
	ub := in.UntilBirth
	if ub.DaysUntilBirth < 0 {
		return apperr.E("UNTIL_BIRTH_DAYS", "Liczba dni do porodu nie może być ujemna.")
	}
	warn := func(code, message string) {
		out.Warnings = append(out.Warnings, Warning{Code: code, Message: message})
	}
	if in.Situation != "birth" {
		warn("UNTIL_BIRTH_SITUATION", "Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu dotyczy ciąży zakończonej porodem.")
		return nil
	}
	if in.Mother.Title != "employee" {
		warn("UNTIL_BIRTH_NOT_EMPLOYEE", "Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu przysługuje pracownicy, której umowa ustała w ciąży.")
		return nil
	}
	switch ub.Reason {
	case "bankruptcy", "liquidation", "employer_death":
	case "unlawful_dismissal":
		if !ub.JudgmentFinal {
			warn("UNTIL_BIRTH_JUDGMENT", "Przy rozwiązaniu umowy z naruszeniem prawa potrzebny jest prawomocny wyrok sądu. Bez niego zasiłek do dnia porodu nie jest liczony.")
			return nil
		}
	default:
		warn("UNTIL_BIRTH_REASON", "Podaj przyczynę ustania zatrudnienia: upadłość, likwidacja, śmierć pracodawcy albo prawomocny wyrok.")
		return nil
	}
	if ub.OtherEmploymentProvided {
		warn("UNTIL_BIRTH_OTHER_JOB", "Zasiłek do dnia porodu nie przysługuje, gdy pracownicy zapewniono inne zatrudnienie.")
		return nil
	}
	if ub.DaysUntilBirth == 0 {
		warn("UNTIL_BIRTH_DAYS", "Podaj liczbę dni od ustania zatrudnienia do dnia porodu.")
		return nil
	}
	if in.Mother.BasisGrosze < 0 {
		return apperr.E("BASIS", "Podstawa wymiaru nie może być ujemna.")
	}
	seg, err := segment(p, "mother-until-birth", "mother", "maternity_amount_until_birth", in.Mother, p.MaternityRateBps, ub.DaysUntilBirth, ub.DaysUntilBirth, 0, Fraction{})
	if err != nil {
		return err
	}
	seg.Payer = "zus"
	out.Segments = append(out.Segments, seg)
	warn("UNTIL_BIRTH", "Zasiłek w wysokości zasiłku macierzyńskiego jest liczony do dnia porodu, w stawce zasiłku za urlop macierzyński. Po ustaniu ubezpieczenia wypłaca go ZUS.")
	if in.PreBirthWeeks > 0 {
		warn("UNTIL_BIRTH_OVERLAP", "Tygodnie urlopu macierzyńskiego przed porodem i zasiłek do dnia porodu mogą dotyczyć tego samego czasu. Nie sumuj ich, jeśli to ten sam okres.")
	}
	if !in.InsuredOnEvent {
		warn("UNTIL_BIRTH_AFTER", "Po porodzie zasiłek macierzyński może przysługiwać mimo ustania ubezpieczenia z tych samych przyczyn. Ta symulacja liczy tylko okres do dnia porodu, bo w dniu porodu nie ma ubezpieczenia.")
	}
	return nil
}

func parentClaims(parent ParentInput) bool {
	return requestedMaternityDaysIgnoringError(parent) > 0 || parent.ParentalWeeks > 0 || parent.PaternityWeeks > 0
}

func requestedMaternityDaysIgnoringError(parent ParentInput) int {
	days, err := requestedMaternityDays(params.Default(), parent)
	if err != nil {
		return 1
	}
	return days
}

func requestedMaternityDays(p params.Parameters, parent ParentInput) (int, error) {
	if parent.MaternityWeeks != nil && parent.MaternityDays != nil {
		return 0, apperr.E("MATERNITY_UNIT", "Podaj albo tygodnie, albo dni urlopu macierzyńskiego, nie oba naraz.")
	}
	if parent.MaternityDays != nil {
		if *parent.MaternityDays < 0 {
			return 0, apperr.E("MATERNITY_DAYS", "Dni urlopu macierzyńskiego nie mogą być ujemne.")
		}
		return *parent.MaternityDays, nil
	}
	if parent.MaternityWeeks != nil {
		if *parent.MaternityWeeks < 0 {
			return 0, apperr.E("MATERNITY_WEEKS", "Tygodnie urlopu macierzyńskiego nie mogą być ujemne.")
		}
		return *parent.MaternityWeeks * p.WeekDays, nil
	}
	return 0, nil
}

func checkMaternitySplit(p params.Parameters, in Input, dimension, motherDays, fatherDays int) error {
	if motherDays+fatherDays > dimension {
		return apperr.E("MATERNITY_SPLIT", "Suma urlopu macierzyńskiego obojga rodziców przekracza wymiar.")
	}
	if motherDays > 0 && !in.Mother.HasRight {
		return apperr.E("NO_RIGHT", "Matka nie ma prawa do urlopu macierzyńskiego w tej symulacji.")
	}
	if fatherDays > 0 && !in.Father.HasRight {
		return apperr.E("NO_RIGHT", "Ojciec nie ma prawa do przejętej części urlopu macierzyńskiego w tej symulacji.")
	}
	if fatherDays == 0 {
		return nil
	}
	minMother := 0
	switch in.TakeoverReason {
	case "none", "resignation_after_14":
		minMother = p.MotherMinWeeksBeforeHandoff * p.WeekDays
	case "incapacity", "hospital", "abandonment":
		minMother = p.MotherMinWeeksSpecialHandoff * p.WeekDays
	case "death", "mother_uninsured":
		minMother = 0
	default:
		return apperr.E("TAKEOVER", "Nieznany powód przejęcia urlopu macierzyńskiego.")
	}
	if in.TakeoverReason == "mother_uninsured" && motherDays > 0 {
		return apperr.E("TAKEOVER", "Matka bez ubezpieczenia nie wykorzystuje własnej części urlopu macierzyńskiego.")
	}
	if motherDays < minMother {
		return apperr.E("MOTHER_MINIMUM", "Matka musi wykorzystać wymagane minimum urlopu macierzyńskiego, zanim ojciec przejmie dalszą część.")
	}
	return nil
}

func checkParental(p params.Parameters, in Input, exclusive, shared int) error {
	if in.Mother.ParentalWeeks < 0 || in.Father.ParentalWeeks < 0 {
		return apperr.E("PARENTAL_WEEKS", "Tygodnie urlopu rodzicielskiego nie mogą być ujemne.")
	}
	if in.Mother.ParentalWeeks > 0 && !in.Mother.HasRight {
		return apperr.E("NO_RIGHT", "Matka nie ma prawa do urlopu rodzicielskiego w tej symulacji.")
	}
	if in.Father.ParentalWeeks > 0 && !in.Father.HasRight {
		return apperr.E("NO_RIGHT", "Ojciec nie ma prawa do urlopu rodzicielskiego w tej symulacji.")
	}
	motherShared := overflow(in.Mother.ParentalWeeks, exclusive)
	fatherShared := overflow(in.Father.ParentalWeeks, exclusive)
	if !in.Mother.HasRight {
		motherShared = in.Mother.ParentalWeeks
	}
	if !in.Father.HasRight {
		fatherShared = in.Father.ParentalWeeks
	}
	if motherShared+fatherShared > shared {
		return apperr.E("PARENTAL_POOL", "Podział urlopu rodzicielskiego przekracza wspólną pulę albo sięga niezbywalnych 9 tygodni drugiego rodzica.")
	}
	if in.Mother.ParentalWeeks > exclusive+shared || in.Father.ParentalWeeks > exclusive+shared {
		return apperr.E("PARENTAL_POOL", "Jedno z rodziców przekracza swój maksymalny wymiar urlopu rodzicielskiego.")
	}
	_ = p
	return nil
}

func overflow(used, exclusive int) int {
	if used <= exclusive {
		return 0
	}
	return used - exclusive
}

func combinedRate(p params.Parameters, in Input, out *Result) (bool, error) {
	if !in.CombinedRateRequest {
		return false, nil
	}
	if !in.Mother.HasRight {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "COMBINED_RATE_UNAVAILABLE",
			Message: "Wniosek o 81,5% składa ubezpieczona matka. Bez jej prawa do zasiłku zostaje stawka 100% i 70%.",
		})
		return false, nil
	}
	if in.DaysAfterEventForCombinedRequest != nil && *in.DaysAfterEventForCombinedRequest > p.CombinedRequestDeadlineDays {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "LATE_COMBINED_REQUEST",
			Message: "Wniosek o 81,5% złożony po 21 dniach nie zmienia stawek. Zostaje 100% i 70%.",
		})
		return false, nil
	}
	if in.DaysAfterEventForCombinedRequest == nil {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "COMBINED_DEADLINE_UNCONFIRMED",
			Message: "Przyjęto wniosek o 81,5%, ale nie podano, w którym dniu po porodzie został złożony. Termin to 21 dni.",
		})
	}
	return true, nil
}

type piece struct {
	id     string
	person string
	parent ParentInput
	weeks  int
	rate   int
}

func appendParental(p params.Parameters, in Input, combined bool, capWeeks int, out *Result) error {
	var pieces []piece
	add := func(person string, parent ParentInput) error {
		if parent.ParentalWeeks == 0 {
			return nil
		}
		exclusiveWeeks := parent.ParentalWeeks
		sharedWeeks := 0
		if parent.ParentalWeeks > p.ExclusiveParentalWeeks {
			exclusiveWeeks = p.ExclusiveParentalWeeks
			sharedWeeks = parent.ParentalWeeks - p.ExclusiveParentalWeeks
		}
		rate := p.ParentalRateBps
		exclusiveRate := rate
		if combined {
			rate = p.CombinedRequestRateBps
			exclusiveRate = rate
			if person == "father" {
				exclusiveRate = p.SecondParentExclusiveRateBps
			}
		}
		if exclusiveWeeks > 0 {
			pieces = append(pieces, piece{person + "-parental-exclusive", person, parent, exclusiveWeeks, exclusiveRate})
		}
		if sharedWeeks > 0 {
			pieces = append(pieces, piece{person + "-parental-shared", person, parent, sharedWeeks, rate})
		}
		return nil
	}
	if err := add("mother", in.Mother); err != nil {
		return err
	}
	if err := add("father", in.Father); err != nil {
		return err
	}

	motherCal, fatherCal := 0, 0
	extensions := parentalExtensions(p, pieces)
	for i, piece := range pieces {
		work, err := workFraction(piece.parent)
		if err != nil {
			return err
		}
		baseDays := piece.weeks * p.WeekDays
		extension := extensions[i]
		calendar := baseDays + extension
		switch piece.person {
		case "mother":
			motherCal += calendar
		case "father":
			fatherCal += calendar
		}
		seg, err := segment(p, piece.id, piece.person, "parental_leave", piece.parent, piece.rate, baseDays, calendar, extension, work)
		if err != nil {
			return err
		}
		out.Segments = append(out.Segments, seg)
	}
	capDays := capWeeks * p.WeekDays
	if in.SimultaneousParental {
		if motherCal > capDays || fatherCal > capDays {
			return apperr.E("PARENTAL_CAP", "Wydłużony urlop rodzicielski przekracza maksymalny wymiar kalendarzowy.")
		}
	} else if motherCal+fatherCal > capDays {
		return apperr.E("PARENTAL_CAP", "Suma wydłużonego urlopu rodzicielskiego przekracza maksymalny wymiar kalendarzowy. Przy korzystaniu naprzemiennym długości się dodają.")
	}
	if motherCal > 0 && fatherCal > 0 && !in.SimultaneousParental {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "ASSUMED_SEQUENTIAL",
			Message: "Oboje rodzice korzystają z urlopu rodzicielskiego. Limit kalendarzowy policzono jak przy wykorzystaniu po sobie. Zaznacz jednoczesne korzystanie, jeśli urlopy nakładają się w czasie.",
		})
	}
	return nil
}

// parentalExtensions applies the work-time extension once per parent, then
// spreads it across that parent's exclusive and shared pieces. Splitting first
// would drop a partial day twice.
func parentalExtensions(p params.Parameters, pieces []piece) []int {
	type group struct {
		indexes []int
		base    int
		work    Fraction
	}
	groups := map[string]*group{}
	order := []string{}
	for i, piece := range pieces {
		g, ok := groups[piece.person]
		if !ok {
			work, _ := workFraction(piece.parent)
			g = &group{work: work}
			groups[piece.person] = g
			order = append(order, piece.person)
		}
		g.indexes = append(g.indexes, i)
		g.base += piece.weeks * p.WeekDays
	}
	out := make([]int, len(pieces))
	for _, person := range order {
		g := groups[person]
		total := 0
		if g.work.Denominator > 0 && g.work.Numerator > 0 && g.base > 0 {
			total = g.base * g.work.Numerator / g.work.Denominator
		}
		used := 0
		for n, idx := range g.indexes {
			if n == len(g.indexes)-1 {
				out[idx] = total - used
				break
			}
			share := total * pieces[idx].weeks * p.WeekDays / g.base
			out[idx] = share
			used += share
		}
	}
	return out
}

func workFraction(parent ParentInput) (Fraction, error) {
	if parent.Work == nil || parent.Work.Numerator == 0 {
		return Fraction{Numerator: 0, Denominator: 1}, nil
	}
	w := *parent.Work
	if w.Denominator <= 0 || w.Numerator < 0 {
		return Fraction{}, apperr.E("WORK_FRACTION", "Wymiar czasu pracy przy urlopie rodzicielskim jest niepoprawny.")
	}
	if w.Numerator*2 > w.Denominator {
		return Fraction{}, apperr.E("WORK_FRACTION", "Przy urlopie rodzicielskim można pracować najwyżej na połowę etatu.")
	}
	if parent.Title != "employee" {
		return Fraction{}, apperr.E("WORK_TITLE", "Łączenie urlopu rodzicielskiego z pracą dotyczy pracownika u pracodawcy, który udziela urlopu.")
	}
	return w, nil
}

func segment(p params.Parameters, id, person, benefit string, parent ParentInput, rateBps, poolDays, calendarDays, extensionDays int, work Fraction) (Segment, error) {
	if poolDays < 0 || calendarDays < 0 {
		return Segment{}, apperr.E("DAYS", "Ujemna długość świadczenia.")
	}
	if parent.BasisGrosze < 0 {
		return Segment{}, apperr.E("BASIS", "Podstawa wymiaru nie może być ujemna.")
	}
	leaveNum, leaveDen := 1, 1
	workNum, workDen := 0, 1
	if work.Denominator > 0 && work.Numerator > 0 {
		leaveNum = work.Denominator - work.Numerator
		leaveDen = work.Denominator
		workNum = work.Numerator
		workDen = work.Denominator
		if leaveNum <= 0 {
			return Segment{}, apperr.E("WORK_FRACTION", "Część urlopu przy łączeniu z pracą musi zostać dodatnia.")
		}
	}
	fullMonthly := money.ApplyBps(money.Grosze(parent.BasisGrosze), rateBps)
	monthly := money.MulDiv(int64(fullMonthly), int64(leaveNum), int64(leaveDen))
	daily := money.DailyFromMonthly(monthly, p.DailyDivisor)
	total := daily * money.Grosze(calendarDays)
	payer, _ := resolvePayer(p, parent)
	return Segment{
		ID:              id,
		Person:          person,
		Benefit:         benefit,
		RateBps:         rateBps,
		Basis:           money.NewAmount(money.Grosze(parent.BasisGrosze)),
		Monthly:         money.NewAmount(monthly),
		Daily:           money.NewAmount(daily),
		PoolDays:        poolDays,
		CalendarDays:    calendarDays,
		ExtensionDays:   extensionDays,
		WorkNumerator:   workNum,
		WorkDenominator: workDen,
		Total:           money.NewAmount(total),
		Payer:           payer,
	}, nil
}

func resolvePayer(p params.Parameters, parent ParentInput) (string, Warning) {
	switch parent.Title {
	case "business":
		return "zus", Warning{}
	case "employee", "mandate", "other", "":
		if parent.PayerInsuredCount == nil {
			return "unknown", Warning{
				Code:    "PAYER_UNKNOWN",
				Message: "Nie podano liczby ubezpieczonych u płatnika. Płatnik wypłaca zasiłek, gdy zgłasza powyżej 20 ubezpieczonych. W pozostałych przypadkach wypłaca ZUS.",
			}
		}
		if *parent.PayerInsuredCount > p.PayerInsuredThreshold {
			return "platnik", Warning{}
		}
		return "zus", Warning{}
	default:
		return "unknown", Warning{Code: "TITLE", Message: "Nieznany tytuł ubezpieczenia. Użyj employee, mandate, business albo other."}
	}
}

func supplementaryParent(in Input) (string, ParentInput) {
	if in.Supplementary != nil && in.Supplementary.AssignedTo == "father" {
		return "father", in.Father
	}
	return "mother", in.Mother
}

func appendParentWarnings(p params.Parameters, out *Result, person string, parent ParentInput) {
	if !parent.HasRight && person == "father" {
		return
	}
	if parent.Title != "" && parent.Title != "employee" {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "NO_LABOUR_CODE_PROTECTION",
			Message: "Szczególna ochrona z Kodeksu pracy dotyczy pracownika. Nie obejmuje osób na umowie cywilnoprawnej ani prowadzących działalność.",
		})
	}
	if parent.BasisChangedDuringPregnancy {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "BASIS_INCREASE_RISK",
			Message: "Podwyższenie podstawy składek w ciąży wyłącznie po to, aby podnieść zasiłek, może skończyć się decyzją ZUS o niższej podstawie.",
		})
	}
	if parent.PossibleShamEngagement {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "SHAM_CONTRACT_RISK",
			Message: "Umowa albo działalność podjęta dla pozoru może zostać zakwestionowana. Bez ubezpieczenia chorobowego nie ma zasiłku.",
		})
	}
	if parent.BasisGrosze == 0 && (parent.ParentalWeeks > 0 || parent.PaternityWeeks > 0 || parent.MaternityWeeks != nil || parent.MaternityDays != nil) {
		out.Warnings = append(out.Warnings, Warning{
			Code:    "MISSING_BASIS",
			Message: "Brak podstawy wymiaru. Wymiary są policzone, a kwoty wynoszą 0,00 zł do czasu podania podstawy.",
		})
	}
	_, warn := resolvePayer(p, parent)
	if warn.Code == "PAYER_UNKNOWN" && parent.HasRight {
		out.Warnings = append(out.Warnings, warn)
	}
	if parent.Title != "" && parent.Title != "employee" && parent.Title != "mandate" && parent.Title != "business" && parent.Title != "other" {
		out.Warnings = append(out.Warnings, Warning{Code: "TITLE", Message: "Nieznany tytuł ubezpieczenia. Użyj employee, mandate, business albo other."})
	}
}
