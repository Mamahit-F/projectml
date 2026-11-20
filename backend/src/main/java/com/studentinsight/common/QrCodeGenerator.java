package com.studentinsight.common;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Pure-Java ISO/IEC 18004 QR Code generator (Byte mode, ECC Level M, Versions 1-4)
 * with zero external library dependencies.
 */
public final class QrCodeGenerator {

    private static final int[] TOTAL_CODEWORDS = {0, 26, 44, 70, 100};
    private static final int[] ECC_CODEWORDS_M = {0, 10, 16, 26, 36};
    private static final int[] DATA_CODEWORDS_M = {0, 16, 28, 44, 64};

    private QrCodeGenerator() {}

    public static String toPngDataUrl(String text, int scale) {
        try {
            boolean[][] matrix = encode(text);
            int n = matrix.length;
            int quiet = 4;
            int imgSize = (n + quiet * 2) * scale;
            BufferedImage img = new BufferedImage(imgSize, imgSize, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = img.createGraphics();
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, imgSize, imgSize);
            g.setColor(Color.BLACK);
            for (int r = 0; r < n; r++) {
                for (int c = 0; c < n; c++) {
                    if (matrix[r][c]) {
                        g.fillRect((c + quiet) * scale, (r + quiet) * scale, scale, scale);
                    }
                }
            }
            g.dispose();
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(img, "png", baos);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(baos.toByteArray());
        } catch (Exception e) {
            throw new IllegalStateException("Failed to generate QR code", e);
        }
    }

    public static boolean[][] encode(String text) {
        byte[] raw = text.getBytes(StandardCharsets.UTF_8);
        int version = -1;
        for (int v = 1; v <= 4; v++) {
            if (raw.length + 2 <= DATA_CODEWORDS_M[v]) {
                version = v;
                break;
            }
        }
        if (version == -1) {
            throw new IllegalArgumentException("QR text too long (max 62 bytes)");
        }

        int dataCap = DATA_CODEWORDS_M[version];
        int eccLen = ECC_CODEWORDS_M[version];

        // Build bit stream: 0100 (byte mode) + 8-bit length + bytes + terminator + padding
        int[] bits = new int[dataCap * 8];
        int idx = 0;
        idx = writeBits(bits, idx, 0b0100, 4);
        idx = writeBits(bits, idx, raw.length, 8);
        for (byte b : raw) {
            idx = writeBits(bits, idx, b & 0xFF, 8);
        }
        int term = Math.min(4, bits.length - idx);
        idx += term;
        while (idx % 8 != 0 && idx < bits.length) {
            idx++;
        }
        int byteIdx = idx / 8;
        int[] dataCodewords = new int[dataCap];
        for (int i = 0; i < byteIdx; i++) {
            int val = 0;
            for (int b = 0; b < 8; b++) {
                val = (val << 1) | bits[i * 8 + b];
            }
            dataCodewords[i] = val;
        }
        for (int i = byteIdx, p = 0; i < dataCap; i++, p++) {
            dataCodewords[i] = (p % 2 == 0) ? 0xEC : 0x11;
        }

        int[] ecc = reedSolomonCompute(dataCodewords, eccLen);
        int totalCw = TOTAL_CODEWORDS[version];
        int[] allCw = new int[totalCw];
        System.arraycopy(dataCodewords, 0, allCw, 0, dataCap);
        System.arraycopy(ecc, 0, allCw, dataCap, eccLen);

        int size = version * 4 + 17;
        boolean[][] modules = new boolean[size][size];
        boolean[][] isFunction = new boolean[size][size];

        drawFunctionPatterns(version, size, modules, isFunction);
        drawCodewords(size, allCw, modules, isFunction);

        int bestMask = 0;
        int bestPenalty = Integer.MAX_VALUE;
        for (int mask = 0; mask < 8; mask++) {
            applyMask(size, modules, isFunction, mask);
            drawFormatBits(size, modules, isFunction, mask);
            int penalty = getPenaltyScore(size, modules);
            if (penalty < bestPenalty) {
                bestPenalty = penalty;
                bestMask = mask;
            }
            applyMask(size, modules, isFunction, mask);
        }
        applyMask(size, modules, isFunction, bestMask);
        drawFormatBits(size, modules, isFunction, bestMask);
        return modules;
    }

    private static int writeBits(int[] bits, int idx, int val, int len) {
        for (int i = len - 1; i >= 0; i--) {
            bits[idx++] = (val >>> i) & 1;
        }
        return idx;
    }

    private static void drawFunctionPatterns(int version, int size, boolean[][] m, boolean[][] f) {
        // Timing patterns
        for (int i = 0; i < size; i++) {
            setFn(m, f, 6, i, i % 2 == 0);
            setFn(m, f, i, 6, i % 2 == 0);
        }
        // Finder patterns
        drawFinder(m, f, 3, 3);
        drawFinder(m, f, size - 4, 3);
        drawFinder(m, f, 3, size - 4);

        // Alignment pattern for versions 2..4 (single at size - 7, size - 7)
        if (version >= 2) {
            int center = size - 7;
            for (int dr = -2; dr <= 2; dr++) {
                for (int dc = -2; dc <= 2; dc++) {
                    boolean dark = Math.max(Math.abs(dr), Math.abs(dc)) != 1;
                    setFn(m, f, center + dr, center + dc, dark);
                }
            }
        }
        // Reserve format info areas
        for (int i = 0; i < 9; i++) {
            if (i != 6) {
                f[8][i] = true;
                f[i][8] = true;
            }
        }
        for (int i = size - 8; i < size; i++) {
            f[8][i] = true;
            f[i][8] = true;
        }
        setFn(m, f, size - 8, 8, true); // dark module
    }

