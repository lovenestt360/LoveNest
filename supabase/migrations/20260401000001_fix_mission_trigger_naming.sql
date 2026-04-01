-- FIX: Polymorphic couple ID for mission trigger
CREATE OR REPLACE FUNCTION public.tr_on_interaction_for_missions()
RETURNS TRIGGER AS $$
DECLARE
    v_couple_id UUID;
BEGIN
    -- Detect which column name is being used by the table that fired the trigger
    IF TG_TABLE_NAME = 'daily_activity' THEN
        v_couple_id := NEW.couple_id;
    ELSE
        v_couple_id := NEW.couple_space_id;
    END IF;

    -- Ensure missions are generated for the day if not yet done
    PERFORM public.generateDailyMissions(v_couple_id);
    
    -- Check if this interaction completes any mission
    PERFORM public.checkMissionCompletion(v_couple_id, NEW.user_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
