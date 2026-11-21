# Skaner wniosku (thinkpad-t14, 2026-11-21)

Na kroku „Start” jest karta „Wczytaj skan wniosku”. PDF z warstwą tekstu czytamy od razu, skan bez tekstu i zdjęcie idą przez OCR w przeglądarce (pierwsze 4 strony, język polski). Plików spraw ZUS nie commitujemy.

Odczyt jest w `frontend/src/lib/scan.ts` (`applyScan`). Pole, którego nie da się wyczytać, trafia do `GuideState.gaps` i dostaje czerwoną ramkę. „Dalej” na tym kroku jest zablokowane, dopóki użytkownik nie wpisze wartości albo, przy polu tak/nie, nie potwierdzi „Nie dotyczy”.

Krok „Ciąża” znika tylko przy wyborze adopcji. Rodzina zastępcza nadal go ma.
