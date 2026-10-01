-- One aggregate state per user; compare timestamp and view_id lexicographically.
WITH first_touch AS (
    SELECT user_id,
           ARG_MIN(url_path, STRUCT_PACK(ts := ts, view_id := view_id)) AS first_path
    FROM pageviews
    GROUP BY user_id
)
SELECT COUNT(*) AS users_first_touch_pricing
FROM first_touch
WHERE first_path = '/pricing';
