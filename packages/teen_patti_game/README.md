# Teen Patti Game (Java)

🎴 A complete **Teen Patti (Indian Poker)** game implemented in Java.  
This project simulates the actual rules of Teen Patti, including **hand rankings, winner determination, betting system, and tie handling**.

---

## 📂 Project Structure

```
src/
 ├── Base/
 │   ├── Game.java          # Generic game engine base class
 │   ├── Player.java        # Base class for players
 │   └── Turn.java          # Represents a game turn
 │
 └── TeenPatti/
     ├── Card.java          # Card model (rank, suit)
     ├── CompareCards.java  # Hand ranking & winner comparison logic
     ├── Database.java      # (Optional) Database handler for configurations
     ├── Deck.java          # Deck creation & shuffling
     ├── Main.java          # Entry point to start the game
     ├── Table.java         # Table setup and rules
     ├── TeenPattiGame.java # Main Teen Patti game flow
     └── TeenPattiPlayer.java # Player logic specific to Teen Patti
```

---

## 🚀 Features
- Implements **real Teen Patti rules**
- Supports **hand rankings**:
  - Trail (Three of a Kind)
  - Pure Sequence (Straight Flush)
  - Sequence (Straight)
  - Color (Flush)
  - Pair
  - High Card
- Includes **tie-breaking logic**
- Configurable **boot amount & pot limit**
- Console-based gameplay

---

## 🛠️ How to Run
1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/teen-patti-game.git
   ```
2. Open in **IntelliJ IDEA** (or any Java IDE).
3. Run the `Main.java` file.
4. Play directly in the console!

---

## 📜 License
This project is licensed under the **MIT License** – you’re free to use, modify, and distribute it.

---

## 🔖 Tags
`teen-patti` `teenpatti` `indian-poker` `poker` `card-game` `java` `console-game` `casino-game` `betting`
