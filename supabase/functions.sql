-- ============================================================
-- DATABASE FUNCTIONS
-- Run after schema.sql + rls_policies.sql.
-- ============================================================

-- Clones the 15-step milestone template onto a newly created project.
-- Call this once, right after inserting a new row into `projects`.
CREATE OR REPLACE FUNCTION clone_milestone_template(p_project_id INT)
RETURNS VOID AS $$
BEGIN
  INSERT INTO project_milestones (project_id, template_id, name, sort_order)
  SELECT p_project_id, id, name, sort_order
  FROM milestone_templates
  ORDER BY sort_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recalculates a project's overall completion percentage
-- (simple average across all 15 milestones).
CREATE OR REPLACE FUNCTION project_completion_percent(p_project_id INT)
RETURNS INT AS $$
  SELECT COALESCE(ROUND(AVG(completion_percent)), 0)::INT
  FROM project_milestones
  WHERE project_id = p_project_id;
$$ LANGUAGE sql STABLE;

-- Recalculates a project's adjusted contract value
-- (base contract_value + every SIGNED change order's amount).
CREATE OR REPLACE FUNCTION project_adjusted_contract_value(p_project_id INT)
RETURNS NUMERIC AS $$
  SELECT COALESCE(p.contract_value, 0) + COALESCE(SUM(co.amount), 0)
  FROM projects p
  LEFT JOIN change_orders co
    ON co.project_id = p.id AND co.status = 'signed'
  WHERE p.id = p_project_id
  GROUP BY p.contract_value;
$$ LANGUAGE sql STABLE;
