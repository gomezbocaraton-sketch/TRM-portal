-- ============================================================
-- ROW LEVEL SECURITY POLICIES (Phase 1: admin-only)
-- Run this after schema.sql. Every table here follows the same
-- rule: only a logged-in admin can read or write. When client
-- logins are added later, this is where per-project client
-- access gets layered in — nothing here needs to be torn out.
-- ============================================================

-- Helper: is the current logged-in user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestone_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE matterport_tours ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE rfis ENABLE ROW LEVEL SECURITY;

-- Users can see their own profile; any admin can see all admin profiles.
CREATE POLICY users_all ON users FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());

-- Every other table: simple, uniform admin-only access.
CREATE POLICY projects_all ON projects FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY project_milestones_all ON project_milestones FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY milestone_todos_all ON milestone_todos FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY photos_all ON photos FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY payments_all ON payments FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY payment_schedule_all ON payment_schedule FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY project_costs_all ON project_costs FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY change_orders_all ON change_orders FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY documents_all ON documents FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY matterport_tours_all ON matterport_tours FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY daily_logs_all ON daily_logs FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY selections_all ON selections FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY selection_options_all ON selection_options FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY rfis_all ON rfis FOR ALL
  USING (is_admin()) WITH CHECK (is_admin());
