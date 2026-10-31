package TeenPatti;

import Base.Game;
import Base.Player;
import Base.Turn;

import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class TeenPattiGame extends Game {
    private static TeenPattiGame instance;
    private static Table table;

    public TeenPattiGame(List<Player> players, int bootAmt, int maxPotLimit) {
        super(players);
        //this.table = new Table(bootAmt, maxPotLimit, maxPlayers );
        TeenPattiGame.instance = this;
    }

    public static void setTable(Table table) {
        TeenPattiGame.table = table;
    }

    public static Table getTable() {
        return table;
    }

    public void setPlayers(List<Player> players) {
        this.players = players;
        this.turn = new Turn(players);
    }

    Scanner sc = Main.scanner;

    @Override
    public void start() {
        System.out.println("\nGame is starting with " + players.size()+ " players\n");

        //Creation and shuffling deck
        Deck deck = new Deck();
        deck.shuffle();

        //Dsitribute 3 cards to each player
        for (Player p: players) {
            TeenPattiPlayer tp = (TeenPattiPlayer) p;
            tp.setHand(deck.distribute());
        }

        // Collect boot amount from each player
        System.out.println("Collecting boot amount of ₹" + table.getBootAmt() + " from each player...");
        for (Player p : players) {
            TeenPattiPlayer tp = (TeenPattiPlayer) p;
            tp.deductChips(table.getBootAmt());
            table.addToPot(table.getBootAmt());
            System.out.println(tp.getPlayerName() + " now has ₹" + tp.getChips());
        }

        // start turn
        runTurn();

        List<TeenPattiPlayer> active = getActivePlayers();
        if (active.size() == 1) {
            TeenPattiPlayer winner = active.get(0);
            winner.addChips(table.getPot());
            System.out.println("\n==========================================");
            System.out.println("🎉 All other players folded! 🎉");
            System.out.println("Winner: " + winner.getPlayerName() + " (" + winner.getHand() + ")");
            System.out.println("Won Pot: ₹" + table.getPot());
            System.out.println(winner.getPlayerName() + "'s Total Chips: ₹" + winner.getChips());
            System.out.println("==========================================\n");
        }
    }

    @Override
    public boolean isGameOver() {
        return getActivePlayers().size() <= 1;
    }

    public  static List<TeenPattiPlayer> getActivePlayers() {
        List<TeenPattiPlayer> active = new ArrayList<>();
        for (Player p:instance.players) {
            TeenPattiPlayer tp = (TeenPattiPlayer) p;
            if (tp.isActive()) {
                active.add(tp);
            }
        }
        return active;
    }

    public static void show(TeenPattiPlayer initiator) {
        List<TeenPattiPlayer> active = getActivePlayers();
        if (active.size() != 2) {
            System.out.println("Show is available only when 2 players left");
            return;
        }

        TeenPattiPlayer opponent = active.get(0) == initiator ? active.get(1) : active.get(0);
        System.out.println("Show has been initiated b/w " + initiator.getPlayerName() + " and " + opponent.getPlayerName());
        System.out.println(initiator.getPlayerName() + "'s cards: " + initiator.getHand());
        System.out.println(opponent.getPlayerName() + "'s cards: " + opponent.getHand());

        int result = CompareCards.compareRank(initiator.getHand(), opponent.getHand());
        if (result == 0) {
            System.out.println("Its a tie, pot will split");
            initiator.addChips(table.getPot() / 2);
            opponent.addChips(table.getPot() /2);
        } else {
             TeenPattiPlayer winner = result > 0 ? initiator: opponent;
             winner.addChips(table.getPot());
             System.out.println("\nGame Over!, " + winner.getPlayerName() + " is Winner with " + winner.getHand() + " having " + CompareCards.winningRule);
        }

        initiator.setActive(false);
        opponent.setActive(false);
    }

    public  void sideShow(TeenPattiPlayer requestor) {
       TeenPattiPlayer opponent = getLastActivePlayerBefore(requestor);

        if (opponent == null || !opponent.hasSeenCards()) {
            System.out.println("Side Show not allowed. Last player is not seen.");
            return;
        }

        System.out.println(requestor.getPlayerName() + " requests a Side Show with " + opponent.getPlayerName());
        System.out.println(opponent.getPlayerName() + ", do you accept the Side Show? (yes/ no)");
        String response = sc.nextLine();
        if (response.equalsIgnoreCase("yes")) {
                int result = CompareCards.compareRank(requestor.getHand(), opponent.getHand());
                if (result == 0) {
                    requestor.setActive(false);
                    System.out.println("Its a tie, so " + requestor.getPlayerName() + " loses.");
                } else if (result > 0) {
                    opponent.setActive(false);
                    System.out.println(requestor.getPlayerName() + " is Winner with " + requestor.getHand() + " having " + CompareCards.winningRule);
                }else {
                    requestor.setActive(false);
                    System.out.println(opponent.getPlayerName() + " is Winner with " + opponent.getHand() + " having " + CompareCards.winningRule);
                }
        } else if (response.equalsIgnoreCase("no")) {
                System.out.println("Side show rejected by " + opponent.getPlayerName() + ".");
        } else {
                System.out.println("Invalid choice!, assuming Side show rejected.");
        }
    }

    protected TeenPattiPlayer getLastActivePlayerBefore(TeenPattiPlayer requestor) {
        int index = players.indexOf(requestor);
        int n = players.size();

        for (int i = 1; i < n ; i++) {
            int id = (index - i + n) % n;
            Player player = players.get(id);
            if (player instanceof TeenPattiPlayer tp && tp.isActive()) {
                return tp;
            }

        }
        return null;
    }

//    @Override
//    public void winner() {
//        List<TeenPattiPlayer> activePlayers = new ArrayList<>();
//        for (Player p: players) {
//            TeenPattiPlayer tp = (TeenPattiPlayer) p;
//            if (tp.isActive()) {
//                activePlayers.add(tp);
//            }
//        }
//        TeenPattiPlayer winner = null;
//        int bestRank = -1;
//
//        for (TeenPattiPlayer player: activePlayers) {
//            int rank = CompareCards.compare(player.getHand());
//            System.out.println(player.getPlayerName() + "'s hand: " + player.getHand() + " -> Rank: " + rank);
//
//            if (rank > bestRank) {
//                bestRank = rank;
//                winner = player;
//            }
//        }
//
//        String rule = "";
//        switch (bestRank) {
//            case 1: {
//                rule = "High Cards";
//                break;
//            }
//            case 2: {
//                rule = "Pair(2 cards of same rank)";
//                break;
//            }
//            case 3: {
//                rule = "Same Suit";
//                break;
//            }
//            case 4: {
//                rule = "Sequence";
//                break;
//            }
//            case 5: {
//                rule = "Pure Sequence";
//                break;
//            }
//            case 6: {
//                rule = "Set(3 cards of same rank)";
//                break;
//            }
//            default: rule = "Invalid";
//        }
//        if (winner != null) {
//            System.out.println(winner.getPlayerName() + " is Winner with hand: " + winner.getHand() + " having " + rule);
//            winner.addChips(table.getPot());
//        }
//    }
}
