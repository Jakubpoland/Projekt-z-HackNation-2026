// Package basis computes the monthly benefit assessment base.
package basis

import (
	"github.com/Jakubpoland/ZUS/backend/internal/apperr"
	"github.com/Jakubpoland/ZUS/backend/internal/money"
	"github.com/Jakubpoland/ZUS/backend/internal/params"
)

// Month is one full calendar month of an employee's earnings.
type Month struct {
	// WorkedTimeBps is the share of the month's working time. 10000 = the full month.
	// A month below 5000 bps is left out. A month at or above 5000 bps is completed.
	WorkedTimeBps int `json:"workedTimeBps"`
	// FixedGrosze is the full-month contractual amount of components that are completed.
	FixedGrosze int64 `json:"fixedGrosze"`
	// VariableActualGrosze is divided by days worked and multiplied by working days.
	VariableActualGrosze int64 `json:"variableActualGrosze"`
	VariableDaysWorked   int   `json:"variableDaysWorked"`
	VariableWorkingDays  int   `json:"variableWorkingDays"`
	// NonCompletedGrosze is overtime, night allowance and similar pay, taken as actually paid.
	NonCompletedGrosze int64 `json:"nonCompletedGrosze"`
}

// Input is one basis calculation.
type Input struct {
	// Kind is "employee" or "non_employee".
	Kind string `json:"kind"`
	// Mode is "average", "first_month", "second_month" or "carry_over".
	Mode                  string  `json:"mode"`
	Months                []Month `json:"months"`
	ContractMonthlyGrosze int64   `json:"contractMonthlyGrosze"`
	SecondMonthGrosze     int64   `json:"secondMonthGrosze"`
	PreviousBasisGrosze   int64   `json:"previousBasisGrosze"`
	// MonthsSincePreviousBenefit below 1 keeps the previous basis.
	MonthsSincePreviousBenefit *int `json:"monthsSincePreviousBenefit"`
	// QuarterlyTotalGrosze is the sum paid for the four previous quarters. One twelfth is added.
	QuarterlyTotalGrosze int64 `json:"quarterlyTotalGrosze"`
	// AnnualGrosze is the previous year's annual component. One twelfth is added.
	AnnualGrosze int64 `json:"annualGrosze"`
	// RevenuesGrosze are monthly contribution bases of a non-employee.
	RevenuesGrosze []int64 `json:"revenuesGrosze"`
	// ApplyEmployeeMinimum raises the result to the minimum wage after the 13.71% reduction.
	ApplyEmployeeMinimum bool `json:"applyEmployeeMinimum"`
}

// Result is the monthly assessment base and the steps that produced it.
type Result struct {
	Basis             money.Amount `json:"basis"`
	GrossAverage      money.Amount `json:"grossAverage"`
	Contribution      money.Amount `json:"contribution"`
	MonthsIncluded    int          `json:"monthsIncluded"`
	MonthsSkipped     int          `json:"monthsSkipped"`
	CarriedOver       bool         `json:"carriedOver"`
	MinimumApplied    bool         `json:"minimumApplied"`
	CapApplied        bool         `json:"capApplied"`
	ParametersVersion string       `json:"parametersVersion"`
	Notes             []string     `json:"notes"`
}

// Calculate returns the monthly benefit basis in grosze.
func Calculate(p params.Parameters, in Input) (Result, error) {
	if in.MonthsSincePreviousBenefit != nil && *in.MonthsSincePreviousBenefit < 1 && in.PreviousBasisGrosze > 0 {
		return Result{
			Basis:             money.NewAmount(money.Grosze(in.PreviousBasisGrosze)),
			GrossAverage:      money.NewAmount(money.Grosze(in.PreviousBasisGrosze)),
			CarriedOver:       true,
			ParametersVersion: p.Version,
			Notes: []string{
				"Przerwa między zasiłkami jest krótsza niż miesiąc kalendarzowy, więc zostaje poprzednia podstawa.",
			},
		}, nil
	}

	switch in.Kind {
	case "employee":
		return employee(p, in)
	case "non_employee":
		return nonEmployee(p, in)
	default:
		return Result{}, apperr.E("BASIS_KIND", "Rodzaj ubezpieczonego musi być employee albo non_employee.")
	}
}

