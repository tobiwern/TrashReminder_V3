/*
NOTE:
  - FastLED 3.6.0 works, later version 3.9.8 has memory leak!
  - Use compile setting for "ESP8266 => LOLIN(Wemos) D1 R1" 
    - Flash Size: "4MB (FS:3MB,OTA:512KB)"
    - MMU: "16KB cache, 48KB IRAM and 2nd Heap (shared)" 
Todo:
ESP:
  - Selecting a color in the config should be shown directly on the model
  - Sleep when there are no events in the next days
  - Contact time server less often and maintain time internally (possible? => can we detect if the device returns from sleep or gets replugged? yes)
  - check if there are more tasksPerDay then allowed
  - Should we have a logFile that is overwritten when running out of space? Could help debug - Or have a "Send/Delete Logfile" option in the GUI 
  - "Not found" when opening page in browser?
  - How can we go in demoMode without configuring WiFi?
  - delete settingsFile when json deserialization is unsuccessful
  - NTP Time Server: What happens if it can not be reached? =>  isTimeSet(), https://github.com/arduino-libraries/NTPClient/blob/master/NTPClient.h
    - update() =>  @return true on success, false on failure
    - if glitch => first wait for a minute, then query again
  - Auf Werkseinstellungen zurücksetzen
  - Adjust timezone via Webpage (currently has no effect)
  - OTA Browser Update: https://mischianti.org/esp8266-ota-update-with-web-browser-custom-web-interface-3/
WebPage:
  - Does it make sense to go to an AsyncWebserver (or WebSocket) => will this show a faster response time?
  - Option to merge currently still available and new ICS so not everything is overwritten.
  - Show Firmware Version in Webpage!
  - Mülleimer Lade Animation
  - Have two sliders to define the start and end time
  - Multi languages, https://stackoverflow.com/questions/228835/best-practice-javascript-and-multilanguage, https://www.codeproject.com/Articles/5310336/Dynamically-Loading-a-JavaScript-File,  
3D-Model:
  - Add magnets to trashcan so it snapps in place
  - Smaller holes to improve metal splint
Helpful:
  - Epoch Converter: https://www.epochconverter.com/
  - JSON Validator: https://jsonformatter.curiousconcept.com/#
  - ICS/ICAL: https://www.ionos.de/digitalguide/websites/web-entwicklung/icalendar/ or https://datatracker.ietf.org/doc/html/rfc5545
  - Getting timezone from IP: https://ipapi.co/api/?csharp#specific-location-field6 or https://ipapi.co/json/ => https://ipapi.co/utc_offset
  - QR Code Generator: https://www.qrcode-generator.ch/
  - Favicon: https://www.favicongenerator.com/reference
*/

#include <ESP8266WiFi.h>
#include <NTPClient_Generic.h>  //https://github.com/khoih-prog/NTPClient_Generic OLD: https://github.com/arduino-libraries/NTPClient OR https://github.com/taranais/NTPClient
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>

String timezoneServer = "https://ipapi.co/utc_offset";
int timeOffset;

//options 
boolean showPastDates = 0;
String language = "de";

#include <WiFiUdp.h>
//#define WM_DEBUG_LEVEL DEBUG_NOTIFY
//#define WM_STRINGS_FILE "wm_strings_de.h"
#include <WiFiManager.h>  // https://github.com/tzapu/WiFiManager
WiFiManager wm;

#define DEBUG true  //set to true for debug output, false for no debug output
#define DEBUG_SERIAL \
  if (DEBUG) Serial

// Define NTP Client to get time
WiFiUDP ntpUDP;
//NTPClient timeClient(ntpUDP, "pool.ntp.org");
String ntpServer = "ntp.se";
NTPClient timeClient(ntpUDP, ntpServer.c_str());
unsigned int nowEpoch = 0;  //global since only querying every minute
unsigned int timeEpochLast = 0;
int maxTimeEpochDelta = 60 * 60;  //in seconds => 1 hour difference
//wait time before querying again on a NTP glitch
int epochTimeRepeatWaitTime = 60;  //seconds
unsigned long epochTimeRepeatWaitTimer = 0;
boolean epochTimeRepeatWaitFlag = false;
int queryIntervall = 60000;  //ms => every minute (could be less, however to really turn on LED at intended time...)
unsigned long lastQueryMillis = 0;

