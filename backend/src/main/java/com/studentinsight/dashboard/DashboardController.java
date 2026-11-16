package com.studentinsight.dashboard;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.dashboard.dto.DashboardOverviewDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/overview")
    public ResponseEntity<ApiResponse<DashboardOverviewDTO>> getOverview() {
        return ResponseEntity.ok(ApiResponse.ok("Dashboard overview retrieved", dashboardService.getOverview()));
    }
}
