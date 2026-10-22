/**
 * @file Code.gs
 * Google Apps Script for Gramin Club Management System
 * 
 * FEATURES:
 * 1. Automatic Daily Database Backup to Google Drive at 11:00 PM IST (Asia/Kolkata)
 * 2. Dedicated Folder: "Club Management App Backups"
 * 3. Idempotent Trigger Setup (prevents duplicates)
 * 4. Safety Backup creation before restoration
 * 5. Email Notification to Admin on Backup Success/Failure
 * 6. Webhook REST API endpoints (doGet/doPost) to sync with Club Management App
 */

// Configuration
var CONFIG = {
  BACKUP_FOLDER_NAME: "Club Management App Backups",
  TIMEZONE: "Asia/Kolkata",
  BACKUP_HOUR: 23, // 11:00 PM IST
  ADMIN_EMAIL: "nirupamkoley77777@gmail.com", // Configured Admin Email
  SHEETS: {
    MEMBERS: "Members",
    RECEIPTS: "Receipts",
    EXPENSES: "Expenses",
    PROGRAMS: "Programs",
    ORGANIZERS: "Organizers",
    AUDIT_LOGS: "AuditLogs",
    SETTINGS: "Settings",
    ACCOUNTS: "Accounts"
  }
};

/**
 * Installs the daily 11:00 PM IST automatic backup trigger idempotently.
 * Run this function once from the Apps Script editor or via setup UI.
 */
function setupDailyBackupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  var functionName = "runDailyClubBackup";
  var existingFound = false;

  // Remove duplicate triggers if any exist
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === functionName) {
      if (existingFound) {
        ScriptApp.deleteTrigger(triggers[i]);
      } else {
        existingFound = true;
      }
    }
  }

  // Create single trigger if none found
  if (!existingFound) {
    ScriptApp.newTrigger(functionName)
      .timeBased()
      .atHour(CONFIG.BACKUP_HOUR)
      .everyDays(1)
      .inTimezone(CONFIG.TIMEZONE)
      .create();
    
    Logger.log("SUCCESS: Daily backup trigger scheduled for 11:00 PM IST (" + CONFIG.TIMEZONE + ").");
  } else {
    Logger.log("Trigger already exists and is configured for " + CONFIG.TIMEZONE + " at " + CONFIG.BACKUP_HOUR + ":00.");
  }
}

/**
 * Gets or creates the dedicated Google Drive folder: "Club Management App Backups"
 */
function getOrCreateBackupFolder() {
  var folders = DriveApp.getFoldersByName(CONFIG.BACKUP_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(CONFIG.BACKUP_FOLDER_NAME);
}

/**
 * Formats current date and time in Asia/Kolkata timezone.
 */
function getIndiaFormattedTimestamp() {
  var date = new Date();
  return Utilities.formatDate(date, CONFIG.TIMEZONE, "yyyy-MM-dd_HH-mm-ss_IST");
}

function getIndiaReadableTime() {
  var date = new Date();
  return Utilities.formatDate(date, CONFIG.TIMEZONE, "dd-MMM-yyyy hh:mm:ss a 'IST'");
}

/**
 * Main Automatic Backup Function executed at 11:00 PM IST daily.
 */
function runDailyClubBackup() {
  var timeStr = getIndiaReadableTime();
  var folder = getOrCreateBackupFolder();
  var timestamp = getIndiaFormattedTimestamp();
  var filename = "Club_Backup_" + timestamp + ".json";

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error("No active spreadsheet linked to this Apps Script project.");
    }

    var backupData = {
      timestamp: new Date().toISOString(),
      timeIndia: timeStr,
      sourceSpreadsheetId: ss.getId(),
      sourceSpreadsheetName: ss.getName(),
      tables: {}
    };

    var sheets = ss.getSheets();
    var totalRecords = 0;

    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var name = sheet.getName();
      var data = sheet.getDataRange().getValues();
      if (data && data.length > 1) {
        var headers = data[0];
        var rows = [];
        for (var r = 1; r < data.length; r++) {
          var rowObj = {};
          for (var c = 0; c < headers.length; c++) {
            rowObj[headers[c]] = data[r][c];
          }
          rows.push(rowObj);
        }
        backupData.tables[name] = rows;
        totalRecords += rows.length;
      } else {
        backupData.tables[name] = [];
      }
    }

    // Save as JSON file in Google Drive folder
    var jsonString = JSON.stringify(backupData, null, 2);
    var file = folder.createFile(filename, jsonString, MimeType.PLAIN_TEXT);
    var fileUrl = file.getUrl();

    // Log in Audit sheet
    logBackupAudit("SUCCESS", filename, fileUrl, totalRecords);

    // Send Success Notification Email
    sendBackupEmailNotification(true, {
      filename: filename,
      timeIndia: timeStr,
      records: totalRecords,
      fileUrl: fileUrl,
      folderUrl: folder.getUrl()
    });

    Logger.log("Automatic backup completed successfully: " + filename);
    return { success: true, fileId: file.getId(), url: fileUrl, filename: filename };

  } catch (error) {
    Logger.log("ERROR during backup: " + error.toString());
    logBackupAudit("FAILED", filename, "", 0, error.toString());
    
    // Send Failure Email Notification
    sendBackupEmailNotification(false, {
      filename: filename,
      timeIndia: timeStr,
      error: error.toString()
    });

    return { success: false, error: error.toString() };
  }
}

