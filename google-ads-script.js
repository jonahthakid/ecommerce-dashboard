/**
 * Google Ads Script - Export Daily Metrics to Google Sheets
 *
 * SETUP:
 * 1. Create a new Google Sheet and copy its URL
 * 2. Replace SPREADSHEET_URL below with your Sheet URL
 * 3. In Google Ads: Tools & Settings → Scripts → New Script
 * 4. Paste this entire script and save
 * 5. Run once manually to authorize, then schedule daily
 */

var SPREADSHEET_URL = 'YOUR_GOOGLE_SHEET_URL_HERE';
var SHEET_NAME = 'GoogleAdsData';

function main() {
  var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['date', 'spend', 'conversions_value', 'roas', 'synced_at']);
  }

  // Get data for last 7 days (covers any gaps)
  var today = new Date();
  var startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  var dateFormat = function(d) {
    return Utilities.formatDate(d, AdsApp.currentAccount().getTimeZone(), 'yyyyMMdd');
  };

  var report = AdsApp.report(
    'SELECT segments.date, metrics.cost_micros, metrics.conversions_value ' +
    'FROM customer ' +
    'WHERE segments.date BETWEEN "' + dateFormat(startDate) + '" AND "' + dateFormat(today) + '"'
  );

  var rows = report.rows();
  var dataByDate = {};

  while (rows.hasNext()) {
    var row = rows.next();
    var date = row['segments.date'];
    var costMicros = parseFloat(row['metrics.cost_micros']) || 0;
    var conversionsValue = parseFloat(row['metrics.conversions_value']) || 0;

    if (!dataByDate[date]) {
      dataByDate[date] = { spend: 0, conversionsValue: 0 };
    }
    dataByDate[date].spend += costMicros / 1000000;
    dataByDate[date].conversionsValue += conversionsValue;
  }

  // Get existing dates in sheet to avoid duplicates
  var existingData = sheet.getDataRange().getValues();
  var existingDates = {};
  for (var i = 1; i < existingData.length; i++) {
    existingDates[existingData[i][0]] = i + 1; // row number (1-indexed)
  }

  var syncedAt = new Date().toISOString();

  // Update or append data
  for (var date in dataByDate) {
    var spend = dataByDate[date].spend.toFixed(2);
    var convValue = dataByDate[date].conversionsValue.toFixed(2);
    var roas = dataByDate[date].spend > 0
      ? (dataByDate[date].conversionsValue / dataByDate[date].spend).toFixed(2)
      : '0.00';

    var rowData = [date, spend, convValue, roas, syncedAt];

    if (existingDates[date]) {
      // Update existing row
      var rowNum = existingDates[date];
      sheet.getRange(rowNum, 1, 1, 5).setValues([rowData]);
    } else {
      // Append new row
      sheet.appendRow(rowData);
    }
  }

  Logger.log('Synced ' + Object.keys(dataByDate).length + ' days of data');
}
