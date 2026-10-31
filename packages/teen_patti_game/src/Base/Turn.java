package Base;

import java.util.List;

public class Turn {
    private List<Player> players;
    private int currentIndex = -1;

    public Turn(List<Player> players) {
        this.players = players;
    }

   public Player nextPlayer() {
       for (int i = 1; i <= players.size(); i++) {
           int nextIndex = (currentIndex + i) % players.size();
           Player player = players.get(nextIndex);
           if (player.isActive()) {
               currentIndex = nextIndex;
               return player;
           }
       }
       return null;
   }
}
