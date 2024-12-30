#include <memory>
#include <FS.h>
#include <LittleFS.h>
#include <ArduinoJson.h>
//https://arduino-esp8266.readthedocs.io/en/latest/filesystem.html
//https://makesmart.net/arduino-ide-arbeiten-mit-json-objekten-fur-einsteiger/
//https://arduinojson.org/v6/doc/deserialization/


boolean startLittleFS() {
  if (!LittleFS.begin()) {
    DEBUG_SERIAL.println("ERROR: Failed to mount LittleFS.");
    return (false);
  }
  //  DEBUG_SERIAL.println("INFO: Successfully mounted LittleFS.");
  return (true);
}

void endLittleFS() {
  LittleFS.end();
  //  DEBUG_SERIAL.println("INFO: Successfully un-mounted LittleFS.");
}

boolean listDir(const char* dirname) {
  if (!startLittleFS()) { return (false); }
  Serial.printf("Listing directory: %s\n", dirname);
  Dir root = LittleFS.openDir(dirname);
  while (root.next()) {
    File file = root.openFile("r");
    //    DEBUG_SERIAL.printf(" FILE: %s, SIZE: %d", String(root.fileName()), file.size());  //tried to compact, however sometimes file name is not correctly resolved!
    DEBUG_SERIAL.print(" FILE: ");
    DEBUG_SERIAL.print(root.fileName());
    DEBUG_SERIAL.print(", SIZE: ");
    DEBUG_SERIAL.print(file.size());
    time_t cr = file.getCreationTime();
    time_t lw = file.getLastWrite();
    file.close();
    struct tm* tmstruct = localtime(&cr);
    DEBUG_SERIAL.printf(", CREATION: %d-%02d-%02d %02d:%02d:%02d, ", (tmstruct->tm_year) + 1900, (tmstruct->tm_mon) + 1, tmstruct->tm_mday, tmstruct->tm_hour, tmstruct->tm_min, tmstruct->tm_sec);
    tmstruct = localtime(&lw);
    DEBUG_SERIAL.printf(", LAST WRITE: %d-%02d-%02d %02d:%02d:%02d\n", (tmstruct->tm_year) + 1900, (tmstruct->tm_mon) + 1, tmstruct->tm_mday, tmstruct->tm_hour, tmstruct->tm_min, tmstruct->tm_sec);
  }
  endLittleFS();
  return (true);
}

boolean showFSInfo() {
  if (!startLittleFS()) { return (false); }
  FSInfo info;
  LittleFS.info(info);
  DEBUG_SERIAL.println("totalBytes: " + String(info.totalBytes));
  DEBUG_SERIAL.println("usedBytes: " + String(info.usedBytes));
  DEBUG_SERIAL.println("blockSize: " + String(info.blockSize));
  DEBUG_SERIAL.println("pageSize: " + String(info.pageSize));
  DEBUG_SERIAL.println("maxOpenFiles: " + String(info.maxOpenFiles));
  DEBUG_SERIAL.println("maxPathLength: " + String(info.maxPathLength));
  endLittleFS();
  listDir("/");
  return (true);
}

boolean writeFile(const char* fileName, const char* message, boolean append = false) {
  if (!startLittleFS()) { return (false); }
  File file;
  if (append) {
    file = LittleFS.open(fileName, "a");
  } else {
    file = LittleFS.open(fileName, "w");
  }
  if (!file) {
    DEBUG_SERIAL.println("ERROR: Failed to open file " + String(fileName) + " for writing!");
    return (false);
  }
  if (file.print(message)) {
    //    DEBUG_SERIAL.println("INFO: Successfully wrote file " + String(fileName) + "!");
  } else {
    DEBUG_SERIAL.println("ERROR: Failed to write file " + String(fileName) + "!");
    return (false);
  }
  size_t size = file.size();
  //  DEBUG_SERIAL.println("INFO: File size is " + String(size) + ".");
  file.close();
  endLittleFS();
  return (true);
}

boolean deleteFile(const char* fileName) {
  if (!startLittleFS()) { return (false); }
  DEBUG_SERIAL.printf("Deleting file: %s\n", fileName);
  File file = LittleFS.open(fileName, "r");
  if (!file) {
    DEBUG_SERIAL.println("WARNING: There is no file " + String(fileName) + ". Nothing to delete!");
    showFSInfo();
    return (false);
  }
  if (LittleFS.remove(fileName)) {
    DEBUG_SERIAL.println("INFO: Sucessfully deleted file " + String(fileName) + ".");
  } else {
    DEBUG_SERIAL.println("ERROR: Failed to delete file " + String(fileName) + ".");
    return (false);
  }
  endLittleFS();
  return (true);
}

long getRemainingSpace() {
  if (!startLittleFS()) { return (false); }
  FSInfo info;
  LittleFS.info(info);
  long spaceRemaining = info.totalBytes - info.usedBytes;
  endLittleFS();
  return (spaceRemaining);
}

