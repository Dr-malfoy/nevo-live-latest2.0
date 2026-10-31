package TeenPatti;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Deck {
    private List<Card> cards;

    public Deck() {
        this.cards = new ArrayList<>();
        String[] suits = {"Spade", "Club", "Heart", "Diamond"};
        String[] ranks = {"A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"};
        for (String suit: suits) {
            for (String rank: ranks) {
                cards.add(new Card(suit, rank));
            }
        }
    }

    public List<Card> distribute() {
        List<Card> hand = new ArrayList<>(3);
        for (int i = 0; i < 3 && !cards.isEmpty(); i++) {
            hand.add(cards.remove(0));
        }
        return hand;
    }

    public void shuffle() {
        Collections.shuffle(cards);
        System.out.println(" ---------- Deck of 52 cards ----------\n\n" +cards + "\n");
    }
}
