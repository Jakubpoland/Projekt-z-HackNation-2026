package maternity

func documents(in Input, out Result) []Document {
	docs := []Document{}
	add := func(code, person, message string) {
		docs = append(docs, Document{Code: code, Person: person, Message: message})
	}
	for _, person := range []struct {
		name   string
		parent ParentInput
	}{
		{"mother", in.Mother},
		{"father", in.Father},
	} {
		if !person.parent.HasRight {
			continue
		}
		switch person.parent.Title {
		case "employee":
			add("wniosek-o-urlop", person.name, "Pracownik składa pracodawcy wniosek o urlop związany z rodzicielstwem. Uprawniony płatnik sam wypłaca zasiłek albo przekazuje do ZUS zaświadczenie Z-3.")
			add("Z-3", person.name, "Zaświadczenie płatnika składek Z-3, gdy zasiłek wypłaca ZUS.")
		case "mandate":
			add("ZAM", person.name, "Wniosek o zasiłek macierzyński. Od 24 października 2026 r. obejmuje też dawne formularze ZUR i ZAO.")
			add("Z-3a", person.name, "Zaświadczenie płatnika składek Z-3a dołącza płatnik, gdy zasiłek wypłaca ZUS.")
		case "business":
			add("ZAM", person.name, "Osoba prowadząca działalność składa wniosek ZAM bezpośrednio do ZUS.")
		default:
			add("ZAM", person.name, "Wniosek o zasiłek macierzyński składa się do ZUS albo do uprawnionego płatnika, zależnie od tytułu ubezpieczenia.")
		}
	}
	if in.ZaZyciem {
		add("za-zyciem", "child", "Zaświadczenie „Za życiem” wydłuża urlop rodzicielski.")
	}
	if in.Supplementary != nil && out.Entitlement.SupplementaryWeeks > 0 {
		add("zaswiadczenie-szpital", "child", "Zaświadczenie szpitala o okresie pobytu dziecka i tygodniu ciąży albo masie urodzeniowej. Wniosek składa się co najmniej 21 dni przed końcem urlopu macierzyńskiego.")
	}
	for _, child := range in.Children {
		if child.Stillbirth || !child.Alive {
			add("zgon-dziecka", "child", "Do wniosku dołącza się dokument potwierdzający urodzenie martwe albo zgon dziecka.")
			break
		}
	}
	if in.Situation == "foster" || in.Situation == "adoption" {
		add("przyjecie-dziecka", "child", "Dokument przyjęcia dziecka na wychowanie jako rodzina zastępcza niezawodowa albo wystąpienia do sądu o przysposobienie.")
	}
	for _, seg := range out.Segments {
		if seg.Benefit == "maternity_amount_until_birth" && seg.CalendarDays > 0 {
			add("ZAM-do-porodu", "mother", "Zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu wypłaca ZUS. Do wniosku dołącza się dokument ustania zatrudnienia, a przy rozwiązaniu umowy z naruszeniem prawa — prawomocny wyrok.")
			break
		}
	}
	if out.CombinedRateApplied {
		add("wniosek-81-5", "mother", "Pisemny wniosek matki o zasiłek za pełny okres urlopu macierzyńskiego i rodzicielskiego, złożony nie później niż 21 dni po porodzie.")
	}
	return docs
}
