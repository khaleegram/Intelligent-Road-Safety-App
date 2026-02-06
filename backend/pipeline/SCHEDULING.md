# Scheduling (Windows Task Scheduler)

This pipeline can run automatically using Windows Task Scheduler.

## 1) Create the task
- Open **Task Scheduler**
- Click **Create Task...**
- Name: `RoadSafe Hotspot Pipeline`
- Check **Run whether user is logged on or not** (optional)
- Check **Run with highest privileges** (recommended)

## 2) Trigger
- **New...** ? Daily (or every 6 hours)

## 3) Action
- **New...** ? Start a program
- Program/script:
  `powershell.exe`
- Add arguments:
  `-ExecutionPolicy Bypass -File "C:\Users\User\Desktop\Projects\Intelligent Road Safety App\backend\pipeline\run-hotspots.ps1"`
- Start in:
  `C:\Users\User\Desktop\Projects\Intelligent Road Safety App\backend\pipeline`

## 4) Test run
Right-click task ? **Run**

## Notes
- The script uses `.env.local` (gitignored) for credentials.
- Adjust `--threshold` / `--grid` inside `run-hotspots.ps1` as needed.
