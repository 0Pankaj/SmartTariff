# SmartTariff Legacy Decommission Plan (DO NOT EXECUTE YET)

> [!WARNING]
> **STRICT RETENTION POLICY**: DO NOT EXECUTE THIS PLAN DURING PHASE 9 CUTOVER.
> The legacy FastAPI backend (`smartTariff-backend-main/`) and SQLite database (`smarttariff.db`) MUST REMAIN UNTOUCHED on disk as an operational rollback archive until all decommissioning gates are fully satisfied.

---

## 1. Scope of Legacy Assets

The following assets constitute the legacy architecture:
1. **Directory**: `smartTariff-backend-main/`
   - FastAPI routers, models, schemas, services, and configuration files.
2. **SQLite Database**: `smartTariff-backend-main/smarttariff.db`
   - SHA256: `1D3A9970F68790A913851736F4635EF0C7FE16C49CC01825BDAA267373F5737D`
3. **Legacy Migration Scripts**:
   - `backend-node/scripts/sqlite_dump.json`
   - `backend-node/scripts/export_sqlite.py`
   - `backend-node/scripts/import_to_postgres.js`
4. **Note on ML Artifact**:
   - `smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl` is **NOT** decommissioned. It is actively utilized by the new Python ML microservice on port 8000.

---

## 2. Mandatory Decommission Gates

The legacy FastAPI + SQLite stack may **ONLY** be decommissioned after meeting ALL of the following criteria:

- [ ] **SLA Stability Period**: Primary Node.js + PostgreSQL stack runs in production for a minimum of **30 consecutive days** with $\ge$ 99.9% uptime.
- [ ] **Zero Data Regression**: Zero data loss, corruption, or schema mismatch reported by production monitoring.
- [ ] **Dual Backup Archived**:
  - Full PostgreSQL logical snapshot verified and archived to cold cloud storage (AWS S3 / GCS).
  - Final copy of `smarttariff.db` compressed and stored in offline archival vault.
- [ ] **Stakeholder Sign-Off**: Formal written sign-off from Lead Engineer and Product Owner approving full retirement of legacy code.

---

## 3. Future Decommissioning Procedure (Phase 10+)

When all gates above are completely fulfilled, the decommission sequence will be:

### Step 1: Create Permanent Cold Archive
```powershell
# Create permanent zip archive of legacy backend
Compress-Archive -Path smartTariff-backend-main -DestinationPath archives\legacy_fastapi_sqlite_archive_$(Get-Date -Format 'yyyyMMdd').zip
```

### Step 2: Relocate ML Model Artifact
Before removing legacy code, copy the RandomForest `.pkl` artifact to a dedicated models directory within `ml-service/`:
```powershell
Copy-Item smartTariff-backend-main\smarttariff_v4_3_random_forest.pkl ml-service\models\
Copy-Item smartTariff-backend-main\smarttariff_v4_3_config.json ml-service\models\
```
Update `ml-service/.env` `MODEL_PATH` and `CONFIG_PATH` to reference `models/`.

### Step 3: Archive Legacy Backend Directory
Remove `smartTariff-backend-main/` from active codebase or move to `deprecated/` repository branch.

### Step 4: Final Documentation Update
Update repository README and documentation to reflect single-stack topology.
