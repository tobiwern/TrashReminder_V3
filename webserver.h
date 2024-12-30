//#include "wiring_private.h" //don't know what this is?
//https://arduinojson.org/v6/api/jsondocument/
//https://arduinojson.org/v6/doc/deserialization/
//https://arduinojson.org/v6/assistant/#/step1
//https://arduinogetstarted.com/reference/serial-readbytes
//https://makesmart.net/arduino-ide-arbeiten-mit-json-objekten-fur-einsteiger/
//https://arduinojson.org/v6/how-to/reduce-memory-usage/
//https://github.com/arkhipenko/Dictionary

#include <ESP8266WebServer.h>
ESP8266WebServer server(80);
boolean serverRunning = false;
#include <Pinger.h>
Pinger pinger;

void printTaskIds(int taskIds[]) {  //debug
  DEBUG_SERIAL.print("taskIds[] = ");
  for (int i = 0; i < maxNumberOfTasksPerDay; i++) {
    if (taskIds[i] != -1) { DEBUG_SERIAL.print(String(taskIds[i]) + " "); }
  }
  DEBUG_SERIAL.println("");
}

boolean initDataFromFile() {
  if (!startLittleFS()) { return (""); }
  DEBUG_SERIAL.printf("INFO: Reading file: %s\n", dataFile);
  File file = LittleFS.open(dataFile, "r");
  numberOfValidTaskIds = 0;
  numberOfTaskIds = 0;
  int numberOfColors = 0;  //only locally needed
  numberOfEpochs = 0;
  if (!file) {
    DEBUG_SERIAL.println("WARNING: Failed to open file " + String(dataFile) + " for reading!");
    endLittleFS();
    return (false);
  }
  uint32_t freeHeap = ESP.getFreeHeap();
  DEBUG_SERIAL.println("Free Heap (before): " + String(freeHeap));
  JsonDocument doc;  //on heap for large amount of data
  if (doc.overflowed()) {
    DEBUG_SERIAL.println("WARNING: Failed to allocate memory for Deserialization! Free memory is: " + String(freeHeap) + ". Retrying another time.");
    JsonDocument doc;
  }
  DeserializationError error = deserializeJson(doc, file);
  if (error) {
    DEBUG_SERIAL.println("WARNING: Failed to deserialize data! Error: " + String(error.f_str()));
    endLittleFS();
    return (false);
  }
  DEBUG_SERIAL.println("Free Heap (after): " + String(ESP.getFreeHeap()));
  // get validTasks ////////////////////////////////
  JsonArray validTaskIds = doc["validTaskIds"];  //Implicit cast
  for (JsonVariant v : validTaskIds) {
    validTaskId[numberOfValidTaskIds++] = v.as<int>();
    DEBUG_SERIAL.println("validTaskId: " + String(validTaskId[numberOfValidTaskIds - 1]));
  }
  // get tasks ////////////////////////////////
  JsonArray tasks = doc["tasks"];  //Implicit cast
  for (String taskText : tasks) {  //Implicit cast
    task[numberOfTaskIds++] = taskText;
    DEBUG_SERIAL.println("Task: " + task[numberOfTaskIds - 1]);
  }
  // get colors ////////////////////////////////
  JsonArray colors = doc["colors"];  //implicit cast to JsonArray!
  for (String colorText : colors) {
    unsigned long int color1 = strtoul(colorText.c_str(), NULL, 16);  //conversion from HEX String => HEX number
    color[numberOfColors++] = color1;
    DEBUG_SERIAL.println("Color: " + colorText + ", value = " + String(color1));
  }
  JsonArray epochTasks = doc["epochTasks"];  //Implicit cast
  for (JsonObject obj : epochTasks) {
    for (JsonPair p : obj) {
      int taskIds[maxNumberOfTasksPerDay];
      memset(taskIds, -1, sizeof(taskIds));
      unsigned long epoch = strtoul(p.key().c_str(), 0, 10);  // is a JsonString
      int counter = 0;
      JsonArray taskIdArray = p.value();  // is a JsonVariant
      for (int taskId : taskIdArray) {
        if (counter < maxNumberOfTasksPerDay - 1) {  //prevent running over reserved memory
          taskIds[counter++] = taskId;
        } else {
          DEBUG_SERIAL.println("WARNING: Too many taskIds: SKIPPING: " + taskId);
        }
      }
      //JsonArray taskIdArray = p.value();                      // is a JsonVariant
      //copyArray(taskIdArray, taskIds);
      epochTask entry;
      entry.epoch = epoch;
      memcpy(entry.taskIds, taskIds, sizeof(entry.taskIds));
      if (numberOfEpochs < maxNumberOfEpochs - 1) {  //prevent running over reserved memory
        epochTaskDict[numberOfEpochs++] = entry;     //{ .epoch = epoch, .taskIds = taskIds };
      } else {
        DEBUG_SERIAL.println("WARNING: Too many entries: SKIPPING: ");
      }
      DEBUG_SERIAL.print("epoch: " + String(epoch) + ", ");
      printTaskIds(taskIds);
    }
  }
  file.close();
  endLittleFS();
  return (true);
}

