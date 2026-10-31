package TeenPatti;

import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.ActionListener;
import java.awt.geom.RoundRectangle2D;
import java.util.ArrayList;
import java.util.List;

/**
 * Modern Swing Desktop GUI Application for Teen Patti (Indian Poker).
 */
public class TeenPattiApp extends JFrame {

    public static class AppPlayer {
        String name;
        boolean isHuman;
        int chips = 1000;
        List<Card> hand = new ArrayList<>();
        boolean hasSeen = false;
        boolean isActive = true;
        int lastActionAmt = 0;
        String statusText = "Active";

        public AppPlayer(String name, boolean isHuman) {
            this.name = name;
            this.isHuman = isHuman;
        }

        public void resetForNewRound() {
            hand.clear();
            hasSeen = false;
            isActive = true;
            lastActionAmt = 0;
            statusText = "Waiting";
        }
    }

    private final List<AppPlayer> players = new ArrayList<>();
    private int bootAmt = 50;
    private int currentStake = 50;
    private int pot = 0;
    private int currentTurnIndex = 0;
    private boolean isRoundOver = false;

    // GUI Components
    private PokerTablePanel tablePanel;
    private JLabel potLabel;
    private JLabel stakeLabel;
    private JLabel infoBanner;
    private JButton btnSeeCards;
    private JButton btnChaal;
    private JButton btnRaise;
    private JButton btnPack;
    private JButton btnShow;
    private JButton btnNewRound;
    private JTextArea logArea;
    private JLabel myHandRankLabel;

    public TeenPattiApp() {
        super("🎴 Teen Patti - Indian Poker (Desktop App)");
        initPlayers();
        setupUI();
        startNewRound();
    }

    private void initPlayers() {
        players.add(new AppPlayer("You", true));
        players.add(new AppPlayer("Rohan (Bot)", false));
        players.add(new AppPlayer("Priya (Bot)", false));
        players.add(new AppPlayer("Vikram (Bot)", false));
    }