//files
const char* dataFile = "/data.json";
const char* logFile = "/logfile.txt";
const char* settingsFile = "/settings.json";
const char* connectionFile = "/connection.json";

IPAddress localIP;
IPAddress gatewayIP;
IPAddress dnsIP;
IPAddress subnetMask;

#include "filesystem.h"
#include "webpage.h"

//forward function prototypes (so function order does not matter)
//void setColor(int color, boolean fade, int blinkSpeed);

const int maxNumberOfTasksPerDay = 4;
int colorIds[maxNumberOfTasksPerDay];
int colorIdsLast[maxNumberOfTasksPerDay];
int colorIndex = 0;  //used to toggle between multiple colors for same day tasks

int startHour = 15;                  //am Vortag
int endHour = 9;                     //am Abholugstag
int brightness = 255;                //highest value since used to fadeBy...
int fadeAmount = 5;                  //Set the amount to fade to 5, 10, 15, 20, 25 etc even up to 255.
int showDuration = 5000;             //ms Splash screen
int configTimeout = 10 * 60 * 1000;  //10 minutes
unsigned long millisLast = 0;

/// STATE MACHINE
#define STATE_INIT 0
#define STATE_SHOW 1
#define STATE_DISCONNECTED 2
#define STATE_QUERY 3
#define STATE_DEMO 4

int STATE = STATE_SHOW;
//int STATE = STATE_DEMO;
int STATE_PREVIOUS = -1;
int STATE_NEXT = -1;
int STATE_FOLLOWING = -1;
String stateTbl[] = { "STATE_INIT", "STATE_SHOW", "STATE_DISCONNECTED", "STATE_QUERY", "STATE_DEMO" };

#include <FastLED.h>
#define NUM_LEDS 1
#define DATA_PIN 4  //D2
#define BRIGHTNESS 0
#define FRAMES_PER_SECOND 120
CRGB leds[NUM_LEDS];
uint8_t gHue = 0;  // rotating "base color" used by many of the patterns

//Switch
#include <Button.h>
#define REED_PIN 5  //D1
Button reed(REED_PIN, LOW, BTN_PULLUP, LATCHING);
int switchCounter = 0;
int multiClickTimeout = 1000;  //ms
unsigned long lastSwitchMillis = 0;

int acknowledge = 0;   //turn off reminder light when the Mülleimer is lupft
int triggerEpoch = 0;  //used to detect if the epochDict is changing => reset acknowledge
int initialized = 0;   //in order to prevent acknowledge to be triggered at the beginning

//data
int numberOfValidTaskIds = 0;  //global counter
int numberOfTaskIds = 0;       //global counter
int numberOfEpochs = 0;        //global counter
const int maxNumberOfEpochs = 200;
const int maxNumberOfTaskIds = 20;

String task[maxNumberOfTaskIds];
int color[maxNumberOfTaskIds];
int validTaskId[maxNumberOfTaskIds];

typedef struct epochTask {
  unsigned int epoch;
  int taskIds[maxNumberOfTasksPerDay];
} epochTask;

epochTask epochTaskDict[maxNumberOfEpochs];

// DEMO
int demoCurrTask = 0;
const int demoNumberOfTasks = 5;
epochTask demoTaskDict[demoNumberOfTasks];
int offDuration = 5 * 1000;  // 5 sec after trashcan was lifted the blinking starts again

void setup() {
  setupHardware();
  //deleteFile(settingsFile);
  setupWifiManager();
  setupTimeClient();
  showFSInfo();
  millisLast = millis();
}  //End setup

void loop() {
  handleState();
}

void setupHardware() {
  Serial.begin(115200);
  while (!Serial) { ; }
  reed.attachEdgeDetect(doNothing, setAcknowledge);
  FastLED.addLeds<WS2812B, DATA_PIN, GRB>(leds, NUM_LEDS);  // GRB ordering is typical
  delay(200);
  leds[0] = CRGB::Red;  //in case no successful WiFi connection
  FastLED.show();
}