    private static void drawFinder(boolean[][] m, boolean[][] f, int r, int c) {
        for (int dr = -4; dr <= 4; dr++) {
            for (int dc = -4; dc <= 4; dc++) {
                int rr = r + dr, cc = c + dc;
                if (rr >= 0 && rr < m.length && cc >= 0 && cc < m.length) {
                    int dist = Math.max(Math.abs(dr), Math.abs(dc));
                    setFn(m, f, rr, cc, dist != 2 && dist != 4);
                }
            }
        }
    }

    private static void setFn(boolean[][] m, boolean[][] f, int r, int c, boolean dark) {
        m[r][c] = dark;
        f[r][c] = true;
    }

    private static void drawFormatBits(int size, boolean[][] m, boolean[][] f, int mask) {
        // ECC M = 00 -> 5-bit data = (0 << 3) | mask
        int data = mask;
        int rem = data;
        for (int i = 0; i < 10; i++) {
            rem = (rem << 1) ^ (((rem >>> 9) & 1) * 0x537);
        }
        int bits = ((data << 10) | rem) ^ 0x5412;

        for (int i = 0; i <= 5; i++) setFn(m, f, 8, i, ((bits >>> i) & 1) != 0);
        setFn(m, f, 8, 7, ((bits >>> 6) & 1) != 0);
        setFn(m, f, 8, 8, ((bits >>> 7) & 1) != 0);
        setFn(m, f, 7, 8, ((bits >>> 8) & 1) != 0);
        for (int i = 9; i < 15; i++) setFn(m, f, 14 - i, 8, ((bits >>> i) & 1) != 0);

        for (int i = 0; i < 8; i++) setFn(m, f, size - 1 - i, 8, ((bits >>> i) & 1) != 0);
        for (int i = 8; i < 15; i++) setFn(m, f, 8, size - 15 + i, ((bits >>> i) & 1) != 0);
    }

    private static void drawCodewords(int size, int[] data, boolean[][] m, boolean[][] f) {
        int bitIdx = 0;
        int totalBits = data.length * 8;
        for (int right = size - 1; right >= 1; right -= 2) {
            if (right == 6) right = 5;
            for (int vert = 0; vert < size; vert++) {
                for (int j = 0; j < 2; j++) {
                    int x = right - j;
                    boolean upward = ((right + 1) & 2) == 0;
                    int y = upward ? (size - 1 - vert) : vert;
                    if (!f[y][x] && bitIdx < totalBits) {
                        int cw = data[bitIdx >>> 3];
                        int bit = (cw >>> (7 - (bitIdx & 7))) & 1;
                        m[y][x] = bit != 0;
                        bitIdx++;
                    }
                }
            }
        }
    }

    private static void applyMask(int size, boolean[][] m, boolean[][] f, int mask) {
        for (int y = 0; y < size; y++) {
            for (int x = 0; x < size; x++) {
                if (!f[y][x]) {
                    boolean inv = switch (mask) {
                        case 0 -> (x + y) % 2 == 0;
                        case 1 -> y % 2 == 0;
                        case 2 -> x % 3 == 0;
                        case 3 -> (x + y) % 3 == 0;
                        case 4 -> (x / 3 + y / 2) % 2 == 0;
                        case 5 -> (x * y) % 2 + (x * y) % 3 == 0;
                        case 6 -> ((x * y) % 2 + (x * y) % 3) % 2 == 0;
                        case 7 -> ((x + y) % 2 + (x * y) % 3) % 2 == 0;
                        default -> false;
                    };
                    if (inv) m[y][x] = !m[y][x];
                }
            }
        }
    }

    private static int getPenaltyScore(int size, boolean[][] m) {
        int score = 0;
        for (int y = 0; y < size; y++) {
            int run = 1;
            for (int x = 1; x < size; x++) {
                if (m[y][x] == m[y][x - 1]) {
                    run++;
                    if (run == 5) score += 3;
                    else if (run > 5) score++;
                } else {
                    run = 1;
                }
            }
        }
        for (int x = 0; x < size; x++) {
            int run = 1;
            for (int y = 1; y < size; y++) {
                if (m[y][x] == m[y - 1][x]) {
                    run++;
                    if (run == 5) score += 3;
                    else if (run > 5) score++;
                } else {
                    run = 1;
                }
            }
        }
        return score;
    }

    private static int[] reedSolomonCompute(int[] data, int degree) {
        int[] gen = new int[degree];
        gen[degree - 1] = 1;
        int root = 1;
        for (int i = 0; i < degree; i++) {
            for (int j = 0; j < degree; j++) {
                gen[j] = gfMultiply(gen[j], root);
                if (j + 1 < degree) {
                    gen[j] ^= gen[j + 1];
                }
            }
            root = gfMultiply(root, 2);
        }
        int[] rem = new int[degree];
        for (int b : data) {
            int factor = b ^ rem[0];
            System.arraycopy(rem, 1, rem, 0, degree - 1);
            rem[degree - 1] = 0;
            for (int i = 0; i < degree; i++) {
                rem[i] ^= gfMultiply(gen[i], factor);
            }
        }
        return rem;
    }

    private static int gfMultiply(int x, int y) {
        int z = 0;
        for (int i = 7; i >= 0; i--) {
            z = (z << 1) ^ ((z >>> 7) * 0x11D);
            z ^= ((y >>> i) & 1) * x;
        }
        return z;
    }
}
