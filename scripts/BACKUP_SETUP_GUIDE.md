# Automated Database Backup Setup Guide

## Overview
This guide explains how to set up automated daily database backups for ZoneRush.

---

## 📁 Backup Scripts Location
- **Backup Script:** `scripts/backup-database.bat`
- **Restore Script:** `scripts/restore-database.bat`
- **Backup Directory:** `database/backups/` (auto-created)

---

## ⚙️ Setup Automated Backups (Windows Task Scheduler)

### Option 1: Using Task Scheduler GUI

1. **Open Task Scheduler**
   - Press `Win + R`
   - Type `taskschd.msc`
   - Press Enter

2. **Create Basic Task**
   - Click "Create Basic Task" in right panel
   - Name: `ZoneRush Database Backup`
   - Description: `Daily automated backup of zonerush database`
   - Click Next

3. **Set Trigger**
   - Choose: `Daily`
   - Start: Today's date
   - Time: `02:00 AM` (or preferred time)
   - Click Next

4. **Set Action**
   - Choose: `Start a program`
   - Program/script: Browse to `scripts\backup-database.bat`
   - Start in: Browse to project root directory
   - Click Next

5. **Finish**
   - Review settings
   - Check "Open the Properties dialog"
   - Click Finish

6. **Configure Additional Settings**
   - In Properties dialog:
     - ✅ Run whether user is logged on or not
     - ✅ Run with highest privileges
     - Configure for: Windows 10/11
   - Click OK
   - Enter your password when prompted

### Option 2: Using Command Line

Run this command in PowerShell (as Administrator):

```powershell
$action = New-ScheduledTaskAction -Execute "C:\Users\hp\Desktop\Realtime-Location-Tracker-main - local - Copy\scripts\backup-database.bat"
$trigger = New-ScheduledTaskTrigger -Daily -At 2am
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Password -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

Register-ScheduledTask -TaskName "ZoneRush Database Backup" -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description "Daily automated backup of zonerush database"
```

---

## 🔍 Verify Backup is Working

### Manual Test
```bash
cd "c:\Users\hp\Desktop\Realtime-Location-Tracker-main - local - Copy"
.\scripts\backup-database.bat
```

Expected output:
```
========================================
Starting Database Backup
========================================
Timestamp: 20260405_102030
Backup File: database\backups\zonerush_backup_20260405_102030.sql

Dumping database...
...
========================================
Backup completed successfully!
========================================
Location: database\backups\zonerush_backup_20260405_102030.sql
Size: 1234567 bytes
```

### Check Backup Directory
```bash
dir database\backups\*.sql
```

Should show backup files with timestamps.

---

## 🔄 Restore from Backup

### Method 1: Using Restore Script
```bash
.\scripts\restore-database.bat database\backups\zonerush_backup_20260405.sql
```

⚠️ **Warning:** This will overwrite the current database!

### Method 2: Manual Restore
```bash
dropdb -U postgres zonerush
createdb -U postgres zonerush
pg_restore -U postgres -d zonerush database\backups\zonerush_backup_20260405.sql
```

---

## 📊 Backup Retention Policy

The backup script automatically:
- ✅ Keeps last 7 days of backups
- ✅ Deletes older backups automatically
- ✅ Logs errors to `database\backups\backup_errors.log`

To change retention period, edit `backup-database.bat`:
```batch
forfiles /p "%BACKUP_DIR%" /s /m *.sql /d -7 /c "cmd /c del @path"
```
Change `-7` to desired number of days.

---

## 🌐 Cloud Backup (Optional)

For production, consider uploading backups to cloud storage:

### AWS S3 Example
Add to end of `backup-database.bat`:
```batch
aws s3 cp "%BACKUP_FILE%" s3://your-bucket-name/backups/
```

### Google Drive Example
Use rclone:
```batch
rclone copy "%BACKUP_FILE%" gdrive:ZoneRushBackups/
```

---

## 📧 Email Notifications (Optional)

Add email notification on failure by adding to `backup-database.bat`:

```batch
if %ERRORLEVEL% NEQ 0 (
    powershell -Command "Send-MailMessage -From 'backup@zonerush.com' -To 'admin@zonerush.com' -Subject 'Backup Failed' -Body 'Database backup failed. Check logs.' -SmtpServer 'smtp.example.com'"
)
```

---

## 🔐 Security Best Practices

1. **Protect Backup Files**
   - Store backups in secure location
   - Encrypt sensitive backups
   - Restrict access to backup directory

2. **Test Restores Regularly**
   - Monthly test restore to verify backups work
   - Document restore procedure

3. **Monitor Backup Success**
   - Check Task Scheduler history
   - Monitor backup file sizes
   - Set up alerts for failures

---

## 🐛 Troubleshooting

### Issue: "pg_dump: command not found"
**Solution:** Add PostgreSQL bin to PATH
```batch
set PATH=%PATH%;C:\Program Files\PostgreSQL\15\bin
```

### Issue: "permission denied"
**Solution:** Run as administrator or check file permissions

### Issue: Backup file is 0 bytes
**Solution:** Check `database\backups\backup_errors.log` for details

### Issue: Task Scheduler doesn't run
**Solution:** 
- Check task is enabled
- Verify user has permissions
- Check "History" tab in Task Scheduler

---

## 📝 Backup Schedule Recommendations

| Environment | Frequency | Retention | Time |
|------------|-----------|-----------|------|
| Development | Daily | 7 days | 2:00 AM |
| Staging | Daily | 14 days | 2:00 AM |
| Production | Every 6 hours | 30 days | 2AM, 8AM, 2PM, 8PM |

---

## ✅ Checklist

- [ ] Backup script created
- [ ] Restore script created
- [ ] Task Scheduler configured
- [ ] Manual test successful
- [ ] Backup directory exists
- [ ] Error logging working
- [ ] Old backup cleanup working
- [ ] Documentation complete
- [ ] Team notified of backup schedule

---

*Last Updated: April 5, 2026*
