package maternity

import (
	"github.com/Jakubpoland/ZUS/backend/internal/apperr"
	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

func maternityDays(p params.Parameters, in Input) (days int, shortParental bool, err error) {
	switch in.Situation {
	case "birth":
		days, err = birthMaternityDays(p, in)
		return days, false, err
	case "foster", "adoption":
		if in.Acceptance == nil {
			return 0, false, apperr.E("ACCEPTANCE", "Dla przyjęcia dziecka podaj liczbę dni do granicy wieku.")
		}
		return acceptanceMaternityDays(p, in.ChildCount, in.Acceptance.DaysUntilAgeLimit, in.ZaZyciem)
	default:
		return 0, false, apperr.E("SITUATION", "Sytuacja musi być birth, foster albo adoption.")
	}
}

func birthMaternityDays(p params.Parameters, in Input) (int, error) {
	fullWeeks, err := p.MaternityWeeks(in.ChildCount)
	if err != nil {
		return 0, err
	}
	full := fullWeeks * p.WeekDays
	if len(in.Children) == 0 {
		return full, nil
	}
	if len(in.Children) != in.ChildCount {
		return 0, apperr.E("CHILDREN", "Liczba opisów dzieci musi być zgodna z liczbą dzieci przy porodzie.")
	}
	alive := 0
	latestDeath := 0
	anyDeath := false
	deathBeforeWindow := false
	deathAfterWindow := false
	window := p.DeathBeforeWeeks * p.WeekDays
	for _, child := range in.Children {
		died := child.Stillbirth || !child.Alive
		if !died {
			alive++
			continue
		}
		anyDeath = true
		day := 0
		if child.DeathDay != nil && !child.Stillbirth {
			if *child.DeathDay < 0 {
				return 0, apperr.E("DEATH_DAY", "Dzień zgonu nie może być ujemny.")
			}
			day = *child.DeathDay
		}
		if day > latestDeath {
			latestDeath = day
		}
		if day < window {
			deathBeforeWindow = true
		} else {
			deathAfterWindow = true
		}
	}
	if !anyDeath {
		return full, nil
	}
	if alive > 0 {
		aliveWeeks, err := p.MaternityWeeks(alive)
		if err != nil {
			return 0, err
		}
		days := aliveWeeks * p.WeekDays
		if deathAfterWindow {
			minEnd := latestDeath + p.MinDaysAfterChildDeath
			if days < minEnd {
				days = minEnd
			}
		}
		return days, nil
	}
	if deathAfterWindow && !deathBeforeWindow {
		return latestDeath + p.MinDaysAfterChildDeath, nil
	}
	days := p.StillbirthWeeks * p.WeekDays
	minEnd := latestDeath + p.MinDaysAfterChildDeath
	if minEnd > days {
		days = minEnd
	}
	return days, nil
}

func acceptanceMaternityDays(p params.Parameters, children, daysUntil int, zaZyciem bool) (int, bool, error) {
	if children < 1 {
		return 0, false, apperr.E("CHILD_COUNT", "Liczba dzieci musi być dodatnia.")
	}
	if daysUntil <= 0 {
		return 0, false, apperr.E("AGE_LIMIT", "Dziecko jest poza granicą wieku dla tego urlopu albo nie podano dni do tej granicy.")
	}
	nominalWeeks, err := p.MaternityWeeks(children)
	if err != nil {
		return 0, false, err
	}
	nominal := nominalWeeks * p.WeekDays
	floor := p.MaternityEquivalentMinWeeks * p.WeekDays
	if daysUntil >= nominal {
		return nominal, false, nil
	}
	if daysUntil < floor {
		return floor, true, nil
	}
	return daysUntil, false, nil
}

// SupplementaryWeeks rounds the hospital stay up to full weeks and applies the cap.
func SupplementaryWeeks(p params.Parameters, in SupplementaryInput) (int, error) {
	if in.HospitalDays < 0 || in.HospitalDaysFromDay5 < 0 || in.LowestBirthWeightGrams <= 0 {
		return 0, apperr.E("HOSPITAL", "Podaj dodatnią masę urodzeniową i nieujemną liczbę dni hospitalizacji.")
	}
	if in.PregnancyWeekAtBirth <= 0 {
		return 0, apperr.E("PREGNANCY_WEEK", "Podaj tydzień ciąży w dniu porodu.")
	}
	long := in.PregnancyWeekAtBirth < 28 || in.LowestBirthWeightGrams <= 1000
	var cap, days int
	switch {
	case long:
		cap = p.SupplementaryCapLongWeeks
		days = in.HospitalDays
	case in.PregnancyWeekAtBirth >= 28 && in.PregnancyWeekAtBirth < 37 && in.LowestBirthWeightGrams > 1000:
		cap = p.SupplementaryCapShortWeeks
		days = in.HospitalDays
	case in.PregnancyWeekAtBirth >= 37 && in.TermHospitalQualifies:
		cap = p.SupplementaryCapShortWeeks
		days = in.HospitalDaysFromDay5
	default:
		return 0, nil
	}
	if days == 0 {
		return 0, nil
	}
	weeks := (days + p.WeekDays - 1) / p.WeekDays
	if weeks > cap {
		weeks = cap
	}
	return weeks, nil
}