void logMessage(String message, boolean print = true) {
  if (print) { DEBUG_SERIAL.println(message); }
  timeClient.update();
  String time = timeClient.getFormattedDateTime();
  String logMessage = time + ": " + message + "\n";
  long spaceRemaining = getRemainingSpace();
  if (spaceRemaining < 2000) {
    DEBUG_SERIAL.println("Running out of space (" + String(spaceRemaining) + ")...Deleting logfile.");
    deleteFile(logFile);  //ToDo: better strategy would be to start chopping the file from the beginning
  }
  writeFile(logFile, logMessage.c_str(), true);
}

String readFile(const char* fileName) {
  //File System
  if (!startLittleFS()) { return (""); }
  DEBUG_SERIAL.printf("INFO: Reading file: %s\n", fileName);
  File file = LittleFS.open(fileName, "r");
  if (!file) {
    DEBUG_SERIAL.println("INFO: Failed to open file " + String(fileName) + " for reading!");
    return ("");
  }
  String text = file.readString();
  file.close();
  endLittleFS();
  return (text);
}

boolean renameFile(const char* fileName1, const char* fileName2) {
  if (!startLittleFS()) { return (false); }
  DEBUG_SERIAL.printf("Renaming file %s to %s\n", fileName1, fileName2);
  if (LittleFS.rename(fileName1, fileName2)) {
    DEBUG_SERIAL.println("INFO: File renamed.");
  } else {
    DEBUG_SERIAL.println("ERROR: Rename failed.");
    return (false);
  }
  endLittleFS();
  return (true);
}

// WifiManager HANDLING
void saveSaveAndConnectState(int value) {
  writeFile("saveAndConnectPressed.txt", String(value).c_str());
}

int saveAndConnectPressed() {
  String saveAndConnectPressed = readFile("saveAndConnectPressed.txt");
  int retVal;
  if (saveAndConnectPressed == "") {
    retVal = 0;
  } else {
    retVal = saveAndConnectPressed.toInt();
  }
  Serial.println("=== saveAndConnectPressed = " + String(retVal));
  return (retVal);
}

void saveConnectionState(int value) {
  writeFile("connectionFailed.txt", String(value).c_str());
}

int lastConnectionFailed() {
  String connectionFailed = readFile("connectionFailed.txt");
  int retVal;
  if (connectionFailed == "") {
    retVal = 0;
  } else {
    retVal = connectionFailed.toInt();
  }
  Serial.println("=== connectionFailed = " + String(retVal));
  return (retVal);
}

boolean saveStaticIPSettings(String localIP = "") {
  Serial.println("INFO: Saving Static IP Settings.");
  if (!startLittleFS()) { return (false); }
  File file = LittleFS.open(connectionFile, "w");
  JsonDocument doc;
  if (localIP != "") {
    doc["localIP"] = localIP;
  } else {
    doc["localIP"] = WiFi.localIP().toString();
  }
  doc["gatewayIP"] = WiFi.gatewayIP().toString();
  doc["dnsIP"] = WiFi.dnsIP().toString();
  doc["subnetMask"] = WiFi.subnetMask().toString();
  serializeJson(doc, file);
  file.close();
  endLittleFS();
  return (true);
}

boolean readStaticIPSettings() {
  Serial.print("=== Read Settings");
  if (!startLittleFS()) { return (false); }
  DEBUG_SERIAL.printf("INFO: Reading file: %s\n", connectionFile);
  File file = LittleFS.open(connectionFile, "r");
  if (!file) {
    DEBUG_SERIAL.println("INFO: Failed to open file " + String(connectionFile) + " for reading!");
    endLittleFS();
    return (false);
  }
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, file);
  if (error) {
    DEBUG_SERIAL.print("deserializeJson() failed: ");
    DEBUG_SERIAL.println(error.f_str());
    return (false);
  }
  String localIPString = doc["localIP"];
  String gatewayIPString = doc["gatewayIP"];
  String dnsIPString = doc["dnsIP"];
  String subnetMaskString = doc["subnetMask"];
  file.close();
  endLittleFS();
  Serial.println("Read Static Ip Settings: localIP: " + localIPString + ", gatewayIP: " + gatewayIPString + ", dnsIP: " + dnsIPString + ", subnetMask: " + subnetMaskString);
  localIP.fromString(localIPString.c_str());
  gatewayIP.fromString(gatewayIPString.c_str());
  dnsIP.fromString(dnsIPString.c_str());
  subnetMask.fromString(subnetMaskString.c_str());
  return (true);
}

void resetStaticIPSettings() {
  Serial.println("=== Clear IP Settings");
  deleteFile(connectionFile);  
  saveConnectionState(0);
  localIP.fromString("");  //reset local setting
}

void saveParamsCallback() {  //gets called when in the Captive Portal the "Speichern & Verbinden" ausgewählt wird
  saveSaveAndConnectState(1);
}