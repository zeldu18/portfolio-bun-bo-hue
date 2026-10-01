# Larkspur Media customer-orders pipeline

## What runs

`dbt seed` loads the three supplied CSVs into DuckDB. `stg_customers` and
`stg_payments` are views; `stg_orders` is an incremental table; `customer_orders`
is a table. The mart includes one row per customer with completed/shipped orders.
It counts orders after grouping payments by `order_id`, preventing multiple
payments from multiplying order counts. It sums exact decimal payment amounts;
qualifying orders with no payment contribute zero. It emits the six requested
columns in order and excludes customers without a qualifying order.

`models/schema.yml` defines uniqueness, non-null and relationship tests, and
orders-source freshness using `cast(order_date as timestamp)`. Two singular tests
check positive order counts, nonnegative amounts, ordered dates and reconciliation
to qualifying source orders. The final `dbt build` passed **29/29** resources:
3 seeds, 4 models and 22 data tests. `dbt source freshness` ran separately. It
reported `error` because the fixture's latest order date is June 2025; the
orchestrator accepts this known historical fixture only after inspecting the
result artifact and latest date. It does not suppress other freshness failures.

## Incremental demonstration and timing

The staged test first built with **2,500 orders dated through 2025-03-31**.
It then loaded the remaining supplied orders, making **5,000**, and ran dbt
incrementally. `stg_orders` selects `order_date > max(order_date)` in the target
on incremental runs and appends the new rows. This fixture is append-only and
the second tranche starts after March 31. A same-day late arrival or a changed
older order would require a lookback plus a unique-key merge instead of this
strict boundary; the exercise's supplied split contains neither.

The incremental `stg_orders` and `customer_orders` results matched a full
refresh exactly, row for row. An unchanged rerun also left both unchanged.
An independent Python calculation from the three raw files checked every
exported row: **400 customers, 3,376 qualifying orders, total amount 416383.08**.

Timing on the same M1 Mac, Dockerized dbt 1.9.11 / DuckDB 1.4.5 (seconds):

| Operation | Incremental | Full refresh |
|---|---:|---:|
| `dbt run --select stg_orders` | 1.625 | 1.445 |
| `dbt run` (all models) | 1.629 | 1.553 |

These numbers include container startup and dbt parsing. The isolated model
execution was 0.103 s incremental versus 0.084 s full refresh in this run.
The re-run was **not faster** on this 5,000-order fixture, despite processing
fewer source rows; launch overhead and the tiny table dominate. The assignment
calls for a demonstrable speedup, and this local result does not establish one.
Timing evidence and the exact row comparison are in
`evidence/incremental_comparison.json`. Wall time varies across runs and machines.

## Schedule and recovery

`orchestration.py` defines a daily 02:00 UTC Dagster schedule. The Docker Compose
`scheduler` service runs Dagster's webserver and daemon. A temporary one-minute
schedule was used only for verification; the recorded **16:29 UTC** tick was
successful. The scheduled run failed `flaky_task` exactly once, retried after
two seconds, succeeded on the first retry, then completed dbt build/tests,
freshness inspection and CSV export. `orchestrator_log.txt` is extracted from
Dagster's actual schedule, run tags and event database. The temporary demo
scheduler was stopped after the successful run; the submitted Compose config
defaults to the daily schedule.

## Reproduce from a local non-cloud folder

Extract the ZIP so `submission/dbt_project.yml` is at the shown path. Docker
Desktop must be running. In `submission/`, run `docker compose build`, then
`docker compose run --rm dbt python verify_pipeline.py`. The script recreates the
March/remaining-order test, all dbt checks, the equality comparison and final
CSV. Run `docker compose up -d scheduler` to enable the daily schedule, and use
`docker compose stop scheduler` when finished. The optional demo cadence is
`PIPELINE_CRON='* * * * *' docker compose up -d scheduler`; do not leave that
demo cadence running unattended.

Docker Desktop intermittently returned `EIO` reading bind-mounted files in
the original synced workspace. The verified scheduled run used an isolated
local copy under `/private/tmp`; code and evidence were copied back into this
submission. Extracting to a local non-cloud directory avoids that issue.