void setupTimeClient() {
  timeClient.begin();
  timeOffset = getTimeOffsetFromPublicIP();
  timeClient.setTimeOffset(timeOffset);  //Autodetected from the IP! in seconds GMT+2 Berlin, GMT-4 NY => -3600*4 - UTC_offset * 3600
}

void setupWifiManager() {
  wm.setDebugOutput(true, "WifiM:");           //0-5
  std::vector<const char*> menu = { "wifi" };  //only Wifi menu shown
  wm.setMenu(menu);
  wm.setShowStaticFields(false);  //initially don't show Static IP fields, only when regular DHCP connection fails.
  WiFiManagerParameter custom_text("<dev style='color:green;'>Bitte <b>SSID</b> aus der Liste oben auswählen, <b>Passwort</b> eingeben und <b>Speichern & Verbinden</b> klicken.</dev>");
  wm.addParameter(&custom_text);
  //WiFiManagerParameter custom_mqtt_server("server", "mqtt server", "iot.eclipse", 40, " readonly");
  //wm.addParameter(&custom_mqtt_server);
  //wm.setCustomHeadElement("<style>html{filter: invert(100%); -webkit-filter: invert(100%);}</style>");
  //  IPAddress ip(192,168,178,123);
  //  IPAddressParameter param_ip("ip", "Feste IP (optional, Format: 192.168.178.123):", ip);
  //  wm.setSTAStaticIPConfig(IPAddress(192,168,178,123), IPAddress(192,168,0,1), IPAddress(255,255,255,0));
  //wm.setConnectTimeout(30);
  wm.setConfigPortalTimeout(120);  // needed in order to continue in case of failed connection
  //wm.addParameter(&customIp);
  wm.setSaveParamsCallback(saveParamsCallback);
  readStaticIPSettings();  //Todo: if static IP was indicated, use this from now on - should we do this in general or only if static IP was indicated? Maybe it is not even required assuming if the first connection was successful the router stores this IP???
  Serial.println("=== localIP: " + localIP.toString());
  if (localIP.toString() != "(IP unset)") {
    Serial.println("INFO: Using Static IP Address Method!");
    wm.setSTAStaticIPConfig(localIP, gatewayIP, subnetMask, dnsIP);
  }
  if (lastConnectionFailed() && saveAndConnectPressed()) {  //connectionFailed
    DEBUG_SERIAL.println("INFO: Previous connection failed. Showing Custom IP fields.");
    wm.setSTAStaticIPConfig(IPAddress(192, 168, 178, 123), IPAddress(192, 168, 178, 1), IPAddress(255, 255, 255, 0), IPAddress(8, 8, 8, 8));  //IP, Gateway, Subnet, DNS
    //https://github.com/tzapu/WiFiManager/blob/0.16.0/examples/AutoConnectWithFSParametersAndCustomIP/AutoConnectWithFSParametersAndCustomIP.ino
    WiFiManagerParameter custom_text("<br><br><dev style='color:red;'>Letzter Verbindungsversuch schlug fehl. Versuchen Sie eine unbenutzte statische IP Adresse zu vergeben.</dev><br>");
    wm.addParameter(&custom_text);
    wm.setConnectTimeout(120);
    leds[0] = CRGB::Orange;  //in case no successful WiFi connection
    FastLED.show();
  }
  if (wm.autoConnect("TrashReminder")) {
    DEBUG_SERIAL.println("Successfully connected.");
    if (lastConnectionFailed()) { saveStaticIPSettings(); }  //if there was a failed connection before and static IP has been indicated
    saveConnectionState(0);
    saveSaveAndConnectState(0);
  } else {
    DEBUG_SERIAL.println("Failed to connect.");
    saveConnectionState(1);
    ESP.restart();
  }
  WiFi.hostname("TrashReminder");
}

// ESP Functions
void handleConnection() {
  if (!WiFi.isConnected()) {
    DEBUG_SERIAL.println("Connection lost!");
    STATE_NEXT = STATE_DISCONNECTED;
  }
}

unsigned int getTimeEpoch(boolean force = false) {
  unsigned int timeEpoch = 0;
  while (timeEpoch < 1705261183) {  //an old time stamp is not possible
    if (force) {
      timeClient.forceUpdate();
    } else {
      timeClient.update();
    }
    timeEpoch = timeClient.getEpochTime();  //library continuous guessing when server connection is lost!
                                            //    DEBUG_SERIAL.println("timeEpoch: " + String(timeEpoch));
  }
  return (timeEpoch);
}