//settings
void initSettingsFromFile() {
  if (!startLittleFS()) { return; }
  DEBUG_SERIAL.printf("INFO: Reading file: %s\n", settingsFile);
//  Serial.println("TOBI: File = " + String(readFile(settingsFile)));
  File file = LittleFS.open(settingsFile, "r");
  if (!file) {
    DEBUG_SERIAL.println("INFO: Failed to open file " + String(settingsFile) + " for reading!");
    endLittleFS();
    return;
  }
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, file);
  if (error) {
    DEBUG_SERIAL.print("deserializeJson() failed: ");
    DEBUG_SERIAL.println(error.f_str());
    logMessage("Deserialization of settings failed. Deleting settings file.");
    deleteFile(settingsFile);
    return;
  }
  int startHourLoc = doc["startHour"];
  if(startHourLoc){startHour = startHourLoc;}
  int endHourLoc = doc["endHour"];
  if(endHourLoc){endHour = endHourLoc;}
  String ntpServerLoc = String(doc["ntpServer"]);
  if(ntpServerLoc){ntpServer = ntpServerLoc;}
  String timezoneServerLoc = String(doc["timezoneServer"]);
  if(timezoneServerLoc){timezoneServer = timezoneServerLoc;}
  int timeOffsetLoc = doc["timeOffset"];
  if(timeOffsetLoc){timeOffset = timeOffsetLoc;}
  boolean showPastDatesLoc = doc["showPastDates"];
  if(showPastDatesLoc){showPastDates = showPastDatesLoc;}
  String languageLoc = String(doc["language"]);
  if(languageLoc){language = languageLoc;}
  DEBUG_SERIAL.println("Read Settings: startHour=" + String(startHour) + ", endHour=" + String(endHour) + ", ntpServer=" + ntpServer + ", timezoneServer=" + timezoneServer + ", timeOffset=" + String(timeOffset) + ", showPastDates=" + String(showPastDates) + ", language=" + language);
  file.close();
  endLittleFS();
}

void sendTasksToWebpage() {  //transfering ESP data to the Webpage
  String value = readFile(dataFile);
  if (value != "") {
    DEBUG_SERIAL.println("Sending taks: " + value);
    server.send(200, "text/plane", value);
  } else {
    value = "ERROR";
    server.send(500, "text/plane", value);
  }
}

void sendLogToWebpage() {  //transfering ESP data to the Webpage
  String value = readFile(logFile);
  if (value != "") {
    DEBUG_SERIAL.println("Sending log: " + value);
    server.send(200, "text/plane", value);
  } else {
    server.send(200, "text/plane", "empty");
  }
}

void sendSettingsToWebpage() {  //transferring ESP settings => Webpage
  String value;
  value = String(startHour) + "," + String(endHour) + "," + maxNumberOfEpochs + "," + maxNumberOfTasksPerDay + "," + maxNumberOfTaskIds + "," + ntpServer + "," + timezoneServer + "," + String(timeOffset) + "," + String(showPastDates) + "," + language + "," + String(acknowledge);
  DEBUG_SERIAL.println("Sending settings: " + value);
  server.send(200, "text/plane", value);
}

