package Base;

import java.util.List;

public abstract class Game {
    protected List<Player> players;
    protected Turn turn;

    public abstract void start();

    //public abstract void winner();

    public Game(List<Player> players) {
        this.players = players;
        this.turn = new Turn(players);
    }

    protected void runTurn() {
        boolean gameOver = false;
        while (!isGameOver()) {
            for (Player player: players)
                if (player.isActive()) {
                    player.takeTurn();
                    if (isGameOver()) {
                        //gameOver = true;
                        break;
                    }
                }
        }
    }

    public abstract boolean isGameOver();
}