    private void setupUI() {
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(1100, 780);
        setMinimumSize(new Dimension(950, 680));
        setLocationRelativeTo(null);
        getContentPane().setBackground(new Color(15, 20, 25));
        setLayout(new BorderLayout());

        // Header Panel
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBackground(new Color(22, 27, 34));
        headerPanel.setBorder(new EmptyBorder(12, 20, 12, 20));

        JLabel titleLabel = new JLabel("🎴 TEEN PATTI CASINO");
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 22));
        titleLabel.setForeground(new Color(245, 197, 24));

        JPanel statsPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 15, 0));
        statsPanel.setOpaque(false);

        potLabel = new JLabel("POT: ₹0");
        potLabel.setFont(new Font("Segoe UI", Font.BOLD, 18));
        potLabel.setForeground(new Color(82, 196, 26));

        stakeLabel = new JLabel("STAKE: ₹50");
        stakeLabel.setFont(new Font("Segoe UI", Font.BOLD, 15));
        stakeLabel.setForeground(new Color(138, 180, 248));

        btnNewRound = createStyledButton("🔄 New Hand", new Color(46, 125, 50), e -> startNewRound());
        btnNewRound.setFont(new Font("Segoe UI", Font.BOLD, 13));

        statsPanel.add(stakeLabel);
        statsPanel.add(potLabel);
        statsPanel.add(btnNewRound);

        headerPanel.add(titleLabel, BorderLayout.WEST);
        headerPanel.add(statsPanel, BorderLayout.EAST);
        add(headerPanel, BorderLayout.NORTH);

        // Center Table Panel
        tablePanel = new PokerTablePanel();
        add(tablePanel, BorderLayout.CENTER);

        // Bottom Controls Area
        JPanel bottomContainer = new JPanel(new BorderLayout());
        bottomContainer.setBackground(new Color(18, 22, 28));
        bottomContainer.setBorder(new EmptyBorder(8, 15, 8, 15));

        // Info Banner
        JPanel infoPanel = new JPanel(new BorderLayout());
        infoPanel.setOpaque(false);
        infoBanner = new JLabel("Welcome! Place your bets.", SwingConstants.CENTER);
        infoBanner.setFont(new Font("Segoe UI", Font.BOLD, 15));
        infoBanner.setForeground(new Color(230, 237, 243));
        infoPanel.add(infoBanner, BorderLayout.CENTER);

        myHandRankLabel = new JLabel("", SwingConstants.RIGHT);
        myHandRankLabel.setFont(new Font("Segoe UI", Font.BOLD, 13));
        myHandRankLabel.setForeground(new Color(255, 215, 0));
        infoPanel.add(myHandRankLabel, BorderLayout.EAST);

        bottomContainer.add(infoPanel, BorderLayout.NORTH);

        // Buttons Bar
        JPanel buttonsBar = new JPanel(new FlowLayout(FlowLayout.CENTER, 12, 10));
        buttonsBar.setOpaque(false);

        btnSeeCards = createStyledButton("👁️ See Cards", new Color(2, 119, 189), e -> onSeeCards());
        btnChaal = createStyledButton("Blind (₹50)", new Color(46, 125, 50), e -> onPlayChaal(1));
        btnRaise = createStyledButton("2x Blind (₹100)", new Color(230, 81, 0), e -> onPlayChaal(2));
        btnPack = createStyledButton("Pack (Fold)", new Color(198, 40, 40), e -> onPack());
        btnShow = createStyledButton("Show Hands!", new Color(123, 31, 162), e -> onShow());
        btnShow.setVisible(false);

        buttonsBar.add(btnSeeCards);
        buttonsBar.add(btnChaal);
        buttonsBar.add(btnRaise);
        buttonsBar.add(btnPack);
        buttonsBar.add(btnShow);

        bottomContainer.add(buttonsBar, BorderLayout.CENTER);
        add(bottomContainer, BorderLayout.SOUTH);

        // Right Activity Log Panel
        JPanel rightLogPanel = new JPanel(new BorderLayout());
        rightLogPanel.setPreferredSize(new Dimension(280, 0));
        rightLogPanel.setBackground(new Color(22, 27, 34));
        rightLogPanel.setBorder(BorderFactory.createMatteBorder(0, 1, 0, 0, new Color(48, 54, 61)));

        JLabel logHeader = new JLabel(" Game Activity");
        logHeader.setFont(new Font("Segoe UI", Font.BOLD, 13));
        logHeader.setForeground(new Color(139, 148, 158));
        logHeader.setBorder(new EmptyBorder(8, 10, 8, 10));
        rightLogPanel.add(logHeader, BorderLayout.NORTH);

        logArea = new JTextArea();
        logArea.setEditable(false);
        logArea.setBackground(new Color(13, 17, 23));
        logArea.setForeground(new Color(201, 209, 217));
        logArea.setFont(new Font("Consolas", Font.PLAIN, 12));
        logArea.setLineWrap(true);
        logArea.setWrapStyleWord(true);
        logArea.setBorder(new EmptyBorder(6, 8, 6, 8));

        JScrollPane logScroll = new JScrollPane(logArea);
        logScroll.setBorder(null);
        rightLogPanel.add(logScroll, BorderLayout.CENTER);

        add(rightLogPanel, BorderLayout.EAST);
    }

    private JButton createStyledButton(String text, Color bg, ActionListener action) {
        JButton btn = new JButton(text);
        btn.setFont(new Font("Segoe UI", Font.BOLD, 14));
        btn.setForeground(Color.WHITE);
        btn.setBackground(bg);
        btn.setFocusPainted(false);
        btn.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(bg.brighter(), 1, true),
                new EmptyBorder(8, 16, 8, 16)
        ));
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        btn.addActionListener(action);
        return btn;
    }

    private void log(String msg) {
        logArea.append("• " + msg + "\n");
        logArea.setCaretPosition(logArea.getDocument().getLength());
    }

    public void startNewRound() {
        pot = 0;
        currentStake = bootAmt;
        isRoundOver = false;
        currentTurnIndex = 0;

        Deck deck = new Deck();
        deck.shuffle();

        log("=================================");
        log("🃏 Starting New Round! Boot: ₹" + bootAmt);

        for (AppPlayer p : players) {
            p.resetForNewRound();
            p.hand = deck.distribute();
            p.chips -= bootAmt;
            pot += bootAmt;
            p.lastActionAmt = bootAmt;
            p.statusText = "Blind";
        }

        myHandRankLabel.setText("");
        infoBanner.setText("New hand dealt! Choose your action.");
        updateUIState();
        tablePanel.repaint();
    }

    private void onSeeCards() {
        AppPlayer me = players.get(0);
        if (!me.hasSeen && me.isActive && !isRoundOver) {
            me.hasSeen = true;
            me.statusText = "Seen";
            int rank = CompareCards.getRank(me.hand);
            String ruleName = CompareCards.winningRule(rank);
            myHandRankLabel.setText("Hand: " + ruleName);
            log("You saw your cards (" + ruleName + ")");
            updateUIState();
            tablePanel.repaint();
        }
    }

    private void onPlayChaal(int multiplier) {
        AppPlayer me = players.get(0);
        if (!me.isActive || isRoundOver) return;

        int cost = (me.hasSeen ? (currentStake * 2) : currentStake) * multiplier;
        if (me.chips < cost) {
            JOptionPane.showMessageDialog(this, "Not enough chips! You must fold or show.", "Insufficient Chips", JOptionPane.WARNING_MESSAGE);
            return;
        }

        me.chips -= cost;
        pot += cost;
        me.lastActionAmt = cost;

        if (multiplier == 2) {
            currentStake *= 2;
            log("You raised! Stake is now ₹" + currentStake);
        } else {
            log("You played " + (me.hasSeen ? "Chaal" : "Blind") + " (₹" + cost + ")");
        }

        if (checkActivePlayers()) {
            updateUIState();
            tablePanel.repaint();
            return;
        }

        // Advance turn to bots
        disableUserControls();
        advanceTurnToBots(1);
    }

    private void onPack() {
        AppPlayer me = players.get(0);
        me.isActive = false;
        me.statusText = "Folded";
        log("You folded (packed).");
        infoBanner.setText("You folded. Watching opponents play...");

        if (checkActivePlayers()) {
            updateUIState();
            tablePanel.repaint();
            return;
        }

        disableUserControls();
        advanceTurnToBots(1);
    }

    private void onShow() {
        List<AppPlayer> active = getActivePlayers();
        if (active.size() != 2) return;

        AppPlayer p1 = active.get(0);
        AppPlayer p2 = active.get(1);

        for (AppPlayer p : players) {
            p.hasSeen = true; // Reveal all hands at showdown
        }

        int result = CompareCards.compareRank(p1.hand, p2.hand);
        tablePanel.repaint();

        if (result == 0) {
            int half = pot / 2;
            p1.chips += half;
            p2.chips += half;
            log("🤝 It's a Tie! Pot split between " + p1.name + " and " + p2.name);
            JOptionPane.showMessageDialog(this, "Tie Game!\nPot of ₹" + pot + " split equally.", "Showdown - Tie", JOptionPane.INFORMATION_MESSAGE);
        } else {
            AppPlayer winner = (result > 0) ? p1 : p2;
            winner.chips += pot;
            winner.statusText = "Winner!";
            log("🏆 Showdown Winner: " + winner.name + " with " + CompareCards.winningRule);
            JOptionPane.showMessageDialog(this,
                    "🎉 " + winner.name + " WINS the pot of ₹" + pot + "!\n" +
                            "Winning Hand: " + winner.hand + "\nRank: " + CompareCards.winningRule,
                    "Showdown Winner!", JOptionPane.INFORMATION_MESSAGE);
        }

        isRoundOver = true;
        updateUIState();
        tablePanel.repaint();
    }

    private void advanceTurnToBots(int botIndex) {
        if (botIndex >= players.size()) {
            // End of round cycle, return turn to human if human is still active
            if (players.get(0).isActive && !isRoundOver) {
                enableUserControls();
                infoBanner.setText("Your turn! Choose your action.");
                updateUIState();
                tablePanel.repaint();
            } else if (!isRoundOver) {
                // If human folded, bots continue next cycle
                Timer timer = new Timer(600, e -> advanceTurnToBots(1));
                timer.setRepeats(false);
                timer.start();
            }
            return;
        }

        AppPlayer bot = players.get(botIndex);
        if (!bot.isActive || isRoundOver) {
            advanceTurnToBots(botIndex + 1);
            return;
        }

        // Bot thinking delay
        Timer timer = new Timer(700, e -> {
            executeBotDecision(bot);
            tablePanel.repaint();
            updateUIState();

            if (!checkActivePlayers()) {
                advanceTurnToBots(botIndex + 1);
            }
        });
        timer.setRepeats(false);
        timer.start();
    }

    private void executeBotDecision(AppPlayer bot) {
        int rank = CompareCards.getRank(bot.hand);

        // Bot decides to peek at cards
        if (!bot.hasSeen && Math.random() > 0.35) {
            bot.hasSeen = true;
            bot.statusText = "Seen";
            log(bot.name + " peeked at their cards.");
        }

        int cost = bot.hasSeen ? (currentStake * 2) : currentStake;

        // Fold logic for weak hands if stake gets elevated
        if (bot.hasSeen && rank == 1 && currentStake > bootAmt && Math.random() > 0.45) {
            bot.isActive = false;
            bot.statusText = "Folded";
            log(bot.name + " packed (folded).");
            infoBanner.setText(bot.name + " folded.");
            return;
        }

        // Otherwise bet or raise
        if (bot.chips >= cost) {
            bot.chips -= cost;
            pot += cost;
            bot.lastActionAmt = cost;
            log(bot.name + " played " + (bot.hasSeen ? "Chaal" : "Blind") + " (₹" + cost + ")");
            infoBanner.setText(bot.name + " played " + (bot.hasSeen ? "Chaal" : "Blind") + " (₹" + cost + ")");
        } else {
            bot.isActive = false;
            bot.statusText = "Out of chips";
            log(bot.name + " has insufficient chips and folded.");
        }
    }

    private boolean checkActivePlayers() {
        List<AppPlayer> active = getActivePlayers();
        if (active.size() <= 1) {
            isRoundOver = true;
            if (active.size() == 1) {
                AppPlayer winner = active.get(0);
                winner.chips += pot;
                winner.statusText = "Winner!";
                log("🎉 All other players folded! " + winner.name + " wins pot of ₹" + pot + "!");
                infoBanner.setText("🎉 " + winner.name + " wins the pot of ₹" + pot + "!");
                JOptionPane.showMessageDialog(this,
                        "🎉 " + winner.name + " wins the pot of ₹" + pot + "!\n(All other players folded)",
                        "Round Over", JOptionPane.INFORMATION_MESSAGE);
            }
            updateUIState();
            tablePanel.repaint();
            return true;
        }
        return false;
    }

    private List<AppPlayer> getActivePlayers() {
        List<AppPlayer> active = new ArrayList<>();
        for (AppPlayer p : players) {
            if (p.isActive) active.add(p);
        }
        return active;
    }

    private void updateUIState() {
        potLabel.setText("POT: ₹" + pot);
        stakeLabel.setText("STAKE: ₹" + currentStake);

        AppPlayer me = players.get(0);
        int cost = me.hasSeen ? (currentStake * 2) : currentStake;

        btnChaal.setText((me.hasSeen ? "Chaal" : "Blind") + " (₹" + cost + ")");
        btnRaise.setText("2x " + (me.hasSeen ? "Chaal" : "Blind") + " (₹" + (cost * 2) + ")");

        btnSeeCards.setEnabled(!me.hasSeen && me.isActive && !isRoundOver);

        List<AppPlayer> active = getActivePlayers();
        boolean canShow = (active.size() == 2 && me.isActive && !isRoundOver);
        btnShow.setVisible(canShow);

        if (isRoundOver || !me.isActive) {
            disableUserControls();
        } else {
            enableUserControls();
        }
    }

    private void disableUserControls() {
        btnChaal.setEnabled(false);
        btnRaise.setEnabled(false);
        btnPack.setEnabled(false);
        btnSeeCards.setEnabled(false);
        btnShow.setEnabled(false);
    }

    private void enableUserControls() {
        AppPlayer me = players.get(0);
        btnChaal.setEnabled(me.isActive && !isRoundOver);
        btnRaise.setEnabled(me.isActive && !isRoundOver);
        btnPack.setEnabled(me.isActive && !isRoundOver);
        btnSeeCards.setEnabled(!me.hasSeen && me.isActive && !isRoundOver);
        btnShow.setEnabled(getActivePlayers().size() == 2 && me.isActive && !isRoundOver);
    }

    /**
     * Custom Poker Table Canvas
     */
    private class PokerTablePanel extends JPanel {
        public PokerTablePanel() {
            setBackground(new Color(15, 20, 25));
        }

        @Override
        protected void paintComponent(Graphics g) {
            super.paintComponent(g);
            Graphics2D g2 = (Graphics2D) g.create();
            g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            int w = getWidth();
            int h = getHeight();

            // Draw Poker Felt Oval
            int marginX = 40;
            int marginY = 30;
            int tableW = w - (marginX * 2);
            int tableH = h - (marginY * 2);

            // Wood Bezel Rim
            g2.setColor(new Color(60, 35, 18));
            g2.fill(new RoundRectangle2D.Double(marginX - 10, marginY - 10, tableW + 20, tableH + 20, 180, 180));

            // Gold Trim
            g2.setColor(new Color(212, 175, 55));
            g2.setStroke(new BasicStroke(3));
            g2.draw(new RoundRectangle2D.Double(marginX - 5, marginY - 5, tableW + 10, tableH + 10, 170, 170));

            // Green Felt Gradient
            GradientPaint feltPaint = new GradientPaint(
                    w / 2f, marginY, new Color(24, 104, 56),
                    w / 2f, marginY + tableH, new Color(11, 48, 25)
            );
            g2.setPaint(feltPaint);
            g2.fill(new RoundRectangle2D.Double(marginX, marginY, tableW, tableH, 160, 160));

            // Center Table Pot Visual
            drawCenterPot(g2, w / 2, h / 2 - 20);

            // Draw Opponents (Top 3 seats)
            drawPlayerSeat(g2, players.get(1), w / 4, 85);
            drawPlayerSeat(g2, players.get(2), w / 2, 65);
            drawPlayerSeat(g2, players.get(3), (w * 3) / 4, 85);

            // Draw User Seat (Bottom)
            drawPlayerSeat(g2, players.get(0), w / 2, h - 145);

            g2.dispose();
        }

        private void drawCenterPot(Graphics2D g2, int cx, int cy) {
            // Chip graphics
            g2.setColor(new Color(0, 0, 0, 90));
            g2.fillOval(cx - 70, cy - 20, 140, 45);

            // Decorative Chips
            drawChip(g2, cx - 25, cy - 8, new Color(220, 53, 69));
            drawChip(g2, cx + 5, cy - 10, new Color(255, 193, 7));
            drawChip(g2, cx - 10, cy + 4, new Color(13, 110, 253));

            // Pot Text
            g2.setColor(Color.WHITE);
            g2.setFont(new Font("Segoe UI", Font.BOLD, 15));
            String potStr = "POT: ₹" + pot;
            FontMetrics fm = g2.getFontMetrics();
            g2.drawString(potStr, cx - fm.stringWidth(potStr) / 2, cy + 35);
        }

        private void drawChip(Graphics2D g2, int x, int y, Color color) {
            g2.setColor(color);
            g2.fillOval(x, y, 26, 26);
            g2.setColor(Color.WHITE);
            g2.setStroke(new BasicStroke(1.5f));
            g2.drawOval(x + 2, y + 2, 22, 22);
        }

        private void drawPlayerSeat(Graphics2D g2, AppPlayer p, int cx, int cy) {
            int cardW = 46;
            int cardH = 65;
            int totalCardsW = 3 * cardW + 10;
            int startX = cx - totalCardsW / 2;

            // Player Info Badge
            String nameText = p.name + " (₹" + p.chips + ")";
            g2.setFont(new Font("Segoe UI", Font.BOLD, 12));
            FontMetrics fm = g2.getFontMetrics();
            int badgeW = Math.max(fm.stringWidth(nameText) + 20, 110);
            int badgeH = 24;

            // Dim if folded
            float alpha = p.isActive ? 1.0f : 0.4f;
            Composite origComp = g2.getComposite();
            g2.setComposite(AlphaComposite.getInstance(AlphaComposite.SRC_OVER, alpha));

            int badgeY = p.isHuman ? cy + cardH + 10 : cy - 32;

            // Badge Background
            g2.setColor(new Color(0, 0, 0, 180));
            g2.fillRoundRect(cx - badgeW / 2, badgeY, badgeW, badgeH, 12, 12);
            g2.setColor(p.isHuman ? new Color(245, 197, 24) : new Color(138, 180, 248));
            g2.setStroke(new BasicStroke(1.2f));
            g2.drawRoundRect(cx - badgeW / 2, badgeY, badgeW, badgeH, 12, 12);

            // Badge Text
            g2.drawString(nameText, cx - fm.stringWidth(nameText) / 2, badgeY + 16);

            // Status pill
            String status = p.statusText;
            g2.setFont(new Font("Segoe UI", Font.BOLD, 10));
            FontMetrics sfm = g2.getFontMetrics();
            int pillW = sfm.stringWidth(status) + 12;
            int pillH = 16;
            int pillY = p.isHuman ? badgeY + badgeH + 4 : badgeY - pillH - 3;

            Color statusBg = p.isActive ? (p.hasSeen ? new Color(230, 81, 0) : new Color(46, 125, 50)) : new Color(180, 40, 40);
            g2.setColor(statusBg);
            g2.fillRoundRect(cx - pillW / 2, pillY, pillW, pillH, 8, 8);
            g2.setColor(Color.WHITE);
            g2.drawString(status, cx - sfm.stringWidth(status) / 2, pillY + 12);

            // Draw 3 Cards
            for (int i = 0; i < p.hand.size(); i++) {
                Card c = p.hand.get(i);
                int cardX = startX + i * (cardW + 5);
                int cardY = cy;
                boolean reveal = (p.isHuman && p.hasSeen) || isRoundOver;
                drawCard(g2, c, cardX, cardY, cardW, cardH, reveal);
            }

            g2.setComposite(origComp);
        }

        private void drawCard(Graphics2D g2, Card card, int x, int y, int w, int h, boolean faceUp) {
            // Drop shadow
            g2.setColor(new Color(0, 0, 0, 60));
            g2.fillRoundRect(x + 2, y + 3, w, h, 8, 8);

            if (!faceUp) {
                // Card Back Pattern
                g2.setColor(new Color(25, 45, 95));
                g2.fillRoundRect(x, y, w, h, 8, 8);
                g2.setColor(new Color(212, 175, 55));
                g2.setStroke(new BasicStroke(1.2f));
                g2.drawRoundRect(x + 2, y + 2, w - 4, h - 4, 6, 6);

                // Inner diamond pattern
                g2.setColor(new Color(40, 70, 140));
                g2.fillOval(x + w / 2 - 8, y + h / 2 - 8, 16, 16);
                g2.setColor(new Color(212, 175, 55));
                g2.drawOval(x + w / 2 - 8, y + h / 2 - 8, 16, 16);
            } else {
                // Card Face (White)
                g2.setColor(Color.WHITE);
                g2.fillRoundRect(x, y, w, h, 8, 8);
                g2.setColor(new Color(180, 185, 195));
                g2.setStroke(new BasicStroke(1));
                g2.drawRoundRect(x, y, w, h, 8, 8);

                String suit = card.getSuit();
                String rank = card.getRank();
                boolean isRed = suit.equalsIgnoreCase("Heart") || suit.equalsIgnoreCase("Diamond");
                Color suitColor = isRed ? new Color(215, 38, 56) : new Color(30, 30, 35);

                String symbol = switch (suit.toLowerCase()) {
                    case "heart" -> "♥";
                    case "diamond" -> "♦";
                    case "spade" -> "♠";
                    case "club" -> "♣";
                    default -> "?";
                };

                // Rank top-left
                g2.setColor(suitColor);
                g2.setFont(new Font("Segoe UI", Font.BOLD, 12));
                g2.drawString(rank, x + 4, y + 14);

                // Small suit under rank
                g2.setFont(new Font("Segoe UI", Font.PLAIN, 10));
                g2.drawString(symbol, x + 4, y + 26);

                // Center large suit symbol
                g2.setFont(new Font("Segoe UI", Font.BOLD, 22));
                FontMetrics fm = g2.getFontMetrics();
                int symW = fm.stringWidth(symbol);
                g2.drawString(symbol, x + (w - symW) / 2, y + (h / 2) + 8);
            }
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception ignored) {}
            new TeenPattiApp().setVisible(true);
        });
    }
}