void notFound() {
  DEBUG_SERIAL.println("WARNING: Not found: Request was \"" + server.uri() + "\"");
  server.send(404, "text/plain", "Not found");
}

void handleRoot() {
//Serial.println("Handle root");
  String s = webpage;
  server.send(200, "text/html", s);
}

void writeSettingsToFile() {
  String jsonText = ""; 
  jsonText = "{\"startHour\":" + String(startHour) 
  + ",\"endHour\":" + String(endHour)
  + ",\"ntpServer\":\"" + String(ntpServer) + "\""
  + ",\"timezoneServer\":\"" + String(timezoneServer) + "\""
  + ",\"timeOffset\":" + String(timeOffset) 
  + ",\"showPastDates\":" + String(showPastDates) 
  + ",\"language\":\"" + String(language) + "\"" 
  + "}";
  DEBUG_SERIAL.println("Writing settings: " + jsonText);
  writeFile(settingsFile, jsonText.c_str());
Serial.println(String(readFile(settingsFile)));
  showFSInfo();
  initSettingsFromFile();
}

void setStartHour() {
  String hour = server.arg("value");
  DEBUG_SERIAL.println("Setting startHour = " + hour);
  startHour = hour.toInt();
  acknowledgeBlink();
  server.send(200, "text/plane", "start");
  writeSettingsToFile();
}

void setEndHour() {
  String hour = server.arg("value");
  DEBUG_SERIAL.println("Setting endHour = " + hour);
  endHour = hour.toInt();
  acknowledgeBlink();
  server.send(200, "text/plane", "end");
  writeSettingsToFile();
}

void setNtpServer() {
  String serverNTP = server.arg("value");
  DEBUG_SERIAL.println("Request to change ntpServer = " + serverNTP);
  if(pinger.Ping(serverNTP.c_str())){
    DEBUG_SERIAL.println("Setting ntpServer = " + serverNTP);
    timeClient.setPoolServerName(serverNTP.c_str());
    ntpServer = serverNTP.c_str();
    acknowledgeBlink();
    server.send(200, "text/plane", "OK");
    writeSettingsToFile();
  } else {
    DEBUG_SERIAL.println("ntpServer = " + serverNTP + " can not be reached!");
    server.send(500, "text/plane", ntpServer);
  }
}

void setTimezoneServer() {
  String value = server.arg("value");
  DEBUG_SERIAL.println("Setting timezoneServer = " + value);
  timezoneServer = value.c_str();
  acknowledgeBlink();
  server.send(200, "text/plane", "OK");
  writeSettingsToFile();
}

void setTimeOffset() {
  String value = server.arg("value");
  DEBUG_SERIAL.println("Setting timeOffset = " + value);
  timeOffset = value.toInt();
  acknowledgeBlink();
  server.send(200, "text/plane", "OK");
  writeSettingsToFile();
}

void setShowPastDates() {
  String value = server.arg("value");
  DEBUG_SERIAL.println("Setting showPastDates = " + value);
  showPastDates = value.toInt();
  acknowledgeBlink();
  server.send(200, "text/plane", value);
  writeSettingsToFile();
}

void setLanguage() {
  String value = server.arg("value");
  DEBUG_SERIAL.println("Setting Language = " + value);
  language = value;
  acknowledgeBlink();
  server.send(200, "text/plane", "OK");
  writeSettingsToFile();
}

void receiveFromWebpage_Tasks() {
  String jsonText = server.arg("value");
  DEBUG_SERIAL.println("Receiving data in JSON format: " + jsonText);
  if (writeFile(dataFile, jsonText.c_str())) {
    server.send(200, "text/plane", "OK");
  } else {
    server.send(500, "text/plane", "ERROR");
  }
  acknowledge = false; //resetting acknowledge when new tasks get send from Webpage (happens on New ICS, Color Change, Valid Task change)
  showFSInfo();
  acknowledgeBlink();
  //  deleteFile("/events.log");
  STATE_NEXT = STATE_INIT;
}

void closeSettings() {
  DEBUG_SERIAL.println("Closing Settings.");
  server.send(200, "text/plane", "OK");
  STATE_NEXT = STATE_INIT;
}

