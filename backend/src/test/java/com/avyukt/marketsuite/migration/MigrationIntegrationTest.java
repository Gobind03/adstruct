package com.avyukt.marketsuite.migration;

import com.avyukt.marketsuite.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.ResultSet;
import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertTrue;

class MigrationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private DataSource dataSource;

    @Test
    void allTablesCreated() throws Exception {
        Set<String> expectedTables = Set.of(
                "organizations", "workspaces", "users", "memberships", "audit_logs",
                "integration_accounts", "integration_health",
                "conversation_campaigns", "target_sets", "sponsored_units",
                "approval_workflows", "ad_events"
        );

        Set<String> actualTables = new HashSet<>();
        try (Connection conn = dataSource.getConnection()) {
            DatabaseMetaData meta = conn.getMetaData();
            ResultSet rs = meta.getTables(null, "public", "%", new String[]{"TABLE"});
            while (rs.next()) {
                actualTables.add(rs.getString("TABLE_NAME"));
            }
        }

        for (String table : expectedTables) {
            assertTrue(actualTables.contains(table), "Missing table: " + table);
        }
    }
}