unsigned int getDominantTimeEpoch(int repeat) {
  unsigned int timeEpoch[repeat];
  for (int i = 0; i < repeat; i++) {
    timeEpoch[i] = getTimeEpoch(true);
    DEBUG_SERIAL.println("timeEpoch" + String(i) + ": " + String(timeEpoch[i]));
    delay(500);
  }
  unsigned long long sum = 0;
  for (int i = 0; i < repeat; i++) {
    sum += timeEpoch[i];
  }
  unsigned int average = sum / repeat;
  unsigned int minDeviation = getDistance(average, timeEpoch[0]);
  unsigned int dominantTimeEpoch = timeEpoch[0];
  for (int i = 1; i < repeat; i++) {
    unsigned int currDeviation = getDistance(average, timeEpoch[i]);
    if (currDeviation < minDeviation) {
      dominantTimeEpoch = timeEpoch[i];
      minDeviation = currDeviation;
    }  //pick timeEpoch with least deviation to the average of all timeEpochs
  }
  DEBUG_SERIAL.println("sum: " + String(sum) + ", average: " + String(average) + ", minDeviation: " + String(minDeviation) + ", dominantTimeEpoch: " + String(dominantTimeEpoch));
  timeEpochLast = dominantTimeEpoch;  //since this is considered correct
  return (dominantTimeEpoch);
}

unsigned int getDistance(unsigned int epochTime1, unsigned int epochTime2) {
  unsigned int distance;
  if (epochTime1 > epochTime2) {  //since values are unsigned need to make sure to substract the smaller from the larger! not abs(a-b)!
    distance = epochTime1 - epochTime2;
  } else {
    distance = epochTime2 - epochTime1;
  }
  return (distance);
}

unsigned int getCurrentTimeEpoch(unsigned long millisNow) {
  unsigned int timeEpoch = getTimeEpoch();
  if (getDistance(timeEpoch, timeEpochLast) > maxTimeEpochDelta) {
    logMessage("WARNING: There was a glitch on the NTP Time Server! Last time: " + String(timeEpochLast) + ", current time: " + String(timeEpoch) + ". Waiting a little and repeating query!");
    if (epochTimeRepeatWaitFlag == false) { epochTimeRepeatWaitTimer = millisNow; }  //since will be called consecutively
    epochTimeRepeatWaitFlag = true;
    timeEpoch = timeEpochLast;  // keeping old timestamp
  } else {                      //the timestamp recovered while waiting to run getDominantTimeEpoch
    if (epochTimeRepeatWaitFlag == true) { logMessage("INFO: Recovered! Matching timeEpoch received: " + String(timeEpoch)); }
    epochTimeRepeatWaitFlag = false;
  }
  if ((epochTimeRepeatWaitFlag == true) && (millisNow - epochTimeRepeatWaitTimer > epochTimeRepeatWaitTime)) {
    timeEpoch = getDominantTimeEpoch(3);
    logMessage("INFO: Resetting to dominant timeEpoch: " + String(timeEpoch) + " after wait time (" + String(epochTimeRepeatWaitTime) + " seconds)");
    epochTimeRepeatWaitFlag = false;
  }
  timeEpochLast = timeEpoch;
  return (timeEpoch);  //sometimes receives too large timestamp
}

int getTimeOffsetFromPublicIP() {
  int timeOffset = 3600;  //default GErmany
  HTTPClient http;
  WiFiClientSecure client;
  String payload;
  client.setInsecure();
  client.connect(timezoneServer.c_str(), 443);
  http.begin(client, timezoneServer);
  int httpCode = http.GET();
  if (httpCode == 200) {
    payload = http.getString();
    String sign = payload.substring(0, 1);
    int hours = payload.substring(1, 3).toInt();
    float minutes = payload.substring(3, 5).toFloat();
    timeOffset = int((hours + minutes / 60) * 3600);
    if (sign == "-") { timeOffset = -timeOffset; }
    DEBUG_SERIAL.println("INFO: Successfully detected NTP timeOffset " + String(timeOffset) + " (GTM " + payload + ") from public IP.");
  } else {
    DEBUG_SERIAL.println("WARNING: Failed to detect NTP timeOffset from public IP. Defaulting to Germany. Http Error Code: " + String(httpCode));
  }
  http.end();
  return (timeOffset);
}

