
-- Update plant growth times with the new balanced progression
UPDATE plant_types SET base_growth_minutes = 0.25 WHERE name = 'carrot';
UPDATE plant_types SET base_growth_minutes = 0.5 WHERE name = 'lettuce';
UPDATE plant_types SET base_growth_minutes = 1 WHERE name = 'tomato';
UPDATE plant_types SET base_growth_minutes = 2 WHERE name = 'corn';
UPDATE plant_types SET base_growth_minutes = 4 WHERE name = 'potato';
UPDATE plant_types SET base_growth_minutes = 8 WHERE name = 'pumpkin';
UPDATE plant_types SET base_growth_minutes = 12 WHERE name = 'watermelon';
UPDATE plant_types SET base_growth_minutes = 16 WHERE name = 'apple';
UPDATE plant_types SET base_growth_minutes = 20 WHERE name = 'grape';
UPDATE plant_types SET base_growth_minutes = 25 WHERE name = 'golden_fruit';

-- Update the plot unlock cost function with more balanced progression
CREATE OR REPLACE FUNCTION public.get_plot_unlock_cost(plot_number integer)
RETURNS integer
LANGUAGE plpgsql
AS $function$
BEGIN
    CASE 
        WHEN plot_number <= 1 THEN RETURN 0;
        WHEN plot_number = 2 THEN RETURN 300;      -- ~10 carrot cycles (150 -> 255 profit per cycle)
        WHEN plot_number = 3 THEN RETURN 800;      -- ~10 lettuce cycles (255 -> 383 profit per cycle)
        WHEN plot_number = 4 THEN RETURN 2200;     -- ~10 tomato cycles (383 -> 650 profit per cycle)
        WHEN plot_number = 5 THEN RETURN 6000;     -- ~10 corn cycles (650 -> 1105 profit per cycle)
        WHEN plot_number = 6 THEN RETURN 18000;    -- ~10 potato cycles (1105 -> 1879 profit per cycle)
        WHEN plot_number = 7 THEN RETURN 50000;    -- ~10 pumpkin cycles (1879 -> 3194 profit per cycle)
        WHEN plot_number = 8 THEN RETURN 140000;   -- ~10 watermelon cycles (3194 -> 5430 profit per cycle)
        WHEN plot_number = 9 THEN RETURN 400000;   -- ~10 apple cycles (5430 -> 9232 profit per cycle)
        ELSE RETURN 1200000;                       -- ~10+ grape cycles (9232+ profit per cycle)
    END CASE;
END;
$function$
