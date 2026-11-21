// Package maternity is the integrated maternity-benefit calculator.
package maternity

import "github.com/Jakubpoland/ZUS/backend/internal/money"

// Input is one simulation of leave and benefit choices.
type Input struct {
	// Situation is "birth", "foster" or "adoption".
	Situation  string `json:"situation"`
	ChildCount int    `json:"childCount"`
	ZaZyciem   bool   `json:"zaZyciem"`
	// InsuredOnEvent is insurance on the day of birth or of accepting the child.
	InsuredOnEvent      bool `json:"insuredOnEvent"`
	CombinedRateRequest bool `json:"combinedRateRequest"`
	// DaysAfterEventForCombinedRequest is how many days after birth the mother filed.
	// Nil means the date was not given.
	DaysAfterEventForCombinedRequest *int `json:"daysAfterEventForCombinedRequest"`
	PreBirthWeeks                    int  `json:"preBirthWeeks"`
	// TakeoverReason is none, resignation_after_14, incapacity, hospital, death,
	// abandonment or mother_uninsured.
	TakeoverReason string `json:"takeoverReason"`
	// SimultaneousParental means both parents use parental leave over the same days.
	// The calendar cap is then checked per parent. Otherwise the uses are sequential
	// and their calendar lengths are added.
	SimultaneousParental bool                `json:"simultaneousParental"`
	ParentalParts        int                 `json:"parentalParts"`
	Supplementary        *SupplementaryInput `json:"supplementary"`
	// Children describes each child when the outcome is not "all alive".
	// Empty means every child is alive.
	Children []ChildState `json:"children"`
	Mother   ParentInput  `json:"mother"`
	Father   ParentInput  `json:"father"`
	// Acceptance is required for foster and adoption. Days are counted by the client.
	Acceptance *AcceptanceInput `json:"acceptance"`
}

// SupplementaryInput is the hospital data for complementary maternity leave.
// HospitalDays is the stay already limited to the statutory window
// (up to the 15th week, or the 8th week). HospitalDaysFromDay5 is the stay
// counted from day 5 for a term birth.
type SupplementaryInput struct {
	PregnancyWeekAtBirth   int    `json:"pregnancyWeekAtBirth"`
	LowestBirthWeightGrams int    `json:"lowestBirthWeightGrams"`
	HospitalDays           int    `json:"hospitalDays"`
	HospitalDaysFromDay5   int    `json:"hospitalDaysFromDay5"`
	TermHospitalQualifies  bool   `json:"termHospitalQualifies"`
	AssignedTo             string `json:"assignedTo"`
}

// ChildState is one child from a single birth.
type ChildState struct {
	Stillbirth bool `json:"stillbirth"`
	Alive      bool `json:"alive"`
	// DeathDay is the day of life, counting the birth date as day 0.
	DeathDay *int `json:"deathDay"`
}

// ParentInput is one parent's decision.
type ParentInput struct {
	HasRight bool `json:"hasRight"`
	// Title is employee, mandate, business or other.
	Title                       string    `json:"title"`
	BasisGrosze                 int64     `json:"basisGrosze"`
	MaternityWeeks              *int      `json:"maternityWeeks"`
	MaternityDays               *int      `json:"maternityDays"`
	ParentalWeeks               int       `json:"parentalWeeks"`
	PaternityWeeks              int       `json:"paternityWeeks"`
	Work                        *Fraction `json:"work"`
	PayerInsuredCount           *int      `json:"payerInsuredCount"`
	BasisChangedDuringPregnancy bool      `json:"basisChangedDuringPregnancy"`
	PossibleShamEngagement      bool      `json:"possibleShamEngagement"`
}

// Fraction is a working-time share. 1/2 is the maximum while on parental leave.
type Fraction struct {
	Numerator   int `json:"numerator"`
	Denominator int `json:"denominator"`
}

// AcceptanceInput carries the client's day count until the age limit.
type AcceptanceInput struct {
	DaysUntilAgeLimit int `json:"daysUntilAgeLimit"`
}

// Warning is shown next to the result. It does not by itself deny a segment.
type Warning struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Document is a form or attachment the person will need.
type Document struct {
	Code    string `json:"code"`
	Person  string `json:"person"`
	Message string `json:"message"`
}

// Segment is one continuous piece of benefit for one person.
type Segment struct {
	ID              string       `json:"id"`
	Person          string       `json:"person"`
	Benefit         string       `json:"benefit"`
	RateBps         int          `json:"rateBps"`
	Basis           money.Amount `json:"basis"`
	Monthly         money.Amount `json:"monthly"`
	Daily           money.Amount `json:"daily"`
	PoolDays        int          `json:"poolDays"`
	CalendarDays    int          `json:"calendarDays"`
	ExtensionDays   int          `json:"extensionDays"`
	WorkNumerator   int          `json:"workNumerator"`
	WorkDenominator int          `json:"workDenominator"`
	Total           money.Amount `json:"total"`
	Payer           string       `json:"payer"`
}

// Entitlement is what the family can use, before the requested split.
type Entitlement struct {
	MaternityDays            int  `json:"maternityDays"`
	MaternityWeeks           int  `json:"maternityWeeks"`
	ParentalPoolWeeks        int  `json:"parentalPoolWeeks"`
	ExclusiveWeeksPerParent  int  `json:"exclusiveWeeksPerParent"`
	SharedWeeks              int  `json:"sharedWeeks"`
	MaxWeeksForOneParent     int  `json:"maxWeeksForOneParent"`
	ParentalCalendarCapWeeks int  `json:"parentalCalendarCapWeeks"`
	SupplementaryWeeks       int  `json:"supplementaryWeeks"`
	PaternityWeeks           int  `json:"paternityWeeks"`
	ShortParental            bool `json:"shortParental"`
}

// Result is the simulation.
type Result struct {
	Entitlement         Entitlement  `json:"entitlement"`
	Segments            []Segment    `json:"segments"`
	MotherTotal         money.Amount `json:"motherTotal"`
	FatherTotal         money.Amount `json:"fatherTotal"`
	GrandTotal          money.Amount `json:"grandTotal"`
	CombinedRateApplied bool         `json:"combinedRateApplied"`
	Warnings            []Warning    `json:"warnings"`
	Documents           []Document   `json:"documents"`
	ParametersVersion   string       `json:"parametersVersion"`
}
