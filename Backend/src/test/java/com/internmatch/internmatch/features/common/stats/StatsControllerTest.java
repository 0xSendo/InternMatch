package com.internmatch.internmatch.features.common.stats;

import com.internmatch.internmatch.TestSecurityConfig;
import com.internmatch.internmatch.features.auth.UserRepository;
import com.internmatch.internmatch.features.auth.security.JwtAuthenticationFilter;
import io.qameta.allure.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = StatsController.class,
        excludeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
                classes = JwtAuthenticationFilter.class))
@Import(TestSecurityConfig.class)
@TestPropertySource(properties = "spring.test.mockmvc.add-filter=false")
@Epic("Analytics")
@Feature("Stats API")
class StatsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private StatsService statsService;

    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private PasswordEncoder passwordEncoder;

    @Nested
    @Story("Job trends endpoint")
    class JobTrends {

        @Test
        @DisplayName("Returns sector employment trends for an authenticated user")
        @WithMockUser(roles = "STUDENT")
        void jobTrends() throws Exception {
            when(statsService.getJobTrends()).thenReturn(Map.of(
                    "source", "World Bank Indicators API (sourced from PSA Philippines)",
                    "data", List.of(
                            Map.of("sector", "Services", "employmentRate", 60.1),
                            Map.of("sector", "Agriculture", "employmentRate", 22.4))));

            mockMvc.perform(get("/api/v1/stats/job-trends"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data", hasSize(2)))
                    .andExpect(jsonPath("$.data[0].sector").value("Services"))
                    .andExpect(jsonPath("$.data[0].employmentRate").value(60.1));
        }
    }

    @Nested
    @Story("Employer interest endpoint")
    class EmployerInterest {

        @Test
        @DisplayName("Returns enriched per-category demand metrics")
        @WithMockUser(roles = "STUDENT")
        void employerInterest() throws Exception {
            when(statsService.getEmployerInterest()).thenReturn(Map.of(
                    "totalPostings", 3,
                    "activePostings", 2,
                    "totalApplications", 4,
                    "data", List.of(
                            Map.of("category", "Tech & Development", "postings", 1,
                                    "applications", 3, "applicationsPerPosting", 3.0,
                                    "accepted", 1, "rejected", 1, "shortlisted", 0,
                                    "pending", 1, "acceptanceRate", 50.0))));

            mockMvc.perform(get("/api/v1/stats/employer-interest"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalPostings").value(3))
                    .andExpect(jsonPath("$.activePostings").value(2))
                    .andExpect(jsonPath("$.data", hasSize(1)))
                    .andExpect(jsonPath("$.data[0].applicationsPerPosting").value(3.0))
                    .andExpect(jsonPath("$.data[0].acceptanceRate").value(50.0));
        }
    }

    @Nested
    @Story("Market overview endpoint")
    class MarketOverview {

        @Test
        @DisplayName("Returns posting momentum, setup, location and top employers")
        @WithMockUser(roles = "STUDENT")
        void marketOverview() throws Exception {
            when(statsService.getMarketOverview()).thenReturn(Map.of(
                    "activePostings", 3,
                    "postingTrend", List.of(
                            Map.of("month", "2026-08", "postings", 1, "applications", 0),
                            Map.of("month", "2026-09", "postings", 2, "applications", 1)),
                    "setupSplit", List.of(Map.of("setup", "Remote", "postings", 2)),
                    "locationSplit", List.of(Map.of("location", "Makati", "postings", 2)),
                    "topEmployers", List.of(Map.of("company", "ACME Corp", "postings", 2, "applications", 1)),
                    "lastUpdated", "2026-09-14T12:00:00"));

            mockMvc.perform(get("/api/v1/stats/market-overview"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.activePostings").value(3))
                    .andExpect(jsonPath("$.postingTrend", hasSize(2)))
                    .andExpect(jsonPath("$.postingTrend[1].month").value("2026-09"))
                    .andExpect(jsonPath("$.postingTrend[1].applications").value(1))
                    .andExpect(jsonPath("$.setupSplit[0].setup").value("Remote"))
                    .andExpect(jsonPath("$.locationSplit[0].location").value("Makati"))
                    .andExpect(jsonPath("$.topEmployers[0].company").value("ACME Corp"));
        }

        @Test
        @DisplayName("Requires authentication")
        void unauthenticatedReturns401() throws Exception {
            mockMvc.perform(get("/api/v1/stats/market-overview"))
                    .andExpect(status().isUnauthorized());
        }
    }
}