void printColorIds() {  //debug
  for (int i = 0; i < maxNumberOfTasksPerDay; i++) {
    DEBUG_SERIAL.println("colorIds[" + String(i) + "] = " + String(colorIds[i]));
  }
}

void incrementColorId() {
  int numberOfTasks = 0;
  for (int i = 0; i < maxNumberOfTasksPerDay; i++) {  //detect how many tasks
    if (colorIds[i] != -1) { numberOfTasks++; }
  }
  colorIndex++;
  if (colorIndex >= numberOfTasks) { colorIndex = 0; }
  //  DEBUG_SERIAL.println("colorIndex = " + String(colorIndex) + ", numberOfTasks = " + String(numberOfTasks) + ", maxNumberOfTasksPerDay = " + String(maxNumberOfTasksPerDay));
}

void setBrightness(int blinkSpeed = 20, boolean reset = false) {
  if (reset) {
    brightness = 255;
  } else {
    if ((colorIds[0] != colorIdsLast[0]) || (colorIds[1] != colorIdsLast[1])) { brightness = 255; }
    colorIdsLast[0] = colorIds[0];
    colorIdsLast[1] = colorIds[1];
  }
  leds[0].fadeLightBy(brightness);
  brightness = brightness + fadeAmount;
  if (brightness <= 0) { brightness = 0; }
  if (brightness >= 255) {
    brightness = 255;
    incrementColorId();
  }
  //    DEBUG_SERIAL.println("Brightness = " + String(brightness) + ", ColorIndex = " + String(taskId));
  if (brightness <= 0 || brightness >= 255) { fadeAmount = -fadeAmount; }
  delay(blinkSpeed);
}

void setTaskColor() {
  if (colorIds[0] == -1) {
    //    DEBUG_SERIAL.println("No Event");
    leds[0] = CRGB::Black;
  } else {
    // EVENT
    //    DEBUG_SERIAL.println("Event: " + task[taskId] + " => LED = " + String(color[taskId],HEX));
    leds[0] = color[colorIds[colorIndex]];
    setBrightness();
  }
  FastLED.show();
}

void setColor(int color, boolean fade = true, int blinkSpeed = 20) {
  leds[0] = color;
  if (fade) { setBrightness(blinkSpeed); }
  FastLED.show();
}

void handleLed(unsigned int nowEpoch) {
  unsigned int dictEpoch;
  boolean futureDatesExist = false;
  memset(colorIds, -1, sizeof(colorIds));
  //  printColorIds();
  for (int i = 0; i < numberOfEpochs; i++) {  //numberOfEpochs is initialized in function initDateFromFile()
    dictEpoch = epochTaskDict[i].epoch;
    if ((nowEpoch > dictEpoch + (startHour - 24) * 60 * 60) && (nowEpoch < dictEpoch + endHour * 60 * 60)) {
      //DEBUG_SERIAL.println("nowEpoch: " + String(nowEpoch) + ", dictEpoch = " + String(dictEpoch) + ", dictEpoch+startTime = " + String(dictEpoch + (startHour - 24) * 60 * 60) + ", dictEpoch+endTime = " + String(dictEpoch + endHour * 60 * 60) + ", acknowlegde = " + String(acknowledge));
      if (dictEpoch != triggerEpoch) {
        acknowledge = 0;  //acknowledge only valid for same triggerEpoch
        colorIndex = 0;
        DEBUG_SERIAL.println("Resetting since new trigger!");
      }
      triggerEpoch = dictEpoch;
      if (!acknowledge) { setColorIds(epochTaskDict[i].taskIds); }
    }
    if (nowEpoch <= dictEpoch) { futureDatesExist = true; }
  }
  if (numberOfEpochs > 0) {
    if (futureDatesExist) {
      //printColorIds();
      setTaskColor();
    } else {  //no more future dates exists
      setColor(CRGB::Purple, true, 2);
    }
  } else {
    setColor(CRGB::Purple, false);  //no dates stored yet
  }
}