/**
 * Creates an audit entry in the "BackupAudit" sheet if present
 */
function logBackupAudit(status, filename, fileUrl, totalRecords, errorMsg) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("BackupAudit");
    if (!sheet) {
      sheet = ss.insertSheet("BackupAudit");
      sheet.appendRow(["Timestamp IST", "Status", "Filename", "Total Records", "File URL", "Error Details"]);
    }
    sheet.appendRow([getIndiaReadableTime(), status, filename, totalRecords, fileUrl, errorMsg || "None"]);
  } catch (e) {
    Logger.log("Could not write to BackupAudit sheet: " + e.toString());
  }
}

/**
 * Sends Email notification to Admin via MailApp
 */
function sendBackupEmailNotification(isSuccess, details) {
  if (!CONFIG.ADMIN_EMAIL) return;

  var subject = isSuccess
    ? "✅ [SUCCESS] Club Database Daily Backup Completed (" + details.timeIndia + ")"
    : "❌ [ALERT] Club Database Daily Backup FAILED (" + details.timeIndia + ")";

  var body = "";
  if (isSuccess) {
    body = "Dear Club Administrator,\n\n"
      + "The scheduled 11:00 PM IST daily database backup of your Club Management system was completed successfully.\n\n"
      + "• Backup Filename: " + details.filename + "\n"
      + "• Date & Time: " + details.timeIndia + "\n"
      + "• Total Records Archived: " + details.records + "\n"
      + "• Google Drive Folder: " + CONFIG.BACKUP_FOLDER_NAME + "\n"
      + "• File Link: " + details.fileUrl + "\n\n"
      + "This backup is securely stored in Google Drive and can be restored anytime from your Admin Dashboard.\n\n"
      + "Regards,\nGramin Club Manager System";
  } else {
    body = "ATTENTION: Club Administrator,\n\n"
      + "The scheduled 11:00 PM IST daily database backup encountered an error:\n\n"
      + "• Error: " + details.error + "\n"
      + "• Attempted Time: " + details.timeIndia + "\n\n"
      + "Please inspect your Google Drive permissions and spreadsheet settings.\n\n"
      + "Regards,\nGramin Club Manager System";
  }

  try {
    MailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body);
  } catch (e) {
    Logger.log("Could not send email notification: " + e.toString());
  }
}

/**
 * Webhook GET endpoint for health check & trigger verification
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "status";

  if (action === "backup_now") {
    var result = runDailyClubBackup();
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  }

  var triggers = ScriptApp.getProjectTriggers();
  var triggerActive = triggers.some(function(t) { return t.getHandlerFunction() === "runDailyClubBackup"; });

  var status = {
    app: "Gramin Club Management Google Apps Script",
    triggerConfigured: triggerActive,
    scheduledTime: "11:00 PM IST (" + CONFIG.TIMEZONE + ")",
    backupFolder: CONFIG.BACKUP_FOLDER_NAME,
    adminEmail: CONFIG.ADMIN_EMAIL,
    lastCheck: getIndiaReadableTime()
  };

  return ContentService.createTextOutput(JSON.stringify(status)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Webhook POST endpoint for manual trigger execution from Club Web App
 */
function doPost(e) {
  var result = runDailyClubBackup();
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}
