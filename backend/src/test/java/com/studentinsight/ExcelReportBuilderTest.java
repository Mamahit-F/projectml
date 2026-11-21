package com.studentinsight;

import com.studentinsight.report.ExcelReportBuilder;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class ExcelReportBuilderTest {

    @Test
    void buildWorkbook_ProducesValidStructuredXlsx() throws Exception {
        byte[] xlsx = ExcelReportBuilder.buildWorkbook(
                "Rekap Mahasiswa",
                "STUDENTINSIGHT — REKAPITULASI",
                "Universitas Klabat",
                List.of("No", "Nomor Registrasi", "Nama Lengkap", "Poin Sabat", "Tingkat Risiko"),
                List.of(
                        List.of(1, "12510613", "Kenneth Haliman Lumoring", 204, "HIGH"),
                        List.of(2, "12410192", "Tiara Limbong", 0, "SAFE")
                ),
                4
        );

        assertNotNull(xlsx);
        assertTrue(xlsx.length > 1000);

        try (XSSFWorkbook wb = new XSSFWorkbook(new ByteArrayInputStream(xlsx))) {
            var sheet = wb.getSheet("Rekap Mahasiswa");
            assertNotNull(sheet);
            assertEquals("STUDENTINSIGHT — REKAPITULASI", sheet.getRow(0).getCell(0).getStringCellValue());
            assertEquals("Nomor Registrasi", sheet.getRow(3).getCell(1).getStringCellValue());
            assertEquals("12510613", sheet.getRow(4).getCell(1).getStringCellValue());
            assertEquals(204.0, sheet.getRow(4).getCell(3).getNumericCellValue());
            assertEquals("Risiko Tinggi", sheet.getRow(4).getCell(4).getStringCellValue());
            assertEquals("Aman (0 Poin)", sheet.getRow(5).getCell(4).getStringCellValue());
        }
    }
}
