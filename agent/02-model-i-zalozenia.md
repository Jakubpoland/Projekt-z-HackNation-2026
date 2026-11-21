# Model i założenia obliczeń

> Prompt: reguły poniżej zakodował agent na laptopie **thinkpad-t14**. Legion-540 nie powiela ich w TypeScripcie. Jeśli wynik wygląda podejrzanie, poprawka należy do backendu, nie do cichej korekty na froncie.

Źródła użyte przy tym rdzeniu: załącznik hackathonu (wymiary, stawki, podstawa), wyciąg z Kodeksu pracy (urlopy) i opis procesu z treści zadania. Poradnik ZUS i rozporządzenia nie zostały przepisane do repozytorium.

## Zasiłek macierzyński

- Urlop macierzyński: 20 / 31 / 33 / 35 / 37 tygodni dla 1 / 2 / 3 / 4 / 5+ dzieci. Tydzień = 7 dni.
- Urlop na warunkach urlopu macierzyńskiego ma ten sam szereg. Jeśli do granicy wieku zostało mniej niż 9 tygodni, a dziecko nadal jest w wieku uprawniającym, wymiar wynosi 9 tygodni, a pula rodzicielska spada do 38 (62 z „Za życiem”). Granicę wieku (7, 10 albo 14 lat) liczy klient i przysyła `acceptance.daysUntilAgeLimit`.
- Urlop rodzicielski: 41 albo 43 tygodnie, z „Za życiem” 65 albo 67. W tym 9 tygodni niezbywalnych dla każdego rodzica. Jedna osoba dostaje najwyżej pulę minus 9, nawet gdy drugi rodzic nie korzysta.
- Wykorzystanie zapisujemy jako tygodnie z puli. Najpierw schodzi własna dziewiątka, potem część wspólna.
- Wniosek matki do 21. dnia: 81,5% za urlop macierzyński i rodzicielski. Dziewięć tygodni ojca zostaje przy 70%. Spóźniony wniosek wraca do 100% i 70%. Uzupełniający i ojcowski zostają przy 100%.
- Łączenie z pracą: tylko pracownik, najwyżej 1/2 etatu. Wydłużenie w dniach = dni puli × ułamek etatu, z obcięciem niepełnego dnia. Liczone raz na rodzica, potem rozkładane na kawałki exclusive/shared. Limit kalendarzowy: 82 / 86 / 130 / 134 tygodnie. Przy dwóch rodzicach domyślnie dodajemy długości (wykorzystanie po sobie). `simultaneousParental: true` sprawdza limit osobno.
- Limit 76 i 124 tygodni dla skróconej puli 38/62 jest analogią do podwojenia przy połowie etatu. Kodeks podaje liczby 82/86/130/134 dla wymiarów urodzeniowych. To założenie do weryfikacji.
- Urodzenie martwe albo zgon przed 8. tygodniem, gdy nie zostaje dziecko przy życiu: 8 tygodni, nie krócej niż 7 dni od zgonu. Zgon po 8. tygodniu, nikt nie zostaje: 7 dni od zgonu. Gdy ktoś zostaje przy życiu, wymiar jest dla liczby żyjących dzieci.
- Uzupełniający urlop: tydzień za tydzień hospitalizacji, zaokrąglenie w górę, limit 15 albo 8 tygodni według tygodnia ciąży i masy. Przy bliźniętach klient podaje najniższą masę i najdłuższą hospitalizację. Dni mają być już obcięte do okna z Kodeksu.
- Urlop ojcowski: 0–2 tygodnie. Terminu 12 miesięcy ten rdzeń nie liczy, tylko ostrzega.
- Stawka dzienna = zaokrąglona połową w górę miesięczna / 30. Kwota odcinka = stawka dzienna × dni kalendarzowe. Przy pracy na ułamku etatu miesięczna kwota jest najpierw pomnożona przez część urlopu (`1 − etat`).
- Płatnik wypłaca zasiłek, gdy zgłasza powyżej 20 ubezpieczonych. Działalność zawsze idzie do ZUS. Brak liczby ubezpieczonych daje `payer: "unknown"`.

## Podstawa wymiaru

- Pracownik, średnia z miesięcy przepracowanych co najmniej w połowie. Poniżej połowy miesiąc wypada. Składnik stały wchodzi w kwocie z umowy. Zmienny: kwota / dni przepracowane × dni robocze. Potem od średniej odejmuje się 13,71% (1371/10000), składka zaokrąglana połową w górę do grosza.
- Premia kwartalna: 1/12 sumy czterech kwartałów. Roczna: 1/12.
- Przerwa krótsza niż miesiąc (`monthsSincePreviousBenefit` < 1) zostawia poprzednią podstawę.
- Osoba niebędąca pracownikiem: średnia przychodów minus 13,71%, nie wyżej niż parametr `maxNonEmployeeBenefitBasisGrosze` (20 321,30 zł). Przy podstawie składki 23 550,00 zł samo odjęcie 13,71% daje 20 321,29 zł, więc limit z załącznika jeszcze nie ścina. Różnica wynika z zaokrąglenia składki.

## Zasiłek chorobowy w ciąży

- Pracownik: 33 dni wynagrodzenia chorobowego w roku, 14 dni gdy niezdolność przypada w roku następującym po roku 50. urodzin. Dalej zasiłek. Osoba niebędąca pracownikiem: zasiłek od pierwszego dnia.
- 100% zasiłku tylko z kodem B. Bez kodu B, mimo ciąży, zostaje 80% i ostrzeżenie. Wynagrodzenie chorobowe w ciąży jest liczone według stawki 100%.
- Okres zasiłkowy 270 dni. W ciąży nie dolicza się okresów sprzed przerwy. Poza ciążą dolicza się je, gdy przerwa nie przekroczyła 60 dni.
- Wyczekiwanie: 30 dni obowiązkowe, 90 dobrowolne. Wyjątki ustawowe przyjmuje flaga `waitingPeriodAlreadyMet`, rdzeń ich nie wymienia.

## Czego model jeszcze nie robi

Świadczenie rehabilitacyjne, zasiłek w wysokości zasiłku macierzyńskiego do dnia porodu po upadłości albo wyroku, pełne składniki wynagrodzenia z Z-3, kalendarz części urlopu co do dat, nakładanie urlopu ojcowskiego na urlop rodzicielski w dniach. Daty zostają po stronie frontu; backend dostaje dni i tygodnie.
