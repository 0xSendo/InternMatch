package com.internmatch.internmatch.features.internship;

import java.util.Locale;

/**
 * Keyword-based categorization of internship postings so the market-intelligence
 * charts can aggregate demand per field. Titles that match nothing fall back to
 * "Other".
 */
public final class InternshipCategory {

    public static final String TECH = "Tech & Development";
    public static final String DESIGN = "Design & Creative";
    public static final String MARKETING = "Marketing & Sales";
    public static final String DATA = "Data & Analytics";
    public static final String BUSINESS = "Business & Admin";
    public static final String OTHER = "Other";

    private InternshipCategory() {
    }

    public static String categorize(String title) {
        if (title == null) {
            return OTHER;
        }
        String t = title.toLowerCase(Locale.ROOT);

        if (matches(t, "dev", "software", "engineer", "code")) {
            return TECH;
        } else if (matches(t, "design", "ui", "ux", "creative")) {
            return DESIGN;
        } else if (matches(t, "market", "social", "sale", "ads")) {
            return MARKETING;
        } else if (matches(t, "data", "analyst", "science", "stat")) {
            return DATA;
        } else if (matches(t, "admin", "hr", "manage", "office")) {
            return BUSINESS;
        }
        return OTHER;
    }

    private static boolean matches(String title, String... keywords) {
        for (String keyword : keywords) {
            if (title.contains(keyword)) {
                return true;
            }
        }
        return false;
    }
}