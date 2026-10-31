package TeenPatti;

import Base.Player;

import java.util.List;
import java.util.Scanner;

public class TeenPattiPlayer extends Player {
    private List<Card> hand;
    private int chips = 1000;
    private TeenPattiGame game;

    public TeenPattiPlayer(String playerName, int playerId, TeenPattiGame game) {
        super(playerName, playerId);
        this.game = game;
    }
    private boolean hasSeenCards = false;
    private boolean hasPacked = false;
    private int lastBet = TeenPattiGame.getTable().getBootAmt();

    public void pack() {
        this.hasPacked = true;
        System.out.println(getPlayerName() + " has packed.");
    }

    public void seeCards() {
        hasSeenCards = true;
        System.out.println("Your Cards: " + hand);
    }

    @Override
    public void takeTurn() {
        System.out.println("This is " + playerName + "'s turn. ");
        Scanner sc = Main.scanner;
        if(!hasSeenCards) {
            System.out.print("Do you want to see your cards(Yes/No): ");
            String action = sc.next();
            if (action.equalsIgnoreCase("yes")) {
                seeCards();
            }
        }

        int canShow = TeenPattiGame.getActivePlayers().size();
        if (!hasSeenCards) {
            System.out.println("You are playing Blind, -- Choose your action --");
            System.out.println("1. Blind");
            System.out.println("2. 2xBlind");
            System.out.println("3. Pack");
            if (canShow == 2) {
                System.out.println("4.Show");
            }
            int choice = sc.nextInt();

            switch (choice) {
                case 1:
                    lastBet = deductChips(lastBet);
                    TeenPattiGame.getTable().addToPot(lastBet);
                    break;
                case 2:
                    lastBet = deductChips(2*lastBet);
                    TeenPattiGame.getTable().addToPot(lastBet);
                    break;
                case 3:
                    System.out.println(playerName + " has packed.");
                    setActive(false);
                    break;
                case 4:
                    if (canShow == 2) {
                        TeenPattiGame.show(this);
                        break;
                    }
                default:
                    System.out.println("Invalid choice, Skipping turn");
            }
            System.out.println(playerName + " has " + chips + " left");
        }
        else {
            System.out.println("You are playing Seen, -- Choose your action --");
            System.out.println("1. Chaal");
            System.out.println("2. 2xChaal");
            System.out.println("3. Pack");
            TeenPattiPlayer prevPlayer = game.getLastActivePlayerBefore(this);
            if (canShow > 2 && hasSeenCards && prevPlayer != null && prevPlayer.hasSeenCards()) {
                System.out.println("4.Side Show");
            }
            if (canShow == 2) {
                System.out.println("4.Show");
            }

            int choice = sc.nextInt();
            switch (choice) {
                case 1:
                    lastBet = deductChips(2*lastBet);
                    TeenPattiGame.getTable().addToPot(lastBet);
                    break;
                case 2:
                    lastBet = deductChips(4*lastBet);
                    TeenPattiGame.getTable().addToPot(lastBet);
                    break;
                case 3:
                    System.out.println(playerName + " has packed.");
                    isActive = false;
                    break;
                case 4:
                    if (canShow == 2) {
                        TeenPattiGame.show(this);
                        break;
                    }
                    if (canShow > 2 && hasSeenCards && prevPlayer != null && prevPlayer.hasSeenCards()) {
                        game.sideShow(this);
                        break;
                    }
                default:
                    System.out.println("Invalid choice, Skipping turn");
            }
            System.out.println(playerName + " has " + chips + " left");
        }

    }

    public List<Card> getHand() {
        return hand;
    }

    public void setHand(List<Card> hand) {
        this.hand = hand;
    }

    public int deductChips(int amt) {
        chips -= amt;
        return amt;
    }

    public int getChips() {
        return chips;
    }

    public boolean hasSeenCards() {
        return hasSeenCards;
    }

    public boolean isActive() {
        return isActive;
    }

    public void addChips(int amt) {
        chips += amt;
    }
}
