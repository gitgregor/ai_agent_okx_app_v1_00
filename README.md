# OKX Europe — AI Agent Crypto Trading (Single Page App)

> **Live GitHub Pages URL:**  
> 🔗 **https://gitgregor.github.io/ai_agent_okx_app_v1_00/**

Aplikacja handlowa typu Single Page Application (SPA) dla rynku OKX Europe (MiCA Compliance) z wbudowanym **Agentem AI**, profesjonalnym silnikiem wykresów świecowych **TradingView Canvas**, swobodnym przesuwaniem i dostosowywaniem okien (Siatka, Małe, Średnie, Pełny ekran, Minimalizacja) oraz symulacją portfela i zleceń.

---

## 🚀 Jak uruchomić na GitHub Pages?

Aplikacja została przygotowana do natychmiastowego wdrożenia na GitHub Pages na 3 sposoby:

### Sposób 1: GitHub Actions (Zalecany - w pełni automatyczny)
1. W repozytorium przejdź do: **Settings** -> **Pages**.
2. W sekcji **Build and deployment** -> **Source** wybierz: **`GitHub Actions`**.
3. Przy każdym commicie workflow `.github/workflows/deploy-pages.yml` automatycznie zbuduje i opublikuje stronę.

### Sposób 2: Deploy from a branch (Katalog główny `/`)
1. W repozytorium przejdź do: **Settings** -> **Pages**.
2. W sekcji **Source** wybierz: **`Deploy from a branch`**.
3. Wybierz gałąź **`main`** i folder **`/(root)`**, po czym kliknij **Save**.

### Sposób 3: Deploy from a branch (Folder `/docs`)
1. W repozytorium przejdź do: **Settings** -> **Pages**.
2. W sekcji **Source** wybierz: **`Deploy from a branch`**.
3. Wybierz gałąź **`main`** i folder **`/docs`**, po czym kliknij **Save**.

Twoja aplikacja będzie dostępna pod adresem:  
👉 **`https://gitgregor.github.io/ai_agent_okx_app_v1_00/`**

---

## ✨ Kluczowe Funkcjonalności

1. **Czysty ekran startowy**:
   - Po starcie sidebar jest zwinięty, a siatka robocza pusta i gotowa do pracy.
   - Górny pasek zawiera: `☰ Sidebar`, `TRYB: DEMO`, `🔑 KLUCZE API: PODŁĄCZONE`, status `AGENT AI: Dezaktywowany (Domyślnie)` z przełącznikiem `Dezaktywowany / Aktywny` oraz rozwijane `🗔 Menu Górne Okien`.

2. **Swobodne przesuwanie i skalowanie okien**:
   - Każde okno można osadzić w siatce głównej, zmniejszyć do małego lub średniego okna pływającego (`🗗`), rozszerzyć na cały ekran (`⛶`) lub zminimalizować do paska dokującego.
   - Płynne przesuwanie myszą i dotykiem bez zacinania.

3. **Tryb Standalone (Zero-Backend dla GitHub Pages)**:
   - Działa w 100% po stronie przeglądarki bez potrzeby utrzymywania zewnętrznego serwera.
   - Bezpośrednia integracja z publicznym API OKX v5 dla świec i notowań rynkowych z automatycznym fallbackiem na symulowane dane giełdowe.
   - Kompletny portfel handlowy z dwiema transakcjami w historii portfela (BTC i WLD).
   - Inteligentny czat Agenta AI z rekomendacjami rynkowymi.

4. **Lokalne uruchomienie z serwerem Node.js**:
   ```bash
   npm install
   npm start
   # Aplikacja otworzy się na http://localhost:3456
   ```

---

## 📁 Struktura Projektu

- `index.html`, `styles.css`, `app.js` — Pliki aplikacji SPA w katalogu głównym (dla hostingu root)
- `docs/` — Kopia dla GitHub Pages branch deployment (`/docs`)
- `public/` — Kopia dla lokalnego serwera Node.js oraz GitHub Actions artifact
- `server/` — Opcjonalny serwer Node.js z obsługą OKX API v5 oraz MCP Server
- `.github/workflows/deploy-pages.yml` — Zautomatyzowany workflow GitHub Actions dla GitHub Pages
