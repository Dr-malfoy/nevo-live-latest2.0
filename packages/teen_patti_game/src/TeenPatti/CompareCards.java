package TeenPatti;

import java.util.*;

public class CompareCards {
    public static String winningRule;

    // Comparing rank
    public static int compareRank(List<Card> hand1, List<Card> hand2) {
        int rank1 = getRank(hand1);
        int rank2 = getRank(hand2);
        int result = Integer.compare(rank1,rank2);
        if (result > 0) {
            winningRule = winningRule(rank1);
            return result;
        } else if (result <0) {
            winningRule = winningRule(rank2);
            return result;
        }else {
            switch (rank1) {
                case 6: // Set
                    winningRule = winningRule(rank1);
                    return compareSet(hand1, hand2);
                case 5: // Pure sequence
                case 4: // Sequence
                    winningRule = winningRule(rank1);
                    return compareSequence(hand1, hand2);
                case 3: // Same suit (color)
                case 1: // High card
                    winningRule = winningRule(rank1);
                    return compareHighCards(hand1, hand2);
                case 2: // Pair
                    winningRule = winningRule(rank1);
                    return comparePair(hand1, hand2);
                default:
                    return 0;
            }
        }
    }

    public static String winningRule(int rank) {
        String rule = "";
        switch (rank) {
            case 1: return "High Cards";
            case 2: return  "Pair(2 cards of same rank)";
            case 3: return "Same Suit";
            case 4: return "Sequence";
            case 5: return "Pure Sequence";
            case 6: return "Set(3 cards of same rank)";
            default: return "Invalid Rule!";
        }
    }

    public static int getRank(List<Card> hand) {
        //same suit
        boolean sameSuit = true;
        String suit = hand.get(0).getSuit();
        for (Card card: hand) {
            if (!card.getSuit().equals(suit)) {
                sameSuit = false;
                break;
            }
        }

        //Pure sequence
        List<Integer> sorted = getSortedRanks(hand);
        int r1 = sorted.get(0);
        int r2 = sorted.get(1);
        int r3 = sorted.get(2);
        boolean isSequence = (r2 == r1 + 1 && r3 == r2 + 1) || (r1 == 2 && r2 == 3 && r3 == 14);

        // trail or pair
        Map<String, Integer> rankCount = new HashMap<>();
        for (Card card: hand) {
            String rank = card.getRank();
            if (rankCount.containsKey(rank)) {
                rankCount.put(rank, rankCount.get(rank) + 1);
            }
            else {
                rankCount.put(rank, 1);
            }
        }

        //winning rules
        if (rankCount.containsValue(3)) return 6; // trail
        if (sameSuit && isSequence) return 5; // pure sequence
        if (isSequence) return 4; // sequence
        if (sameSuit) return 3; //color
        if (rankCount.containsValue(2)) return 2; // pair
        return 1; // High cards
    }

    private static int compareSet(List<Card> hand1, List<Card> hand2) {
        int r1 = hand1.getFirst().getRankValue(); // all three same
        int r2 = hand2.getFirst().getRankValue();
        return Integer.compare(r1, r2);
    }

    private static int compareSequence(List<Card> hand1, List<Card> hand2) {
        List<Integer> values1 = getSortedRanks(hand1);
        List<Integer> values2 = getSortedRanks(hand2);
        return Integer.compare(values1.get(2), values2.get(2)); // compare highest card
    }

    private static int compareHighCards(List<Card> hand1, List<Card> hand2) {
        List<Integer> values1 = getSortedRanks(hand1);
        List<Integer> values2 = getSortedRanks(hand2);

        for (int i = 2; i >= 0; i--) {
            int cmp = Integer.compare(values1.get(i), values2.get(i));
            if (cmp != 0) return cmp;
        }
        return 0; // truly tied
    }

    private static int comparePair(List<Card> hand1, List<Card> hand2) {
        int pairRank1 = findPairRank(hand1);
        int pairRank2 = findPairRank(hand2);

        int cmp = Integer.compare(pairRank1, pairRank2);
        if (cmp != 0) return cmp;

        int kicker1 = findKickerRank(hand1, pairRank1);
        int kicker2 = findKickerRank(hand2, pairRank2);
        return Integer.compare(kicker1, kicker2);
    }

    private static int findPairRank(List<Card> hand) {
        for (int i = 0; i < hand.size(); i++) {
            for (int j = i + 1; j < hand.size(); j++) {
                if (hand.get(i).getRank().equals(hand.get(j).getRank())) {
                    return hand.get(i).getRankValue();
                }
            }
        }
        return -1;
    }

    private static int findKickerRank(List<Card> hand, int pairRank) {
        for (Card card : hand) {
            if (card.getRankValue() != pairRank) {
                return card.getRankValue();
            }
        }
        return -1;
    }

    private static List<Integer> getSortedRanks(List<Card> hand) {
        List<Integer> ranks = new ArrayList<>();
        for (Card card : hand) {
            ranks.add(card.getRankValue());
        }
        Collections.sort(ranks);
        return ranks;
    }

}
