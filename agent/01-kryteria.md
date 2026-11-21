# Kryteria, pod które budujemy

> Prompt: streszczenie z pełnej treści zadania, zapisane na laptopie **thinkpad-t14**. Agent na **legion-540** ma je traktować jako brief UI.

Wagi jury:

| Kryterium | Waga |
| --- | --- |
| Związek z wyzwaniem | 25% |
| Pomysł | 20% |
| Oryginalność | 15% |
| Kompletność i user experience | 25% |
| Potencjał wdrożeniowy | 15% |

Oddanie: opis i tytuł, prezentacja do 10 slajdów, film do 3 minut, repozytorium, zrzuty, link do dema, informacja które funkcje używają AI.

Demo musi pozwolić wgrać albo wybrać przykładowy wniosek i sprawdzić ubezpieczenie oraz kalkulator. Jury porówna wyliczenia z częścią spraw ZUS. Tych spraw nie ma w gicie.

Funkcje, które brief uznaje za zakres narzędzia:

1. Informacja o zasiłku chorobowym w ciąży, świadczeniu rehabilitacyjnym i zasiłku w wysokości zasiłku macierzyńskiego, także o braku prawa.
2. Kalkulator zasiłku macierzyńskiego dla obojga rodziców: okres i kwota, liczba dzieci, wiek, „Za życiem”.
3. Łączenie urlopu rodzicielskiego z pracą.
4. Symulacja, gdy z opieki korzystają oboje rodzice.
5. Adopcja i rodzina zastępcza niezawodowa.
6. Kwota z indywidualnej podstawy wymiaru.
7. Dokumenty, terminy, płatnik albo ZUS.
8. Ryzyka utraty albo obniżenia świadczenia.
9. Podmioty pomagające przy śmierci dziecka, wcześniaku, poronieniu, ciężkiej chorobie.

Preferowany kształt to jeden zintegrowany kalkulator. Parametry (procent, maksymalny wymiar) mają dać się zmienić bez przebudowy kodu. To już robi `PUT /api/v1/admin/parameters`.

Symulacje, nie prawdziwe integracje: mObywatel, dane ubezpieczenia, zadłużenie składek, e-ZLA, PUE/eZUS, wnioski urlopowe (trzeba je zaprojektować), wnioski zasiłkowe, odpis aktu urodzenia, odesłania do zus.pl, gov.pl/rodzina i PIP.

Świadczenie rehabilitacyjne jest w kryteriach, a w tym rdzeniu go jeszcze nie ma. Zostaje na kolejną turę thinkpad-t14.