func employee(p params.Parameters, in Input) (Result, error) {
	var gross int64
	var included, skipped int
	notes := []string{}

	switch in.Mode {
	case "carry_over":
		if in.PreviousBasisGrosze <= 0 {
			return Result{}, apperr.E("BASIS_PREVIOUS", "Brak poprzedniej podstawy do przeniesienia.")
		}
		return Result{
			Basis:             money.NewAmount(money.Grosze(in.PreviousBasisGrosze)),
			GrossAverage:      money.NewAmount(money.Grosze(in.PreviousBasisGrosze)),
			CarriedOver:       true,
			ParametersVersion: p.Version,
			Notes:             []string{"Przyjęto podstawę ustaloną dla poprzedniego zasiłku."},
		}, nil
	case "first_month":
		if in.ContractMonthlyGrosze <= 0 {
			return Result{}, apperr.E("BASIS_CONTRACT", "Podaj wynagrodzenie z umowy uzupełnione do pełnego miesiąca.")
		}
		gross = in.ContractMonthlyGrosze
		included = 1
		notes = append(notes, "Choroba w pierwszym miesiącu: wynagrodzenie z umowy uzupełnione do pełnego miesiąca.")
	case "second_month":
		if in.SecondMonthGrosze <= 0 {
			return Result{}, apperr.E("BASIS_CONTRACT", "Podaj wynagrodzenie za pełny miesiąc.")
		}
		gross = in.SecondMonthGrosze
		included = 1
		notes = append(notes, "Choroba w drugim miesiącu: wynagrodzenie za pełny miesiąc, z uzupełnieniem pierwszego, jeśli był niepełny.")
	case "average", "":
		var sum int64
		for _, m := range in.Months {
			if m.WorkedTimeBps < 5000 {
				skipped++
				continue
			}
			variable, err := completeVariable(m)
			if err != nil {
				return Result{}, err
			}
			sum += m.FixedGrosze + variable + m.NonCompletedGrosze
			included++
		}
		if included == 0 {
			return Result{}, apperr.E("BASIS_MONTHS", "Żaden miesiąc nie wszedł do średniej. Miesiąc przepracowany w mniej niż połowie jest pomijany.")
		}
		gross = money.RoundDiv(sum, int64(included))
		notes = append(notes, "Średnia z pełnych miesięcy, które weszły do podstawy.")
	default:
		return Result{}, apperr.E("BASIS_MODE", "Tryb musi być average, first_month, second_month albo carry_over.")
	}

	if in.QuarterlyTotalGrosze > 0 {
		gross += money.RoundDiv(in.QuarterlyTotalGrosze, 12)
		notes = append(notes, "Doliczono 1/12 premii kwartalnych z czterech poprzednich kwartałów.")
	}
	if in.AnnualGrosze > 0 {
		gross += money.RoundDiv(in.AnnualGrosze, 12)
		notes = append(notes, "Doliczono 1/12 składnika rocznego.")
	}

	net, contribution := deduct(p, gross)
	minimumApplied := false
	if in.ApplyEmployeeMinimum {
		floor, _ := deduct(p, p.MinWageGrosze)
		if net < floor {
			net = floor
			minimumApplied = true
			notes = append(notes, "Podniesiono podstawę do minimalnej, liczonej od płacy minimalnej po składkach 13,71%.")
		}
	}
	return Result{
		Basis:             money.NewAmount(net),
		GrossAverage:      money.NewAmount(money.Grosze(gross)),
		Contribution:      money.NewAmount(contribution),
		MonthsIncluded:    included,
		MonthsSkipped:     skipped,
		MinimumApplied:    minimumApplied,
		ParametersVersion: p.Version,
		Notes:             notes,
	}, nil
}

func nonEmployee(p params.Parameters, in Input) (Result, error) {
	if len(in.RevenuesGrosze) == 0 {
		return Result{}, apperr.E("BASIS_REVENUE", "Podaj przychody z miesięcy poprzedzających miesiąc niezdolności.")
	}
	var sum int64
	for _, r := range in.RevenuesGrosze {
		if r < 0 {
			return Result{}, apperr.E("BASIS_REVENUE", "Przychód nie może być ujemny.")
		}
		sum += r
	}
	gross := money.RoundDiv(sum, int64(len(in.RevenuesGrosze)))
	net, contribution := deduct(p, gross)
	capApplied := false
	if net > money.Grosze(p.MaxNonEmployeeBenefitBasisGrosze) {
		net = money.Grosze(p.MaxNonEmployeeBenefitBasisGrosze)
		capApplied = true
	}
	return Result{
		Basis:             money.NewAmount(net),
		GrossAverage:      money.NewAmount(money.Grosze(gross)),
		Contribution:      money.NewAmount(contribution),
		MonthsIncluded:    len(in.RevenuesGrosze),
		CapApplied:        capApplied,
		ParametersVersion: p.Version,
		Notes: []string{
			"Podstawa osoby niebędącej pracownikiem to średni miesięczny przychód pomniejszony o 13,71%, nie wyżej niż limit z parametrów.",
		},
	}, nil
}

func completeVariable(m Month) (int64, error) {
	if m.VariableActualGrosze == 0 {
		return 0, nil
	}
	if m.VariableDaysWorked <= 0 || m.VariableWorkingDays <= 0 {
		return 0, apperr.E("BASIS_DAYS", "Uzupełnienie składnika zmiennego wymaga dni przepracowanych i dni roboczych miesiąca.")
	}
	return money.RoundDiv(m.VariableActualGrosze*int64(m.VariableWorkingDays), int64(m.VariableDaysWorked)), nil
}

func deduct(p params.Parameters, gross int64) (money.Grosze, money.Grosze) {
	contribution := money.MulDiv(gross, p.SocialContributionNumerator, p.SocialContributionDenominator)
	return money.Grosze(gross) - contribution, contribution
}
