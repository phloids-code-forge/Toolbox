# The Library: Architecture 101 // The Blueprint

> "Coding is laying bricks. Architecture is drawing the blueprint." — *Pip*

You asked for the good stuff. Here is a curated syllabus for moving from "making it work" to "designing it to last."

---

## 1. The Core Philosophy (Mental Models)

### **The "God Mode" Paradox (Separation of Concerns)**
*   **Concept:** You cannot play the game and design the game at same time.
*   **The Rule:** Your Logic (Brain) should never know about your IO (Hands). 
*   **In Our Project:** `ticker_snark.ts` doesn't know how to render HTML. It just holds data. The `ForecastTicker.tsx` doesn't know how to write jokes. It just renders text.
*   **Reading:** *Clean Architecture* by Robert C. Martin (The "Onion" Architecture).

### **SOLID Principles (The 5 Commandments)**
1.  **S**ingle Responsibility: A module should have one (and only one) reason to change.
2.  **O**pen/Closed: Open for extension, closed for modification. (Add new features by adding code, not rewriting old code).
3.  **L**iskov Substitution: If it looks like a duck, it better quack like a duck.
4.  **I**nterface Segregation: Don't force a user to depend on things they don't use.
5.  **D**ependency Inversion: High-level modules shouldn't depend on low-level interactions. Both should depend on abstractions.

---

## 2. Systems Thinking (The Big Picture)

### **Domain-Driven Design (DDD)**
*   **The Gist:** Stop thinking about tables and classes. Start thinking about "Real World Objects" (Entities) and the "Language" of the business.
*   **Key Concept:** **The Ubiquitous Language**. If the experts call it a "Front," the code should call it a `Front`, not `WeatherEventTypeA`.
*   **Reading:** *Domain-Driven Design* by Eric Evans (The "Blue Book" - it's dense but legendary).

### **CAP Theorem (The "Pick Two" Triangle)**
*   **Concept:** In any distributed data store (like a nationwide weather network), you can only guarantee two of three:
    1.  **C**onsistency (Every read receives the most recent write).
    2.  **A**vailability (Every request receives a (non-error) response).
    3.  **P**artition Tolerance (The system continues to operate despite an arbitrary number of messages being dropped).
*   **Our Choice:** We usually pick **AP** (Availability + Partition). It's better to show *slightly* old weather data than *no* weather data.

---

## 3. The "Anti-Patterns" (What to Avoid)

*   **The God Object:** A single file/class that does everything (e.g., `utils.js` with 5000 lines). We fight this by splitting `api/cron` from `components`.
*   **Spaghetti Code:** Logic that jumps around so much you can't trace a straight line.
*   **Shotgun Surgery:** You want to change one small thing (e.g., lowercase "phloid"), but you have to edit 15 different files to do it. (We avoided this by having a config file!)

---

## 4. Reading List (For the Bored Hours)

1.  **The Pragmatic Programmer** (Thomas & Hunt) - *The bible of software craftsmanship. Easy read.*
2.  **Designing Data-Intensive Applications** (Martin Kleppmann) - *Heavy hitter. Teaches you how Google/Netflix scale.*
3.  **Refactoring** (Martin Fowler) - *How to clean up messy code without breaking it.*

---

## 5. Pip's Homework for You
Next time you look at our code:
1.  Find a file that has TWO reasons to change. (Violation of Single Responsibility).
2.  Ask: "If I wanted to switch from Vercel to AWS tomorrow, how much code would I have to rewrite?" (Dependency check).

*Class dismissed.* 
