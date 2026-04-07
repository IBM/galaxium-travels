# AWS Plan: Keep ALB, Remove RDS, Use SQLite

This plan targets a low-cost demo setup that keeps the current AWS entrypoint (ALB), accepts ALB baseline cost, and removes RDS.

## Goal

- Keep a stable public URL via ALB
- Remove RDS recurring cost
- Run backend on SQLite for demo data
- Allow ECS services to scale down to zero when not needed

## Important Constraints

- ALB is still billed 24/7 while it exists
- Scale-to-zero means cold starts when scaling back up
- SQLite in a Fargate container is ephemeral by default (data can be lost on restart)
- True "wake on first request from 0" is not native with ALB + ECS target tracking alone

## Target Architecture

- Frontend: ECS Fargate service behind ALB (`/`)
- Backend: ECS Fargate service behind ALB (`/api/*`)
- Database: SQLite file inside backend container filesystem
- Autoscaling: min capacity 0, max capacity N, plus explicit scale-up/down controls

## Phase 1: Remove RDS

Terraform changes:

1. Remove `terraform/rds.tf` resources:
   - `aws_db_instance`
   - `aws_db_subnet_group`
   - `aws_secretsmanager_secret` + `aws_secretsmanager_secret_version` used only for DB URL
   - `random_password` used only for DB password
2. Remove backend `DATABASE_URL` secret injection from `terraform/ecs.tf`.
3. Keep backend `SEED_DEMO_DATA=true` so startup reseeds demo flights.
4. Remove unused variables from `terraform/variables.tf` and `terraform/terraform.tfvars.example`:
   - `db_name`
   - `db_username`
   - `db_instance_class`
5. Remove related outputs and references in other Terraform files if present.

Application behavior:

- Backend already defaults to SQLite when `DATABASE_URL` is unset (`booking_system_backend/db.py`).
- On each fresh task startup, `init_db()` creates tables and optional seed fills demo data.

## Phase 2: Make Scale-to-Zero Practical

Current notes:

- `terraform/autoscaling.tf` currently uses scheduled actions and target tracking.
- Scheduled actions are time-based windows, not "2 hours of inactivity."

Recommended practical setup:

1. Keep ECS autoscaling target `min_capacity = 0`.
2. Keep target tracking for normal up/down while tasks are running.
3. Use a simple control path for off-hours:
   - manual scripts (`scale-to-zero.sh`, `scale-up.sh`) for demo usage, or
   - EventBridge schedule for known idle windows.
4. Set expectations:
   - From 0 tasks, service needs explicit scale-up (manual/scripted/scheduled) before traffic succeeds.

If "2h inactivity then zero" is required:

- Add CloudWatch alarm + Lambda automation to call `ecs:update-service` after inactivity window.
- This is more complex and still does not give instant wake-on-request from zero.

## Phase 3: Safety and Verification

1. Run `terraform plan` and verify RDS and DB secrets destruction list.
2. Apply Terraform.
3. Build/push backend and frontend images.
4. Force new ECS deployments.
5. Verify:
   - `GET /api/` returns healthy response
   - `GET /api/flights` returns seeded flights
   - frontend loads flights through ALB
6. Test scale scripts:
   - run `./scale-to-zero.sh`
   - run `./scale-up.sh`
   - verify health after cold start

## Data Persistence Decision

Choose one explicitly:

- Ephemeral demo data (cheapest): keep SQLite in container filesystem.
- Persistent data (still no RDS): mount EFS volume for SQLite file path.

For this demo repo, ephemeral data is acceptable and simplest.

## Cost Direction (High Level)

- Remove RDS cost entirely
- Keep ALB baseline cost
- ECS compute cost goes near zero when scaled down
- NAT cost depends on whether NAT remains in the stack

## Execution Checklist

- [ ] Remove RDS and DB secret resources from Terraform
- [ ] Remove backend `DATABASE_URL` secret injection in ECS task definition
- [ ] Clean db-related variables/outputs/docs
- [ ] Apply Terraform
- [ ] Redeploy images/services
- [ ] Validate API + frontend behavior
- [ ] Validate scale down/up workflow
- [ ] Update AWS docs to reflect SQLite + no RDS architecture
