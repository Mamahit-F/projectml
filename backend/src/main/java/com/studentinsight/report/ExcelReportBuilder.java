package com.studentinsight.report;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Shared Apache POI builder for structured, styled Excel (.xlsx) reports.
 */
public final class ExcelReportBuilder {

    private ExcelReportBuilder() {
    }

    public static byte[] buildWorkbook(
            String sheetName,
            String title,
            String subtitle,
            List<String> headers,
            List<List<Object>> rows,
            int riskColIndex) throws IOException {

        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet(sanitizeSheetName(sheetName));
            sheet.setDisplayGridlines(true);

            int colCount = headers.size();

            // Fonts
            XSSFFont titleFont = wb.createFont();
            titleFont.setFontName("Calibri");
            titleFont.setFontHeightInPoints((short) 14);
            titleFont.setBold(true);
            titleFont.setColor(new XSSFColor(new byte[]{22, 22, 24}, null));

            XSSFFont subtitleFont = wb.createFont();
            subtitleFont.setFontName("Calibri");
            subtitleFont.setFontHeightInPoints((short) 10);
            subtitleFont.setColor(new XSSFColor(new byte[]{100, 116, (byte) 139}, null));

            XSSFFont headerFont = wb.createFont();
            headerFont.setFontName("Calibri");
            headerFont.setFontHeightInPoints((short) 11);
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            XSSFFont bodyFont = wb.createFont();
            bodyFont.setFontName("Calibri");
            bodyFont.setFontHeightInPoints((short) 10);
            bodyFont.setColor(new XSSFColor(new byte[]{22, 22, 24}, null));

            // Title & Subtitle Styles
            XSSFCellStyle titleStyle = wb.createCellStyle();
            titleStyle.setFont(titleFont);
            titleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            XSSFCellStyle subtitleStyle = wb.createCellStyle();
            subtitleStyle.setFont(subtitleFont);
            subtitleStyle.setVerticalAlignment(VerticalAlignment.CENTER);

            // Header Style (Obsidian #161618)
            XSSFCellStyle headerStyle = wb.createCellStyle();
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(new XSSFColor(new byte[]{22, 22, 24}, null));
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.LEFT);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            applyThinBorders(headerStyle, new XSSFColor(new byte[]{38, 38, 42}, null));

            // Base Data Styles (white & zebra)
            XSSFCellStyle evenText = createBodyStyle(wb, bodyFont, false, HorizontalAlignment.LEFT, false);
            XSSFCellStyle oddText = createBodyStyle(wb, bodyFont, true, HorizontalAlignment.LEFT, false);
            XSSFCellStyle evenNum = createBodyStyle(wb, bodyFont, false, HorizontalAlignment.RIGHT, false);
            XSSFCellStyle oddNum = createBodyStyle(wb, bodyFont, true, HorizontalAlignment.RIGHT, false);
            XSSFCellStyle evenWrap = createBodyStyle(wb, bodyFont, false, HorizontalAlignment.LEFT, true);
            XSSFCellStyle oddWrap = createBodyStyle(wb, bodyFont, true, HorizontalAlignment.LEFT, true);

            // Risk Highlight Styles
            XSSFCellStyle riskHigh = createRiskStyle(wb, new byte[]{(byte) 255, (byte) 229, (byte) 220}, new byte[]{(byte) 196, 54, 18});
            XSSFCellStyle riskMed = createRiskStyle(wb, new byte[]{(byte) 254, (byte) 243, (byte) 199}, new byte[]{(byte) 180, 83, 9});
            XSSFCellStyle riskLow = createRiskStyle(wb, new byte[]{(byte) 224, (byte) 242, (byte) 254}, new byte[]{3, 105, (byte) 161});
            XSSFCellStyle riskSafe = createRiskStyle(wb, new byte[]{(byte) 209, (byte) 250, (byte) 229}, new byte[]{4, 120, 87});