boolean isValidTask(int taskId) {
  for (int i = 0; i < numberOfValidTaskIds; i++) {
    if (taskId == validTaskId[i]) { return (true); }
  }
  return (false);
}

void setColorIds(int taskIds[]) {
  int index = 0;
  //  DEBUG_SERIAL.println("==================");
  for (int i = 0; i < maxNumberOfTasksPerDay; i++) {
    //    DEBUG_SERIAL.println("taskId[" + String(i) + "] = " + String(int(taskIds[i])) + ", valid = " + String(isValidTask(taskIds[i])));
    if (taskIds[i] != -1) {
      //DEBUG_SERIAL.println("taskId = " + String(taskIds[i]));
      if (isValidTask(taskIds[i])) { colorIds[index++] = int(taskIds[i]); }
    }
  }
}

void handleReed() {
  reed.update();
  initialized = true;
}

void setAcknowledge() {
  unsigned long now = millis();
  if (initialized) {
    DEBUG_SERIAL.println("OFF - Acknowedge!");
    acknowledge = 1;
    //Multi-click detection
    switchCounter++;
    if (((now - lastSwitchMillis) > multiClickTimeout) || (lastSwitchMillis == 0)) { switchCounter = 0; }
    //    DEBUG_SERIAL.println("Counter = " + String(switchCounter));
    lastSwitchMillis = now;
    if (switchCounter == 2) {
      if (STATE == STATE_DEMO) {
        millisLast = now;
        STATE_NEXT = STATE_SHOW;  //reset
      } else {
        STATE_NEXT = STATE_DEMO;
      }
      acknowledgeBlink();
    }
  }
}

void acknowledgeBlink() {
  setColor(CRGB::Purple, false);
  delay(200);
  setColor(CRGB::Black, false);
}

void doNothing() {
  //DEBUG_SERIAL.println("ON");
  true;
}

/// Splash Screen
void rainbow() {
  // FastLED's built-in rainbow generator
  fill_rainbow(leds, NUM_LEDS, gHue, 7);
}

void rainbowWithGlitter() {
  // built-in FastLED rainbow, plus some random sparkly glitter
  rainbow();
  addGlitter(50);
}

void addGlitter(fract8 chanceOfGlitter) {
  if (random8() < chanceOfGlitter) {
    leds[random16(NUM_LEDS)] += CRGB::White;
  }
}

#include "webserver.h"  //separate file for webserver functions

/* //DEBUG
boolean initDataFromFile() {
  numberOfValidTaskIds = 4;
  validTaskId[0] = 0;
  validTaskId[1] = 1;
  validTaskId[2] = 2;
  validTaskId[3] = 3;
  numberOfTaskIds = 4;
  task[0] = "Biomüll";
  task[1] = "Papier";
  task[2] = "Restmüll";
  task[3] = "Wertstoffe";
  color[0] = 0x00FF00;
  color[1] = 0x0000FF;
  color[2] = 0xFFFFFF;
  color[3] = 0xFFFF00;
  numberOfEpochs = 2;
  epochTask entry0 = {.epoch = 1674000000, .taskIds = {2,1,-1,-1} };
  epochTaskDict[0] = entry0;
  epochTask entry1 = {.epoch = 1674518400, .taskIds = {0,-1,-1,-1} };
  epochTaskDict[1] = entry1;
  return (true);
}
*/
void setDemoConfig() {
  acknowledge = 0;  //acknowledge only valid for same triggerEpoch
  colorIndex = 0;
  demoCurrTask = 0;
  numberOfValidTaskIds = 4;
  validTaskId[0] = 0;
  validTaskId[1] = 1;
  validTaskId[2] = 2;
  validTaskId[3] = 3;
  numberOfTaskIds = 4;
  task[0] = "Restmüll";
  task[1] = "Wertstoffe";
  task[2] = "Biomüll";
  task[3] = "Papier";
  color[0] = 0xFFFFFF;
  color[1] = 0xFFFF00;
  color[2] = 0x00FF00;
  color[3] = 0x0000FF;
  demoTaskDict[0] = { .epoch = 0, .taskIds = { 0, -1, -1, -1 } };  //Rest
  demoTaskDict[1] = { .epoch = 1, .taskIds = { 1, -1, -1, -1 } };  //Gelber Sack
  demoTaskDict[2] = { .epoch = 2, .taskIds = { 2, -1, -1, -1 } };  //Bio
  demoTaskDict[3] = { .epoch = 3, .taskIds = { 3, -1, -1, -1 } };  //Papier
  demoTaskDict[4] = { .epoch = 4, .taskIds = { 2, 3, -1, -1 } };   //Papier, Bio
  memset(colorIds, -1, sizeof(colorIds));
  setColorIds(demoTaskDict[demoCurrTask].taskIds);
}

