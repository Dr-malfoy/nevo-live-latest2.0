package Base;

public abstract class Player {
    protected String playerName;
    protected int playerId;
    protected boolean isActive = true;

    public Player(String playerName, int playerId) {
        this.playerName = playerName;
        this.playerId = playerId;
    }

    public String getPlayerName() {
        return playerName;
    }

    public boolean isActive() {
        return isActive;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public abstract void takeTurn();
}
