package com.internmatch.internmatch.features.common.stats;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.internmatch.internmatch.features.internship.Application;
import com.internmatch.internmatch.features.internship.ApplicationRepository;
import com.internmatch.internmatch.features.internship.ApplicationStatus;
import com.internmatch.internmatch.features.internship.Internship;
import com.internmatch.internmatch.features.internship.InternshipRepository;
import com.internmatch.internmatch.features.internship.InternshipStatus;
import io.qameta.allure.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@Epic("Analytics")
@Feature("Dashboard Insights")
class StatsServiceTest {

    @Mock
    private RestTemplate restTemplate;
    @Mock
    private InternshipRepository internshipRepository;
    @Mock
    private ApplicationRepository applicationRepository;

    private StatsService service;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @BeforeEach
    void setUp() {
        service = new StatsService(restTemplate, objectMapper, internshipRepository, applicationRepository);
    }

    private Internship internship(Long id, String title) {
        return Internship.builder().id(id).title(title).build();
    }

    private Internship fullInternship(Long id, String title, String createdAt, InternshipStatus status,
                                      String setup, String location, String company) {
        return Internship.builder()
                .id(id).title(title)
                .status(status)
                .createdAt(LocalDate.parse(createdAt))
                .setup(setup).location(location).company(company)
                .build();
    }

    private Application application(Long id, Internship internship) {
        return Application.builder().id(id).internship(internship).build();
    }

    private Application application(Long id, Internship internship, ApplicationStatus status) {
        return Application.builder().id(id).internship(internship).status(status).build();
    }

