package com.internmatch.internmatch.features.common.stats;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.internmatch.internmatch.features.internship.Application;
import com.internmatch.internmatch.features.internship.ApplicationRepository;
import com.internmatch.internmatch.features.internship.ApplicationStatus;
import com.internmatch.internmatch.features.internship.Internship;
import com.internmatch.internmatch.features.internship.InternshipCategory;
import com.internmatch.internmatch.features.internship.InternshipRepository;
import com.internmatch.internmatch.features.internship.InternshipStatus;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatsService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final InternshipRepository internshipRepository;
    private final ApplicationRepository applicationRepository;

    // World Bank API — free, no key needed, real PHL data sourced from PSA
    // SL.AGR.EMPL.ZS = % employed in Agriculture
    // SL.IND.EMPL.ZS = % employed in Industry
    // SL.SRV.EMPL.ZS = % employed in Services (Requested indicator)
    private static final String WB_URL =
        "https://api.worldbank.org/v2/country/PHL/indicator/{indicator}?format=json&mrv=1";

    private static final Map<String, String> INDICATORS = Map.of(
        "Agriculture",  "SL.AGR.EMPL.ZS",
        "Industry",     "SL.IND.EMPL.ZS",
        "Services",     "SL.SRV.EMPL.ZS"
    );

    private static final DateTimeFormatter MONTH_FMT = DateTimeFormatter.ofPattern("yyyy-MM");

    public StatsService(RestTemplate restTemplate,
                        ObjectMapper objectMapper,
                        InternshipRepository internshipRepository,
                        ApplicationRepository applicationRepository) {
        this.restTemplate = restTemplate;
        this.objectMapper = objectMapper;
        this.internshipRepository = internshipRepository;
        this.applicationRepository = applicationRepository;
    }

    public Map<String, Object> getEmployerInterest() {
        try {
            List<Internship> internships = internshipRepository.findAll();
            List<Application> applications = applicationRepository.findAll();

            // Map internship ID to its category for faster application counting
            Map<Long, String> idToCategory = new HashMap<>();
            Map<String, Integer> postingMap = new LinkedHashMap<>();
            Map<String, Integer> applicationMap = new HashMap<>();

            for (Internship i : internships) {
                String category = InternshipCategory.categorize(i.getTitle());
                postingMap.put(category, postingMap.getOrDefault(category, 0) + 1);
                idToCategory.put(i.getId(), category);
            }

            // Count applications per category and per status
            Map<String, int[]> statusCounts = new HashMap<>();
            int acceptedTotal = 0;
            int decidedTotal = 0;
            for (Application a : applications) {
                String category = idToCategory.getOrDefault(a.getInternship().getId(), InternshipCategory.OTHER);
                applicationMap.put(category, applicationMap.getOrDefault(category, 0) + 1);

                int[] counts = statusCounts.computeIfAbsent(category, k -> new int[4]); // accepted, rejected, shortlisted, pending
                ApplicationStatus status = a.getStatus();
                if (status == ApplicationStatus.ACCEPTED) counts[0]++;
                else if (status == ApplicationStatus.REJECTED) counts[1]++;
                else if (status == ApplicationStatus.SHORTLISTED) counts[2]++;
                else if (status == ApplicationStatus.PENDING) counts[3]++;
            }

            List<Map<String, Object>> interestData = new ArrayList<>();
            for (String category : postingMap.keySet()) {
                int postings = postingMap.get(category);
                int applicationsCount = applicationMap.getOrDefault(category, 0);
                int[] counts = statusCounts.getOrDefault(category, new int[4]);
                int decided = counts[0] + counts[1] + counts[2];

                Map<String, Object> item = new LinkedHashMap<>();
                item.put("category", category);
                item.put("postings", postings);
                item.put("applications", applicationsCount);
                item.put("applicationsPerPosting", round1(postings > 0 ? (double) applicationsCount / postings : 0.0));
                item.put("accepted", counts[0]);
                item.put("rejected", counts[1]);
                item.put("shortlisted", counts[2]);
                item.put("pending", counts[3]);
                item.put("acceptanceRate", round1(decided > 0 ? (double) counts[0] * 100.0 / decided : 0.0));
                interestData.add(item);

                acceptedTotal += counts[0];
                decidedTotal += decided;
            }

            // Sort by postings descending
            interestData.sort((a, b) -> (Integer) b.get("postings") - (Integer) a.get("postings"));

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("data", interestData);
            response.put("totalPostings", internships.size());
            response.put("activePostings", countActive(internships));
            response.put("totalApplications", applications.size());
            response.put("market", marketSummary(internships.size(), applications.size(), acceptedTotal, decidedTotal));
            response.put("lastUpdated", LocalDateTime.now().toString());
            return response;
        } catch (Exception e) {
            return Map.of("data", Collections.emptyList());
        }
    }

    public Map<String, Object> getMarketOverview() {
        try {
            List<Internship> internships = internshipRepository.findAll();
            List<Application> applications = applicationRepository.findAll();

            Map<String, Integer> postingTrend = new LinkedHashMap<>();
            for (Internship i : internships) {
                LocalDate created = i.getCreatedAt() != null ? i.getCreatedAt() : LocalDate.now();
                String month = created.format(MONTH_FMT);
                postingTrend.put(month, postingTrend.getOrDefault(month, 0) + 1);
            }

            Map<String, Integer> applicationTrend = new LinkedHashMap<>();
            for (Application a : applications) {
                LocalDateTime applied = a.getAppliedAt() != null ? a.getAppliedAt() : LocalDateTime.now();
                String month = applied.format(MONTH_FMT);
                applicationTrend.put(month, applicationTrend.getOrDefault(month, 0) + 1);
            }

            Set<String> months = new TreeSet<>();
            months.addAll(postingTrend.keySet());
            months.addAll(applicationTrend.keySet());

            List<Map<String, Object>> trend = new ArrayList<>();
            for (String month : months) {
                Map<String, Object> point = new LinkedHashMap<>();
                point.put("month", month);
                point.put("postings", postingTrend.getOrDefault(month, 0));
                point.put("applications", applicationTrend.getOrDefault(month, 0));
                trend.add(point);
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("postingTrend", trend);
            response.put("setupSplit", countByField(internships, i -> i.getSetup(), "setup"));
            response.put("locationSplit", countByField(internships, i -> i.getLocation(), "location"));
            response.put("topEmployers", topEmployers(internships, applications));
            response.put("totalPostings", internships.size());
            response.put("activePostings", countActive(internships));
            response.put("lastUpdated", LocalDateTime.now().toString());
            return response;
        } catch (Exception e) {
            return Map.of("postingTrend", Collections.emptyList(), "setupSplit",
                Collections.emptyList(), "locationSplit", Collections.emptyList(), "topEmployers", Collections.emptyList());
        }
    }

    @Cacheable(value = "jobTrends", unless = "#result == null")
    public Map<String, Object> getJobTrends() {
        try {
            List<Map<String, Object>> sectors = new ArrayList<>();

            for (Map.Entry<String, String> entry : INDICATORS.entrySet()) {
                String url = WB_URL.replace("{indicator}", entry.getValue());
                String rawJson = restTemplate.getForObject(url, String.class);
                JsonNode root = objectMapper.readTree(rawJson);

                // World Bank returns array: [metadata, data[]]
                if (root.isArray() && root.size() > 1) {
                    JsonNode dataArray = root.get(1);
                    if (dataArray != null && dataArray.isArray() && dataArray.size() > 0) {
                        JsonNode latest = dataArray.get(0);
                        double value = latest.path("value").asDouble(0);

                        Map<String, Object> sector = new LinkedHashMap<>();
                        sector.put("sector", entry.getKey());
                        sector.put("employmentRate", Math.round(value * 10.0) / 10.0);
                        sectors.add(sector);
                    }
                }
            }

            // Sort by employment rate descending
            sectors.sort((a, b) -> Double.compare((Double) b.get("employmentRate"), (Double) a.get("employmentRate")));

            if (sectors.isEmpty()) {
                return getFallbackData();
            }

            Map<String, Object> response = new LinkedHashMap<>();
            response.put("data", sectors);
            response.put("lastUpdated", LocalDateTime.now().toString());
            response.put("source", "World Bank Indicators API (sourced from PSA Philippines)");
            return response;

        } catch (Exception e) {
            return getFallbackData();
        }
    }

    // Shows if World Bank API is temporarily unreachable
    private Map<String, Object> getFallbackData() {
        List<Map<String, Object>> sectors = List.of(
            Map.of("sector", "Services",     "employmentRate", 60.1),
            Map.of("sector", "Agriculture",  "employmentRate", 22.4),
            Map.of("sector", "Industry",     "employmentRate", 17.5)
        );
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("data", sectors);
        response.put("lastUpdated", LocalDateTime.now().toString());
        response.put("source", "PSA Labor Force Survey 2023 (cached)");
        return response;
    }

    private int countActive(List<Internship> internships) {
        int count = 0;
        for (Internship i : internships) {
            if (i.getStatus() == InternshipStatus.ACTIVE) count++;
        }
        return count;
    }

    private Map<String, Object> marketSummary(int totalPostings, int totalApplications,
                                              int acceptedTotal, int decidedTotal) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalPostings", totalPostings);
        summary.put("totalApplications", totalApplications);
        summary.put("avgApplicationsPerPosting", round1(totalPostings > 0 ? (double) totalApplications / totalPostings : 0.0));
        summary.put("overallAcceptanceRate", round1(decidedTotal > 0 ? (double) acceptedTotal * 100.0 / decidedTotal : 0.0));
        return summary;
    }

    private List<Map<String, Object>> countByField(List<Internship> internships,
                                                   java.util.function.Function<Internship, String> field,
                                                   String key) {
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Internship i : internships) {
            String value = field.apply(i);
            String label = value == null || value.isBlank() ? "N/A" : value.trim();
            counts.put(label, counts.getOrDefault(label, 0) + 1);
        }
        List<Map<String, Object>> result = counts.entrySet().stream()
            .map(e -> {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put(key, e.getKey());
                item.put("postings", e.getValue());
                return item;
            })
            .sorted((a, b) -> (Integer) b.get("postings") - (Integer) a.get("postings"))
            .collect(Collectors.toList());
        return result;
    }

    private List<Map<String, Object>> topEmployers(List<Internship> internships,
                                                   List<Application> applications) {
        Map<String, Integer> postingsByCompany = new LinkedHashMap<>();
        for (Internship i : internships) {
            String company = i.getCompany() == null || i.getCompany().isBlank() ? "N/A" : i.getCompany().trim();
            postingsByCompany.put(company, postingsByCompany.getOrDefault(company, 0) + 1);
        }

        Map<Long, Internship> byId = internships.stream()
            .collect(Collectors.toMap(Internship::getId, i -> i, (a, b) -> a));

        Map<String, Integer> applicationsByCompany = new HashMap<>();
        for (Application a : applications) {
            Internship i = byId.get(a.getInternship().getId());
            if (i == null) continue;
            String company = i.getCompany() == null || i.getCompany().isBlank() ? "N/A" : i.getCompany().trim();
            applicationsByCompany.put(company, applicationsByCompany.getOrDefault(company, 0) + 1);
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (Map.Entry<String, Integer> e : postingsByCompany.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("company", e.getKey());
            item.put("postings", e.getValue());
            item.put("applications", applicationsByCompany.getOrDefault(e.getKey(), 0));
            result.add(item);
        }
        result.sort((a, b) -> {
            int byPostings = (Integer) b.get("postings") - (Integer) a.get("postings");
            if (byPostings != 0) return byPostings;
            return (Integer) b.get("applications") - (Integer) a.get("applications");
        });
        return result.size() > 5 ? result.subList(0, 5) : result;
    }

    private double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }
}