package TeenPatti;

public class Table {
    public int bootAmt;
    public int maxPotLimit;
    public int pot;
    public int maxPlayers;

    public Table(int bootAmt, int maxPotLimit, int maxPlayers) {
        this.bootAmt = bootAmt;
        this.maxPotLimit = maxPotLimit;
        this.maxPlayers = maxPlayers;
        this.pot = 0;
    }

    public void addToPot(int amt) {
        pot += amt;
        System.out.println("Pot updated: " + pot);
    }

    public int getPot() {
        return pot;
    }

    public int getBootAmt() {
        return bootAmt;
    }

    public int getMaxPotLimit() {
        return maxPotLimit;
    }

    public boolean isPotLimit() {
        return pot >= maxPotLimit;
    }

    public int getMaxPlayers() {
        return maxPlayers;
    }
}