    private Application applicationApplied(Long id, Internship internship, ApplicationStatus status, String appliedAt) {
        return Application.builder()
                .id(id).internship(internship).status(status)
                .appliedAt(LocalDateTime.parse(appliedAt))
                .build();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> dataOf(Map<String, Object> response) {
        return (List<Map<String, Object>>) response.get("data");
    }

    private Map<String, Object> findByCategory(List<Map<String, Object>> data, String category) {
        return data.stream()
                .filter(item -> category.equals(item.get("category")))
                .findFirst()
                .orElseThrow(() -> new AssertionError("Missing category: " + category));
    }

    @Nested
    @Story("Employer interest aggregation")
    class EmployerInterest {

        @Test
        @DisplayName("Categorizes postings by title keywords and counts applications per category")
        void categorizesAndCounts() {
            Internship dev = internship(1L, "Software Engineer Intern");
            Internship secondDev = internship(2L, "Backend Developer Intern");
            Internship design = internship(3L, "UI/UX Designer");
            Internship dataIntern = internship(4L, "Data Analyst");
            Internship marketing = internship(5L, "Marketing Intern");
            Internship admin = internship(6L, "Office Admin Assistant");
            Internship other = internship(7L, "General Support");

            when(internshipRepository.findAll()).thenReturn(List.of(
                    dev, secondDev, design, dataIntern, marketing, admin, other));
            when(applicationRepository.findAll()).thenReturn(List.of(
                    application(1L, dev),
                    application(2L, dev),
                    application(3L, design),
                    application(4L, marketing)));

            Map<String, Object> response = service.getEmployerInterest();

            List<Map<String, Object>> data = dataOf(response);
            assertEquals(7, response.get("totalPostings"));
            assertEquals(4, response.get("totalApplications"));

            // Tech & Development holds the most postings, so it sorts first.
            assertEquals("Tech & Development", data.get(0).get("category"));
            assertEquals(2, data.get(0).get("postings"));
            assertEquals(2, data.get(0).get("applications"));

            assertEquals(1, findByCategory(data, "Design & Creative").get("postings"));
            assertEquals(1, findByCategory(data, "Marketing & Sales").get("postings"));
            assertEquals(1, findByCategory(data, "Data & Analytics").get("postings"));
            assertEquals(1, findByCategory(data, "Business & Admin").get("postings"));
            assertEquals(1, findByCategory(data, "Other").get("postings"));
            assertEquals(0, findByCategory(data, "Data & Analytics").get("applications"));
        }

        @Test
        @DisplayName("Category fallback returns Other for unrecognized titles")
        void unrecognizedTitleBecomesOther() {
            when(internshipRepository.findAll()).thenReturn(List.of(internship(9L, "Startup Explorer")));
            when(applicationRepository.findAll()).thenReturn(List.of());

            List<Map<String, Object>> data = dataOf(service.getEmployerInterest());

            assertEquals(1, data.size());
            assertEquals("Other", data.get(0).get("category"));
        }

        @Test
        @DisplayName("Computes competition ratio, decision counts and acceptance rate per category")
        void computesCompetitionAndAcceptance() {
            Internship dev = fullInternship(1L, "Software Engineer", "2026-08-01", InternshipStatus.ACTIVE, "Remote", "Manila", "ACME Corp");
            Internship design = fullInternship(2L, "UI/UX Designer", "2026-09-01", InternshipStatus.ACTIVE, "Hybrid", "Makati", "ACME Corp");
            Internship marketing = fullInternship(3L, "Marketing Intern", "2026-09-10", InternshipStatus.CLOSED, "Onsite", "Quezon City", "Globex");

            when(internshipRepository.findAll()).thenReturn(List.of(dev, design, marketing));
            when(applicationRepository.findAll()).thenReturn(List.of(
                    application(1L, dev, ApplicationStatus.ACCEPTED),
                    application(2L, dev, ApplicationStatus.REJECTED),
                    application(3L, dev, ApplicationStatus.PENDING),
                    application(4L, design, ApplicationStatus.ACCEPTED)));

            Map<String, Object> response = service.getEmployerInterest();
            List<Map<String, Object>> data = dataOf(response);

            Map<String, Object> tech = findByCategory(data, "Tech & Development");
            assertEquals(1, tech.get("postings"));
            assertEquals(3, tech.get("applications"));
            assertEquals(3.0, (Double) tech.get("applicationsPerPosting"), 0.001);
            assertEquals(1, tech.get("accepted"));
            assertEquals(1, tech.get("rejected"));
            assertEquals(0, tech.get("shortlisted"));
            assertEquals(1, tech.get("pending"));
            assertEquals(50.0, (Double) tech.get("acceptanceRate"), 0.001);

            assertEquals(2, response.get("activePostings"));

            @SuppressWarnings("unchecked")
            Map<String, Object> market = (Map<String, Object>) response.get("market");
            assertEquals(3, market.get("totalPostings"));
            assertEquals(4, market.get("totalApplications"));
            assertEquals(1.3, (Double) market.get("avgApplicationsPerPosting"), 0.001);
            assertEquals(66.7, (Double) market.get("overallAcceptanceRate"), 0.001);
        }

        @Test
        @DisplayName("Returns an empty payload when the repositories are unavailable")
        void repositoryFailureReturnsEmptyPayload() {
            when(internshipRepository.findAll()).thenThrow(new RuntimeException("db down"));

            Map<String, Object> response = service.getEmployerInterest();

            assertTrue(dataOf(response).isEmpty());
        }
    }

    @Nested
    @Story("Job trends from external data")
    class JobTrends {

        @Test
        @DisplayName("Parses World Bank JSON and sorts sectors by employment rate")
        void parsesAndSortsWorldBankJson() {
            List<String> urls = List.of(
                    "SL.SRV.EMPL.ZS", "SL.AGR.EMPL.ZS", "SL.IND.EMPL.ZS");
            when(restTemplate.getForObject(anyString(), eq(String.class))).thenAnswer(inv -> {
                String url = inv.getArgument(0);
                for (String indicator : urls) {
                    if (url.contains(indicator)) {
                        return "[{\"page\":1,\"pages\":1},[{\"value\":" + jsonValue(indicator) + "}]]";
                    }
                }
                return "[{\"none\":true}]";
            });

            Map<String, Object> response = service.getJobTrends();

            List<Map<String, Object>> data = dataOf(response);
            assertEquals("Services", data.get(0).get("sector"));
            assertEquals(60.1, data.get(0).get("employmentRate"));
            assertEquals("Industry", data.get(2).get("sector"));
            assertEquals(17.5, data.get(2).get("employmentRate"));
            assertEquals("World Bank Indicators API (sourced from PSA Philippines)", response.get("source"));
        }

        private double jsonValue(String indicator) {
            switch (indicator) {
                case "SL.SRV.EMPL.ZS":
                    return 60.1;
                case "SL.AGR.EMPL.ZS":
                    return 22.4;
                default:
                    return 17.5;
            }
        }

        @Test
        @DisplayName("Falls back to cached PSA data when the World Bank call fails")
        void fallsBackWhenWorldBankUnreachable() {
            when(restTemplate.getForObject(anyString(), eq(String.class)))
                    .thenThrow(new RuntimeException("connection refused"));

            Map<String, Object> response = service.getJobTrends();

            assertEquals("PSA Labor Force Survey 2023 (cached)", response.get("source"));
            assertEquals(3, dataOf(response).size());
        }
    }

    @Nested
    @Story("Market overview aggregation")
    class MarketOverview {

        @Test
        @DisplayName("Aggregates posting momentum, setup, location and top employers")
        void aggregatesMarketOverview() {
            Internship dev = fullInternship(1L, "Software Engineer", "2026-08-01", InternshipStatus.ACTIVE, "Remote", "Manila", "ACME Corp");
            Internship dev2 = fullInternship(2L, "Backend Developer", "2026-09-01", InternshipStatus.ACTIVE, "Remote", "Makati", "ACME Corp");
            Internship design = fullInternship(3L, "UI/UX Designer", "2026-09-01", InternshipStatus.ACTIVE, "Hybrid", "Makati", "Studio Alva");

            when(internshipRepository.findAll()).thenReturn(List.of(dev, dev2, design));
            when(applicationRepository.findAll()).thenReturn(List.of(
                    applicationApplied(1L, dev, ApplicationStatus.PENDING, "2026-09-05T10:00:00")));

            Map<String, Object> response = service.getMarketOverview();

            assertEquals(3, response.get("activePostings"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> trend = (List<Map<String, Object>>) response.get("postingTrend");
            assertEquals(2, trend.size());
            assertEquals("2026-08", trend.get(0).get("month"));
            assertEquals(1, trend.get(0).get("postings"));
            assertEquals(0, trend.get(0).get("applications"));
            assertEquals("2026-09", trend.get(1).get("month"));
            assertEquals(2, trend.get(1).get("postings"));
            assertEquals(1, trend.get(1).get("applications"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> setupSplit = (List<Map<String, Object>>) response.get("setupSplit");
            assertEquals("Remote", setupSplit.get(0).get("setup"));
            assertEquals(2, setupSplit.get(0).get("postings"));
            assertEquals("Hybrid", setupSplit.get(1).get("setup"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> locationSplit = (List<Map<String, Object>>) response.get("locationSplit");
            assertEquals("Makati", locationSplit.get(0).get("location"));
            assertEquals(2, locationSplit.get(0).get("postings"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> employers = (List<Map<String, Object>>) response.get("topEmployers");
            assertEquals(2, employers.size());
            assertEquals("ACME Corp", employers.get(0).get("company"));
            assertEquals(2, employers.get(0).get("postings"));
            assertEquals(1, employers.get(0).get("applications"));
        }

        @Test
        @DisplayName("Handles internships without a creation date gracefully")
        void handlesMissingDates() {
            Internship dev = internship(1L, "Software Engineer");

            when(internshipRepository.findAll()).thenReturn(List.of(dev));
            when(applicationRepository.findAll()).thenReturn(List.of());

            Map<String, Object> response = service.getMarketOverview();

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> trend = (List<Map<String, Object>>) response.get("postingTrend");
            assertEquals(1, trend.size());
            assertEquals(1, trend.get(0).get("postings"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> setupSplit = (List<Map<String, Object>>) response.get("setupSplit");
            assertEquals("N/A", setupSplit.get(0).get("setup"));
        }

        @Test
        @DisplayName("Returns an empty overview when repositories are unavailable")
        void repositoryFailureReturnsEmptyOverview() {
            when(internshipRepository.findAll()).thenThrow(new RuntimeException("db down"));

            Map<String, Object> response = service.getMarketOverview();

            assertTrue(((List<?>) response.get("postingTrend")).isEmpty());
        }
    }
}