void fireworks() {
  DEBUG_SERIAL.println("Fireworks...");
  STATE_FOLLOWING = STATE_QUERY;
  STATE_NEXT = STATE_SHOW;
  millisLast = millis();                 //to reset show timer
  server.send(200, "text/plane", "OK");  //should always respond to prevent resend (10x)
}

void toggleDemo() {
  if (STATE == STATE_DEMO) {
    DEBUG_SERIAL.println("Demo beendet!");
    STATE_NEXT = STATE_INIT;
    server.send(200, "text/plane", "DemoOff");
  } else {
    DEBUG_SERIAL.println("Demo gestartet!");
    STATE_NEXT = STATE_DEMO;
    millisLast = millis();  //to reset show timer
    server.send(200, "text/plane", "DemoOn");
  }
}

void deleteTasks() {
  DEBUG_SERIAL.println("Delete Settings.");
  if (deleteFile(dataFile)) {
    server.send(200, "text/plane", "OK");
  } else {
    server.send(500, "text/plane", "ERROR");
  }
  delay(500);  //ToDo
  STATE_NEXT = STATE_INIT;
}

void deleteLog() {
  DEBUG_SERIAL.println("Delete Logfile.");
//  deleteFile(settingsFile);
  if (deleteFile(logFile)) {
    server.send(200, "text/plane", "OK");
  } else {
    server.send(500, "text/plane", "ERROR");
  }
  resetStaticIPSettings();
}

void resetWifiSettings() {
  DEBUG_SERIAL.println("Reset Wifi Settings.");
  resetStaticIPSettings();
  readStaticIPSettings();
  //  WiFiManager wm;  //Is this fine to have another instance?
  wm.resetSettings();
  server.send(200, "text/plane", "OK");
  //  leds[0] = CRGB::Red;                                      //in case no successful WiFi connection
  //  FastLED.show();
  ESP.restart();
}

void receiveFromWebpage_Acknowledge() {  //ToDo: Need to version webpages
  String value = server.arg("value");
  DEBUG_SERIAL.println("Acknowledge: " + value);
  acknowledge = value.toInt();
  lastSwitchMillis = millis();           //in demo mode to have the same pause as by lifting trashcan
  server.send(200, "text/plane", String(acknowledge));  //should always respond to prevent resend (10x)
}

void startWebServer() {
  DEBUG_SERIAL.println("Starting WebServer...");
  server.on("/", handleRoot);
  server.on("/set_start", setStartHour);
  server.on("/set_end", setEndHour);
  server.on("/set_ntp_server", setNtpServer);
  server.on("/set_timezone_server", setTimezoneServer);
  server.on("/set_time_offset", setTimeOffset);
  server.on("/set_show_past_dates", setShowPastDates);
  server.on("/set_language", setLanguage);
  server.on("/request_settings", sendSettingsToWebpage);
  server.on("/request_tasks", sendTasksToWebpage);     //ESP => webpage
  server.on("/request_log", sendLogToWebpage);         //ESP => webpage
  server.on("/send_tasks", receiveFromWebpage_Tasks);  //webpage => ESP name
  server.on("/delete_tasks", deleteTasks);
  server.on("/delete_log", deleteLog);
  server.on("/close", closeSettings);
  server.on("/fireworks", fireworks);
  server.on("/toggle_demo", toggleDemo);
  server.on("/acknowledge", receiveFromWebpage_Acknowledge);
  server.on("/reset_wifi_settings", resetWifiSettings);
  //  server.on("/send_ValidTaskIds", receiveFromWebpage_ValidTaskIds);
  server.onNotFound(notFound);
  server.begin();
  DEBUG_SERIAL.print("IP address: ");
  DEBUG_SERIAL.print(WiFi.localIP());
  DEBUG_SERIAL.print(", hostName: http://");
  DEBUG_SERIAL.println(WiFi.getHostname());
  serverRunning = true;
}

void stopWebServer() {
  DEBUG_SERIAL.println("Stopping WebServer...");
  server.stop();
  serverRunning = false;
}

boolean isClientConnected() {
  WiFiClient myclient = server.client();
  return (myclient.connected());
}
