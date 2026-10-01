-- Retain the starter's (ts, view_id) ordering and date_diff minute semantics.
WITH ordered AS (
    SELECT user_id, ts,
           LAG(ts) OVER (PARTITION BY user_id ORDER BY ts, view_id) AS prev_ts
    FROM pageviews
)
SELECT SUM(
    CASE WHEN prev_ts IS NULL
              OR date_diff('minute', CAST(prev_ts AS TIMESTAMP), CAST(ts AS TIMESTAMP)) > 30
         THEN 1 ELSE 0 END
) AS total_sessions
FROM ordered;
