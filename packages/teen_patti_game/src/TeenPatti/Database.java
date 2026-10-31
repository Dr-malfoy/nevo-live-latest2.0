package TeenPatti;

import java.sql.*;

public class Database {
    public static Table getConfigById(int id) {
        Table config = null;
        try {
            Connection conn = DriverManager.getConnection("jdbc:mysql://localhost:3306/teenpatti", "root", "Ankit@12");
            PreparedStatement stmt = conn.prepareStatement("SELECT * FROM tableConfig WHERE playerId = ?");
            stmt.setInt(1, id);
            ResultSet rs = stmt.executeQuery();

            if (rs.next()) {
                int boot = rs.getInt("bootAmt");
                int maxPot = rs.getInt("maxPotLimit");
                int maxPlayers = rs.getInt("maxPlayers");
                config = new Table(boot, maxPot, maxPlayers);
            }

            rs.close();
            stmt.close();
            conn.close();
        } catch (Exception e) {
            // MySQL is optional; fallback to default table config
        }

        if (config == null) {
            config = new Table(50, 10240, 5);
        }

        return config;
    }
}
