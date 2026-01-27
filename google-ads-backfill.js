var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1FtoFCjEO4urh5P15FutNX6T-YIcGhZn5keBrzhlKAig/edit';
var SHEET_NAME = 'GoogleAdsData';

function main() {
  var spreadsheet = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['date', 'spend', 'conversions_value', 'roas', 'synced_at']);
  }

  // BACKFILL: From Jan 1 2025 to today
  var startDate = new Date('2025-01-01');
  var today = new Date();

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

  var existingData = sheet.getDataRange().getValues();
  var existingDates = {};
  for (var i = 1; i < existingData.length; i++) {
    existingDates[existingData[i][0]] = i + 1;
  }

  var syncedAt = new Date().toISOString();

  for (var date in dataByDate) {
    var spend = dataByDate[date].spend.toFixed(2);
    var convValue = dataByDate[date].conversionsValue.toFixed(2);
    var roas = dataByDate[date].spend > 0
      ? (dataByDate[date].conversionsValue / dataByDate[date].spend).toFixed(2)
      : '0.00';

    var rowData = [date, spend, convValue, roas, syncedAt];

    if (existingDates[date]) {
      var rowNum = existingDates[date];
      sheet.getRange(rowNum, 1, 1, 5).setValues([rowData]);
    } else {
      sheet.appendRow(rowData);
    }
  }

  Logger.log('Backfilled ' + Object.keys(dataByDate).length + ' days of data from 2025-01-01');
}
