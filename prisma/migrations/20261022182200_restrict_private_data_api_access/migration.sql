DO $$
DECLARE
    table_name TEXT;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'AIInsight',
        'Activity',
        'AuthSession',
        'Category',
        'DailyLog',
        'Exam',
        'Goal',
        'PlannerEntry',
        'Profile',
        'RankSnapshot',
        'Subject',
        'SyllabusTopic',
        'SyllabusUnit',
        'Task',
        'Test',
        'User'
    ]
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
        EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM PUBLIC, anon, authenticated', table_name);
    END LOOP;
END $$;