void handleState() {
  unsigned long millisNow = millis();
  STATE_NEXT = -1;
  // DEBUG_SERIAL.println("STATE = " + stateTbl[STATE] + ", STATE_PREVIOUS = " + stateTbl[STATE_PREVIOUS]);
  if (STATE != STATE_PREVIOUS) { DEBUG_SERIAL.println("STATE = " + stateTbl[STATE]); }
  switch (STATE) {
    case STATE_SHOW:  //***********************************************************
      rainbowWithGlitter();
      FastLED.show();
      // insert a delay to keep the framerate modest
      FastLED.delay(1000 / FRAMES_PER_SECOND);
      // do some periodic updates
      EVERY_N_MILLISECONDS(20) {
        gHue++;
      }  // slowly cycle the "base color" through the rainbow
      if ((millisNow - millisLast) > showDuration) {
        setColor(CRGB::Black, false);
        if (STATE_FOLLOWING != -1) {
          STATE_NEXT = STATE_FOLLOWING;
          STATE_FOLLOWING = -1;
        } else {
          STATE_NEXT = STATE_INIT;
        }
      }
      break;
    case STATE_INIT:  //***********************************************************
      millisLast = millisNow;
      brightness = 255;
      colorIndex = 0;
      acknowledge = 0;
      memset(colorIds, -1, sizeof(colorIds));
      memset(colorIdsLast, -1, sizeof(colorIdsLast));
      //      listDir("/"); //ToDo1
      initSettingsFromFile();  //initializes startHour and endHour
      initDataFromFile();
      nowEpoch = getDominantTimeEpoch(3);  //making sure that the very first time stamp is correct
      STATE_NEXT = STATE_QUERY;
      break;
    case STATE_DISCONNECTED:  //***********************************************************
      setColor(CRGB::Red, true, 2);
      if (WiFi.isConnected()) { STATE_NEXT = STATE_QUERY; }
      break;
    case STATE_QUERY:  //***********************************************************
      if (((millisNow - lastQueryMillis) > queryIntervall) || (lastQueryMillis == 0)) {
        nowEpoch = getCurrentTimeEpoch(millisNow);
        DEBUG_SERIAL.println("Received current epoch time: " + String(nowEpoch));
        lastQueryMillis = millisNow;
        //Serial.println("Free Heap: " + String(ESP.getFreeHeap()));
      }
      handleLed(nowEpoch);
      handleReed();
      handleConnection();
      if (!serverRunning) { startWebServer(); }
      server.handleClient();
      break;
    case STATE_DEMO:  //***********************************************************
      if (STATE_PREVIOUS != STATE_DEMO) {
        DEBUG_SERIAL.println("Setting Demo Config");
        acknowledge = 0;
        setDemoConfig();
      }
      if (!acknowledge) {
        setTaskColor();
      } else {
        setColor(CRGB::Black, false);
      }
      if (acknowledge && ((millisNow - lastSwitchMillis) > offDuration)) {
        demoCurrTask++;
        colorIndex = maxNumberOfTasksPerDay;
        if (demoCurrTask >= demoNumberOfTasks) { demoCurrTask = 0; }
        DEBUG_SERIAL.println("Setting demoCurrTask = " + String(demoCurrTask));
        memset(colorIds, -1, sizeof(colorIds));
        setColorIds(demoTaskDict[demoCurrTask].taskIds);
        acknowledge = 0;
      }
      handleReed();
      if (!serverRunning) { startWebServer(); }
      server.handleClient();
      break;
    default:
      break;
  }
  STATE_PREVIOUS = STATE;
  if (STATE_NEXT != -1) { STATE = STATE_NEXT; }
}