            // Row 0: Title
            Row r0 = sheet.createRow(0);
            r0.setHeightInPoints(24);
            Cell c0 = r0.createCell(0);
            c0.setCellValue(title);
            c0.setCellStyle(titleStyle);
            if (colCount > 1) {
                sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, colCount - 1));
            }

            // Row 1: Subtitle + Timestamp
            Row r1 = sheet.createRow(1);
            r1.setHeightInPoints(18);
            Cell c1 = r1.createCell(0);
            String stamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm"));
            c1.setCellValue(subtitle + "  •  Dicetak pada " + stamp + "  •  Total Baris: " + rows.size());
            c1.setCellStyle(subtitleStyle);
            if (colCount > 1) {
                sheet.addMergedRegion(new CellRangeAddress(1, 1, 0, colCount - 1));
            }

            // Row 2: Spacer
            Row r2 = sheet.createRow(2);
            r2.setHeightInPoints(8);

            // Row 3: Table Header
            int headerRowIdx = 3;
            Row headerRow = sheet.createRow(headerRowIdx);
            headerRow.setHeightInPoints(26);
            int[] maxCharWidths = new int[colCount];
            for (int c = 0; c < colCount; c++) {
                String h = headers.get(c);
                Cell cell = headerRow.createCell(c);
                cell.setCellValue(h);
                cell.setCellStyle(headerStyle);
                maxCharWidths[c] = h.length() + 4;
            }

            // Data Rows
            for (int rIdx = 0; rIdx < rows.size(); rIdx++) {
                Row row = sheet.createRow(headerRowIdx + 1 + rIdx);
                row.setHeightInPoints(20);
                boolean isOdd = (rIdx % 2 == 1);
                List<Object> rowValues = rows.get(rIdx);

                for (int c = 0; c < colCount; c++) {
                    Object val = c < rowValues.size() ? rowValues.get(c) : "";
                    Cell cell = row.createCell(c);

                    if (c == riskColIndex && val != null) {
                        String label = translateRisk(val.toString());
                        cell.setCellValue(label);
                        String upper = val.toString().toUpperCase();
                        if (upper.contains("HIGH") || upper.contains("TINGGI")) {
                            cell.setCellStyle(riskHigh);
                        } else if (upper.contains("MEDIUM") || upper.contains("SEDANG")) {
                            cell.setCellStyle(riskMed);
                        } else if (upper.contains("LOW") || upper.contains("RENDAH")) {
                            cell.setCellStyle(riskLow);
                        } else {
                            cell.setCellStyle(riskSafe);
                        }
                        maxCharWidths[c] = Math.max(maxCharWidths[c], label.length() + 4);
                    } else if (val instanceof Integer intVal) {
                        cell.setCellValue(intVal);
                        cell.setCellStyle(isOdd ? oddNum : evenNum);
                        maxCharWidths[c] = Math.max(maxCharWidths[c], String.valueOf(intVal).length() + 4);
                    } else if (val instanceof Long longVal) {
                        cell.setCellValue(longVal);
                        cell.setCellStyle(isOdd ? oddNum : evenNum);
                        maxCharWidths[c] = Math.max(maxCharWidths[c], String.valueOf(longVal).length() + 4);
                    } else if (val instanceof Double dblVal) {
                        cell.setCellValue(Math.round(dblVal * 10.0) / 10.0);
                        cell.setCellStyle(isOdd ? oddNum : evenNum);
                        maxCharWidths[c] = Math.max(maxCharWidths[c], String.valueOf(dblVal).length() + 4);
                    } else {
                        String text = val != null ? val.toString() : "-";
                        if (text.isBlank()) text = "-";
                        cell.setCellValue(text);
                        boolean longText = text.length() > 45;
                        cell.setCellStyle(longText ? (isOdd ? oddWrap : evenWrap) : (isOdd ? oddText : evenText));
                        maxCharWidths[c] = Math.max(maxCharWidths[c], Math.min(48, text.length() + 4));
                    }
                }
            }

            // Set column widths cleanly (1 char ~= 256 units)
            for (int c = 0; c < colCount; c++) {
                int w = Math.max(12, Math.min(50, maxCharWidths[c]));
                sheet.setColumnWidth(c, w * 256);
            }

            // AutoFilter & Freeze Header
            if (!rows.isEmpty()) {
                sheet.setAutoFilter(new CellRangeAddress(headerRowIdx, headerRowIdx + rows.size(), 0, colCount - 1));
            }
            sheet.createFreezePane(0, headerRowIdx + 1);

            wb.write(out);
            return out.toByteArray();
        }
    }

    private static XSSFCellStyle createBodyStyle(
            XSSFWorkbook wb, XSSFFont font, boolean zebra, HorizontalAlignment align, boolean wrap) {
        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font);
        style.setAlignment(align);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setWrapText(wrap);
        if (zebra) {
            style.setFillForegroundColor(new XSSFColor(new byte[]{(byte) 248, (byte) 249, (byte) 251}, null));
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }
        applyThinBorders(style, new XSSFColor(new byte[]{(byte) 226, (byte) 229, (byte) 236}, null));
        return style;
    }

    private static XSSFCellStyle createRiskStyle(XSSFWorkbook wb, byte[] bgRgb, byte[] fgRgb) {
        XSSFFont font = wb.createFont();
        font.setFontName("Calibri");
        font.setFontHeightInPoints((short) 10);
        font.setBold(true);
        font.setColor(new XSSFColor(fgRgb, null));

        XSSFCellStyle style = wb.createCellStyle();
        style.setFont(font);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setFillForegroundColor(new XSSFColor(bgRgb, null));
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        applyThinBorders(style, new XSSFColor(new byte[]{(byte) 226, (byte) 229, (byte) 236}, null));
        return style;
    }

    private static void applyThinBorders(XSSFCellStyle style, XSSFColor color) {
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        style.setTopBorderColor(color);
        style.setBottomBorderColor(color);
        style.setLeftBorderColor(color);
        style.setRightBorderColor(color);
    }

    private static String translateRisk(String risk) {
        return switch (risk.toUpperCase()) {
            case "HIGH" -> "Risiko Tinggi";
            case "MEDIUM" -> "Risiko Sedang";
            case "LOW" -> "Risiko Rendah";
            case "SAFE" -> "Aman (0 Poin)";
            default -> risk;
        };
    }

    private static String sanitizeSheetName(String raw) {
        String cleaned = raw.replaceAll("[\\\\/?*\\[\\]:]", " ").trim();
        return cleaned.length() > 31 ? cleaned.substring(0, 31) : cleaned;
    }
}
