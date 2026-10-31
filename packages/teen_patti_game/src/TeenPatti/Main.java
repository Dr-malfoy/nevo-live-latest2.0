package TeenPatti;

import Base.Player;

import java.util.ArrayList;
import java.util.List;
import java.util.Scanner;

public class Main {
    public static final Scanner scanner = new Scanner(System.in);

    public static void main(String[] args) {
        Scanner sc = scanner;

        Table config = Database.getConfigById(1);
        Table table = new Table(config.getBootAmt(), config.getMaxPotLimit(), config.maxPlayers);
        TeenPattiGame.setTable(table);
        System.out.println("==========================================");
        System.out.println("        🎴 WELCOME TO TEEN PATTI 🎴        ");
        System.out.println("==========================================");
        System.out.println("Table Config: Boot: ₹" + config.getBootAmt() + " | Max Pot: ₹" + config.getMaxPotLimit() + " | Max Players: " + config.maxPlayers);
        System.out.println("------------------------------------------");

        int n = 0;
        do {
            System.out.print("Enter no of players (2 to " + config.maxPlayers + "): ");
            if (sc.hasNextInt()) {
                n = sc.nextInt();
                sc.nextLine();
                if (n < 2 || n > config.maxPlayers) {
                    System.out.println("Please enter between 2 and " + config.maxPlayers + " players.");
                }
            } else {
                sc.nextLine();
                System.out.println("Please enter a valid number.");
            }
        } while (n < 2 || n > config.maxPlayers);

        List<Player> names = new ArrayList<>();
        TeenPattiGame game = new TeenPattiGame(names, config.getBootAmt(), config.getMaxPotLimit());
        for (int i = 1; i <= n; i++) {
            System.out.print("Enter player" + i + " name: ");
            String name = sc.nextLine().trim();
            while (name.isEmpty() && sc.hasNextLine()) {
                name = sc.nextLine().trim();
            }
            if (name.isEmpty()) {
                name = "Player" + i;
            }
            names.add(new TeenPattiPlayer(name, i, game));
        }

        game.start();
        sc.close();
    }
}
