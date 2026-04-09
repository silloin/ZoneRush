-- ============================================
-- PERFORMANCE OPTIMIZATION & BUG FIXES
-- ============================================
-- This migration adds critical indexes and fixes
-- ============================================

-- 1. Add missing indexes for AI coach queries (without immutable function issues)
CREATE INDEX IF NOT EXISTS idx_runs_user_completed_pace 
ON runs(user_id, completed_at DESC, pace);

CREATE INDEX IF NOT EXISTS idx_runs_user_analytics 
ON runs(user_id, completed_at, distance, duration, pace);

-- 2. Add index for active training plans
CREATE INDEX IF NOT EXISTS idx_training_plans_user_active 
ON training_plans(user_id, is_active) 
WHERE is_active = true;

-- 3. Add index for recommendations
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user_active 
ON ai_recommendations(user_id, is_dismissed, valid_until) 
WHERE is_dismissed = false;

-- 4. Add index for route points (frequently queried)
CREATE INDEX IF NOT EXISTS idx_route_points_run_sequence 
ON route_points(run_id, sequence_order);

-- 5. Add index for captured tiles by user
CREATE INDEX IF NOT EXISTS idx_captured_tiles_user_recent 
ON captured_tiles(user_id, last_captured_at DESC);

-- 6. Add index for segment efforts
CREATE INDEX IF NOT EXISTS idx_segment_efforts_segment_time 
ON segment_efforts(segment_id, elapsed_time)
WHERE elapsed_time > 0;

-- 7. Add composite index for user stats updates
CREATE INDEX IF NOT EXISTS idx_user_stats_last_update 
ON user_stats(updated_at DESC);

-- 8. Fix race condition: Add advisory lock function for plan activation
CREATE OR REPLACE FUNCTION activate_training_plan(
  p_user_id INTEGER,
  p_plan_id INTEGER
) RETURNS VOID AS $$
BEGIN
  -- Use advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(p_user_id);
  
  -- Deactivate all other plans for this user
  UPDATE training_plans 
  SET is_active = false 
  WHERE user_id = p_user_id AND id != p_plan_id;
  
  -- Activate the new plan
  UPDATE training_plans 
  SET is_active = true 
  WHERE id = p_plan_id AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Add trigger to automatically deactivate old plans when new one is created
CREATE OR REPLACE FUNCTION deactivate_old_plans()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    -- Deactivate all other plans for this user
    UPDATE training_plans 
    SET is_active = false 
    WHERE user_id = NEW.user_id 
    AND id != NEW.id 
    AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_deactivate_old_plans ON training_plans;
CREATE TRIGGER trigger_deactivate_old_plans
AFTER INSERT OR UPDATE ON training_plans
FOR EACH ROW
EXECUTE FUNCTION deactivate_old_plans();

-- 10. Add function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_all_leaderboards()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tile_leaderboard;
  REFRESH MATERIALIZED VIEW CONCURRENTLY segment_leaderboard;
  RAISE NOTICE 'Leaderboards refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- 11. Create view for training plan progress (with proper type casting)
CREATE OR REPLACE VIEW training_plan_progress AS
SELECT 
  tp.id as plan_id,
  tp.user_id,
  u.username,
  tp.plan_type,
  tp.start_date,
  tp.end_date,
  tp.is_active,
  tp.metadata,
  CASE 
    WHEN tp.metadata->>'completedWorkouts' IS NOT NULL 
    THEN (tp.metadata->>'completedWorkouts')::INTEGER
    ELSE 0
  END as completed_workouts,
  CASE 
    WHEN tp.metadata->>'totalWorkouts' IS NOT NULL 
    THEN (tp.metadata->>'totalWorkouts')::INTEGER
    ELSE 0
  END as total_workouts,
  CASE 
    WHEN tp.metadata->>'totalWorkouts' IS NOT NULL 
      AND (tp.metadata->>'totalWorkouts')::INTEGER > 0
    THEN ROUND(
      ((tp.metadata->>'completedWorkouts')::NUMERIC / (tp.metadata->>'totalWorkouts')::NUMERIC) * 100, 
      2
    )
    ELSE 0
  END as completion_percentage,
  tp.metadata->>'lastCompletedAt' as last_completed_at
FROM training_plans tp
JOIN users u ON tp.user_id = u.id
WHERE tp.is_active = true;

-- 12. Add comments for documentation
COMMENT ON INDEX idx_runs_user_completed_pace IS 'Optimizes AI coach pace analysis queries';
COMMENT ON INDEX idx_training_plans_user_active IS 'Quickly find active training plans';
COMMENT ON FUNCTION activate_training_plan(INTEGER, INTEGER) IS 'Atomically activates a training plan while deactivating others';
COMMENT ON VIEW training_plan_progress IS 'Shows current progress on active training plans';

-- 13. Grant execute permissions
GRANT EXECUTE ON FUNCTION activate_training_plan(INTEGER, INTEGER) TO PUBLIC;
GRANT EXECUTE ON FUNCTION refresh_all_leaderboards() TO PUBLIC;

-- Migration complete
DO $$
BEGIN
  RAISE NOTICE 'Migration applied successfully: Performance optimizations and bug fixes at %', NOW();
END $$;
