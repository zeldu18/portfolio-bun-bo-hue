# Larkspur Media: Q3 and Q5 optimization

**Q3:** `LAG(ts)` over each user's `(ts, view_id)` ordering replaces the correlated
predecessor lookup and its self-join/aggregation with one scan and one window
operator, avoiding millions of candidate row pairs.

**Q5:** `ARG_MIN(url_path, STRUCT_PACK(ts := ts, view_id := view_id))` groups
all history by user and selects the first path in one pass, replacing the
correlated count and self-joins with one scan and one grouped aggregate, without
sorting all pageviews.

## Correctness

Both rewrites return exactly the same single row as their supplied starters:
Q3 returns **118889** total sessions; Q5 returns **412** first-touch-pricing users.
Tests also compare all five answers with independent Python implementations.
The verification script covers timestamp ties, alphabetical path ties, exactly
30-minute gaps, gaps near minute boundaries, earlier February visits, missing
calendar dates, odd/even medians, users without pageviews, and empty input.

Q3 preserves `date_diff('minute', ...) > 30`, including its minute-boundary
semantics: substituting an elapsed-time comparison would not always match the
starter. Both rewrites preserve `view_id` as the timestamp tie-breaker. Q5 aggregates
all history before applying the path filter. These statements assume the supplied
schema: unique non-null view IDs, non-null user IDs, timestamps and URL paths.
The struct key compares timestamp first and view ID second; this is the same
lexicographic ordering used by the starter.

## Plan evidence

Saved DuckDB 1.4.5 `EXPLAIN` and JSON `EXPLAIN ANALYZE` outputs are in `evidence/`.
Each optimized query has one sequential pageviews scan and no join or delimiter
operator. Q3 uses a window and final aggregate; Q5 uses a grouped `arg_min`,
filter and final count, with no window sort.
Each starter has two pageviews scans, delimiter joins/scans, hash joins, and
grouping. DuckDB decorrelates the starters; they are not literally executed as
120,000 separate subqueries, but still build and reduce candidate pairs.

The measured Q3 starter inner hash join emits **4,919,154** rows; Q5's emits
**689,908** rows. Q3's optimized window emits **120,000** rows;
Q5's optimized grouped aggregate emits only **3,000** user rows. Each rewrite
scans the base table once instead of twice. This is the structural evidence of cheaper
plans; estimated row counts alone are not a scalar execution-cost guarantee.

## Local timing (diagnostic)

On this machine, DuckDB 1.4.5, one thread, in-memory tables, one warm-up followed
by three executions with full result retrieval:

- Q3: median **137.68 ms → 17.80 ms**, approximately **7.73×** faster.
- Q5: median **18.05 ms → 4.23 ms**, approximately **4.27×** faster.

Timings vary by machine and load; removed joins, fewer scans and reduced
intermediate rows are the structural evidence. Raw timings are in
`evidence/verification.json`; rerunning verification replaces that file with new
local measurements. No result rows are hardcoded in the SQL, and no indexes or
changes to the grader's tables are required.
