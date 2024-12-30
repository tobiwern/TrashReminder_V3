//setInterval(function(){getData();}, 2000);
function require(script) {
    $.ajax({
        url: script,
        dataType: "script",
        async: false,           // <-- This is the key
        success: function () {
            // all good...
        },
        error: function () {
            throw new Error("Could not load script " + script);
        }
    });
}
//require("./colorPicker/colorPick.js");
var gMaxNumberOfEpochs;
var gMaxNumberOfTasksPerDay;
var gMaxNumberOfTaskIds;
var gHideDelayDefault = 3;

function acknowledge(value) {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
//        statusBarMessage("I", "Erinnerung ausgeschaltet!", gHideDelayDefault);
        gAcknowledge = (this.responseText == "1"?true:false);
        refreshTaskDates();
        refreshTabs();
      }
    };
    xhttp.open("GET",  "acknowledge?value=" + value, true);
    xhttp.send();
}

function fireworks() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            statusBarMessage("I", "FEUERWERK!", gHideDelayDefault);
        }
    };
    xhttp.open("GET", "fireworks", true);
    xhttp.send();
}

gDemo = false;
function toggleDemo() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            if(this.responseText == "DemoOn"){
                statusBarMessage("I", "Demo Mode gestartet!" , gHideDelayDefault);
                gDemo = true;
                document.getElementById("demoButton").innerHTML = "Demo Mode beenden";
            } else {
                statusBarMessage("I", "Demo Mode beendet!" , gHideDelayDefault);
                document.getElementById("demoButton").innerHTML = "Demo Mode starten";
                gDemo = false;
            }
        }
    };
    xhttp.open("GET", "toggle_demo", true);
    xhttp.send();
//    document.getElementById("body").innerHTML = "<h1>Demo Mode!</h1>";
//    window.scrollTo(0, 0);
}

function addFavicon() {
    document.title = "Trash Reminder"
//    $favicon = document.createElement("link")
//   $favicon.rel = "icon"
//    $favicon.type = "image/png"
//    $favicon.href = "https://tobiwern.github.io/TrashReminder_V3/favicon.ico"
//    document.head.appendChild($favicon)
    $shortcut = document.createElement("link")
    $shortcut.rel = "apple-touch-icon"
    $shortcut.href = "https://tobiwern.github.io/TrashReminder_V3/apple-touch-icon.png"
    $shortcut.sizes = "180x180"
    document.head.appendChild($shortcut)
    $shortcut1 = document.createElement("link")
    $shortcut1.rel = "icon"
    $shortcut1.type = "image/png"
    $shortcut1.href = "https://tobiwern.github.io/TrashReminder_V3/favicon-32x32.png"
    $shortcut1.sizes = "32x32"
    document.head.appendChild($shortcut1)
    $shortcut2 = document.createElement("link")
    $shortcut2.rel = "icon"
    $shortcut2.type = "image/png"
    $shortcut2.href = "https://tobiwern.github.io/TrashReminder_V3/favicon-16x16.png"
    $shortcut2.sizes = "16x16"
    document.head.appendChild($shortcut2)
    $shortcut3 = document.createElement("link")
    $shortcut3.rel = "manifest"
    $shortcut3.href = "https://tobiwern.github.io/TrashReminder_V3/site.webmanifest"
    document.head.appendChild($shortcut3)
    $shortcut4 = document.createElement("link")
    $shortcut4.rel = "mask-icon"
    $shortcut4.color = "#5bbad5"
    $shortcut4.href = "https://tobiwern.github.io/TrashReminder_V3/safari-pinned-tab.svg"
    document.head.appendChild($shortcut4)
    $shortcut5 = document.createElement("meta")
    $shortcut5.name = "msapplication-TileColor"
    $shortcut5.content = "#da532c"
    document.head.appendChild($shortcut5)
    $shortcut6 = document.createElement("meta")
    $shortcut6.name = "theme-color"
    $shortcut6.content = "#ffffff"
    document.head.appendChild($shortcut6)
}

function restartTrashReminder() {
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            statusBarMessage("I", "TrashReminder wurde neu gestartet!", gHideDelayDefault);
//            statusBarMessage("I", "Erinnerung wieder eingeschaltet!", gHideDelayDefault);
            refreshTaskDates();
            refreshTabs();
        }
    };
    xhttp.open("GET", "close", true);
    xhttp.send();
}

function closeConfig() {
    restartTrashReminder();
    document.getElementById("body").innerHTML = "<h1>Beendet - Bitte Fenster schließen!</h1>";
    window.scrollTo(0, 0);
    //  window.close(); //close the page
}

function requestLogFromESP() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      if(this.responseText == "empty"){
        statusBarMessage("I", "Logfile ist leer.", gHideDelayDefault); 
      } else {
        var message = this.responseText.replaceAll("\n", "<br>");  
        statusBarMessage("I", message); //show continuous
      }
      
    }
  };
  xhttp.open("GET", "request_log", true);
  xhttp.send();
}

function deleteLogOnESP() {
    const response = confirm("Willst Du das Logfile wirklich löschen?");
    if (!response) {
        statusBarMessage("I", "Löschen des Logfiles abgebrochen.", gHideDelayDefault);
        return;
    }
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
      if (this.readyState == 4) {
        if (this.status == 200) {
          statusBarMessage("I", "Logfile gelöscht.", gHideDelayDefault);   
        } else { //500
          statusBarMessage("W", "Löschen des Logfiles fehlgeschlagen!", gHideDelayDefault); 
        }      
      }
    };
    xhttp.open("GET", "delete_log", true);
    xhttp.send();
}

var gNtpServer;
var gTimezoneServer;
var gTimeOffset;
var gLanguage = "de";
function requestSettingsFromESP() {
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      //populate options

      const dropdowns = ["start", "end"];
      dropdowns.forEach(function (item) {
        document.getElementById(item).innerHTML = "";
        for (var i = 0; i <= 23; i++) {
          var el = document.createElement("option");
          el.textContent = i + " Uhr";
          el.value = i;
          document.getElementById(item).appendChild(el);
        }
      });
      value = this.responseText;
      tokens = value.split(",");
      document.getElementById("start").value = tokens[0];
      document.getElementById("end").value = tokens[1];
      // document.addEventListener('DOMContentLoaded', function () {
      //     enableEventListener('start');
      //     enableEventListener('end');
      // });
      // function enableEventListener(dropdown) {
      //     document.getElementById(dropdown).addEventListener('change', function () { sendDropDownStateToESP(dropdown); });
      // }
      gMaxNumberOfEpochs = tokens[2];
      gMaxNumberOfTasksPerDay = tokens[3]; //tasks per day
      gMaxNumberOfTaskIds = tokens[4]; //different tasks
      gNtpServer = tokens[5]; 
      refreshNtpServer();
      gTimezoneServer = tokens[6]; 
      refreshTimezoneServer();
      gTimeOffset = tokens[7];
      refreshtimeOffset();
      gShowPastDates = (tokens[8]==1?true:false);
      refreshShowPastDates();
      gLanguage = tokens[9];
      gAcknowledge = (tokens[10]==1?true:false);
console.log("gNtpServer = " + gNtpServer + ", gTimezoneServer = " + gTimezoneServer + ", gTimeOffset = " + gTimeOffset + ", gShowPastDates = " + gShowPastDates + ", language = " +  gLanguage + ", acknowledge = " + gAcknowledge);  
      refreshTaskDates();
      refreshTabs();
    }
  };
  xhttp.open("GET", "request_settings", true);
  xhttp.send();
}

function requestTasksFromESP(show = true) { //send the ESP data to the webpage
  var xhttp = new XMLHttpRequest();
  blockAction();
  xhttp.onreadystatechange = function () {
    allowAction();
    if (this.readyState == 4) {
      response = this.responseText;
      gInitialized = true;
      if (this.status == 200) {
//console.log("response = " + response);
//        gNoDates = false; //not required since gets updated refreshTaskDates
        refreshTaskTypesAndDates(response);
      } else { //500
        showMessage("W", "Es sind noch keine Abfuhrtermine auf \"TrashReminder\" gespeichert!", "messageTaskTypes");
        if (show) { statusBarMessage("E", "Lesen der Daten fehlgeschlagen!", gHideDelayDefault); }
        document.getElementById("taskTypes").innerHTML = "";
        document.getElementById("taskDates").innerHTML = "";
        gNoDates = true;
        refreshTabs();
      }        
    }
  };
  xhttp.open("GET", "request_tasks", true);
  xhttp.send();
}

function sendTasksToESP(jsonText, currentData = false) { //send the jsonText to the ESP to be stored in LittleFS
  if (currentData) {
    message = "Neue Auswahl gespeichert.";
    hideDelay = 2;
  } else {
    message = "Übertragung der Daten war erfolgreich.";
    hideDelay = 5;
  }
  console.log("jsonText = " + jsonText);
  var xhttp = new XMLHttpRequest();
  blockAction();
  xhttp.onreadystatechange = function () {
    allowAction();
    if (this.readyState == 4) {
      if (this.status == 200) {
        statusBarMessage("I", message, hideDelay);
      } else { //500
        statusBarMessage("E", "ERROR: Übertragen der Daten fehlgeschlagen!", gHideDelayDefault);
      }
    }
  };
  xhttp.open("GET", "send_tasks?value=" + jsonText, true);
  xhttp.send();
}

function sendValidTaskTypesToESP() {
    const taskTypeCheckBoxes = document.getElementsByClassName("taskType");
    var validTaskIds = [];
    for (let i = 0; i < taskTypeCheckBoxes.length; i++) {
      var checkBox = taskTypeCheckBoxes[i];
      if (checkBox.checked) {
        validTaskIds.push(i);
      }
    }
    if (validTaskIds.length == 0) {
      statusBarMessage("W", "Es muss mindestens eine Abfallart ausgewählt sein!");
      return;
    }
    gDataValidTaskIds = validTaskIds; //update in global Setup
    sendCurrentDataToESP(); //send updated data
}

function promptForTaskTypeCombine(){
  const taskTypesDescFields = document.getElementsByClassName("taskType_desc");
  taskTypes = [];
  for (taskType of taskTypesDescFields) {//get list of values
    taskTypes.push(taskType.value);
  }
  //detect duplicates in the description fields
  const duplicates = taskTypes.filter((item, index) => taskTypes.indexOf(item) !== index);
  //detect mismatches
  var mismatches = [];
  for (taskType of gDataTasks) {
    if(!taskTypes.includes(taskType)){
      mismatches.push(taskType)
    }
  }

  if(duplicates.length > 0){ //means combining entries
    const response = confirm("Willst Du \"" + mismatches[0] + "\" mit der bestehenden Abfallart \"" + duplicates[0] + "\" zusammenführen?\n(Diese Änderung kann nicht mehr rückgängig gemacht werden.)");
    if(response){
      return([mismatches[0],duplicates[0]]);
    } else {
      var index = gDataTasks.indexOf(mismatches[0]);
      document.getElementById("taskType_desc" + index).value = mismatches[0]; //reset field value 
      return([]);
    }
  }
  return([mismatches[0]]);
}

function sendTaskDescriptionToESP() {
  [oldValue, newValue] = promptForTaskTypeCombine();
  if(!oldValue){return(null);}

  //read text fields (in case user modfified task name)
  var tasks = [];
  var colors = [];
  var renameIds = {};
//  var validTaskIds = []; //will be needed when combining task names
  console.log("Before: gDataTasks = " + JSON.stringify(gDataTasks));
  const taskTypes = document.getElementsByClassName("taskType_desc");
  for (let i = 0; i < taskTypes.length; i++) {
    var task = document.getElementById("taskType_desc" + i).value;
    if (!tasks.includes(task)){
      tasks.push(task);
      colors.push(gDataColors[i]);
//      if (document.getElementById("task" + i).checked) {
//        validTaskIds.push(i);
//      }
    } else {
      renameIds[i] = tasks.indexOf(task);
    }    
  } //for
  console.log("tasks = " + tasks + ", renameIds = " + JSON.stringify(renameIds));
  //renaming taskIds if required
  console.log("Before: gDataEpochTaskDict = " + JSON.stringify(gDataEpochTaskDict));
  if(Object.keys(renameIds).length > 0){
    var epochs = Object.keys(gDataEpochTaskDict).sort();
    for (epoch of epochs) {
      taskIds = gDataEpochTaskDict[epoch];
      var newTaskIds = [];
      for (taskId of taskIds){ //iterate over values (not keys) => of
        for(renameId of Object.keys(renameIds)){ //iterate over keys (not values) => in
          if (taskId == renameId) {
            let newId = renameIds[renameId];
            if (!newTaskIds.includes(newId)){newTaskIds.push(newId);}
          } else if(taskId >= tasks.length){ //correct larger IDs
            let newId = taskId-1;
            if (!newTaskIds.includes(newId)){newTaskIds.push(newId);}
          } else {
            newTaskIds.push(taskId);
          }
        } //for        
      } //for
      gDataEpochTaskDict[epoch] = newTaskIds;
    }
  }
  console.log("After: gDataEpochTaskDict = " + JSON.stringify(gDataEpochTaskDict));

  //correct gDataValidTasks 
//  for(taskId of getValidTaskIds){
//    if(taskId < tasks.length){
//      validTaskIds.push(taskId);
//    }
//  }

//  gDataValidTaskIds = validTaskIds;
  gDataTasks = tasks;  
  gDataColors = colors;
  refreshTaskTypes();
  sendCurrentDataToESP(); //send updated data
}

function sendDropDownStateToESP(dropdown) {
    var value = parseInt(document.getElementById(dropdown).value);
    var xhttp = new XMLHttpRequest();
    blockAction();
    xhttp.onreadystatechange = function () {
      allowAction();
      if (this.readyState == 4 && this.status == 200) {
            response = this.responseText;
            if(response == "start"){
              var message = "Neuer Startzeitpunkt gespeichert.";
            } else { //end
              var message = "Neuer Endzeitpunkt gespeichert.";
            }
            statusBarMessage("I", message, gHideDelayDefault);
            refreshTaskDates();
            requestSettingsFromESP();
        }
    };
    if (dropdown == "start") {
        var endValue = parseInt(document.getElementById("end").value)
        if (value < endValue) {
            var newValue = endValue + 1;
            alert("Um überlappende Ereignisse an Folgetagen zu vermeiden, sollte der \"Start der Erinnerung\" (" + value + ") nicht vor dem \"Ende der Erinnerung\" (" + endValue + ") liegen!\nSetze \"Start der Erinnerung\" auf minimal zulässigen Wert (" + newValue + ").");
            value = newValue
            document.getElementById(dropdown).value = value
        }
    } else {
        var startValue = parseInt(document.getElementById("start").value)
        if (startValue < value) {
            newValue = startValue - 1;
            alert("Um überlappende Ereignisse an Folgetagen zu vermeiden, sollte der \"Start der Erinnerung\" (" + startValue + ") nicht vor dem \"Ende der Erinnerung\" (" + value + ") liegen!\nSetze \"Ende der Erinnerung\" auf maximal zulässigen Wert (" + newValue + ").");
            value = newValue;
            document.getElementById(dropdown).value = value
        }
    }
    xhttp.open("GET", "set_" + dropdown + "?value=" + value, true);
    xhttp.send();
}

function deleteTasksOnESP() {
  const response = confirm("Willst Du wirklich alle Abfuhrtermine von \"TrashReminder\" löschen?");
  if (!response) {
    statusBarMessage("I", "Löschen der Daten abgebrochen.", gHideDelayDefault);
    return;
  }
  var xhttp = new XMLHttpRequest();
  blockAction();
  xhttp.onreadystatechange = function () {
    allowAction();
    if (this.readyState == 4) {
      if (this.status == 200) {
        statusBarMessage("I", "Löschen der Daten war erfolgreich!", gHideDelayDefault);
        gNoDates = true;
        gAlarm = false;
        gFutureDates = 0;
        gEpochTaskDict = {};
        gDataEpochTaskDict = {};
        gDataTasks = {};
        gDataValidTaskIds = {};
        requestTasksFromESP(false); //ToDo: better delete data locally - if deleting the values on the ESP was successful => refresh the "current values" on the webpage
        document.getElementById("taskDates").innerHTML = "";
        refreshTabs();
      } else { //500
        statusBarMessage("E", "ERROR: Löschen der Daten fehlgeschlagen!", gHideDelayDefault);
      }
    }
  };
  xhttp.open("GET", "delete_tasks", true);
  xhttp.send();
}

function resetWifiSettingsOnESP() {
    const response = confirm("Willst Du die WLAN Einstellungen wirklich löschen?");
    if (!response) {
        statusBarMessage("I", "Löschen der WLAN Einstellungen abgebrochen.", gHideDelayDefault);
        return;
    }
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
            if (this.status == 200) {
                statusBarMessage("I", "Löschen der WLAN Einstellungen war erfolgreich!", gHideDelayDefault);
//                requestTasksFromESP(false); //if deleting the values on the ESP was successful => refresh the "current values" on the webpage
            } else { //500
                statusBarMessage("E", "ERROR: Löschen der WLAN Einstellungen fehlgeschlagen!", gHideDelayDefault);
            }
        }
    };
    xhttp.open("GET", "reset_wifi_settings", true);
    xhttp.send();
    closeConfig();
}

/// WebPage Refresh Functions for CURRENT Data on ESP
//globally defined for form field callbacks
var gDataEpochTaskDict = {};
var gDataColors = [];
var gDataTasks = [];
var gDataValidTaskIds = [];
var gAlarm = false;
var gAcknowledge = false;
var gShowPastDates = false;
var gNoDates = true;
var gFutureDates = 0;
var gInitialized = false;

function initDataFromJson(jsonObject) {
  gDataEpochTaskDict = {}; //reset global variable
  var epochTasks = jsonObject["epochTasks"];
  for (const epochTask of epochTasks) {
    for (var epoch in epochTask) { //translate into dict
      gDataEpochTaskDict[epoch] = epochTask[epoch];
    }
  }
  gDataColors = jsonObject["colors"];
  gDataTasks = jsonObject["tasks"];
  gDataValidTaskIds = jsonObject["validTaskIds"];
}

function sendCurrentDataToESP() { //send currently set data to ESP
    var entries = [];
    var epochs = Object.keys(gDataEpochTaskDict);
    for (epoch of epochs) {
        taskIds = gDataEpochTaskDict[epoch];
        entries.push('{"' + epoch + '":[' + taskIds.join(',') + ']}');
    }
    var jsonText = '{"tasks":["' + gDataTasks.join('","') + '"],"colors":["' + gDataColors.join('","') + '"],"validTaskIds":[' + gDataValidTaskIds.join(',') + '],"epochTasks":[' + entries.join(',') + ']}';
    console.log(jsonText);
    try {
        const obj = JSON.parse(jsonText); //just to check if valid JSON, ToDo: Show if there is an error!
        sendTasksToESP(jsonText, true);
    } catch (e) {
        statusBarMessage("E", "<em>Die Daten sind nicht korrekt als JSON formatiert. Bitte öffne ein <a href='https://github.com/tobiwern/TrashReminder_V3/issues' target='_blank'>GitHub Issue</a></em>");
        return;
    }
}

function refreshTaskTypesAndDates(response) {
    try {
        const jsonObject = JSON.parse(response);
        document.getElementById("taskDates").style.color = "black";
        document.getElementById("messageTaskTypes").innerHTML = "";
        gDataEpochTaskDict = {}; //reset
        initDataFromJson(jsonObject);
        refreshTaskTypes();
        refreshTaskDates();
        refreshTabs();
    } catch (e) {
        statusBarMessage("E", "Die Daten sind nicht korrekt als JSON formatiert. Bitte öffne ein <a href='https://github.com/tobiwern/TrashReminder_V3/issues' target='_blank'>GitHub Issue</a>.<br>ERROR: " + e);
        document.getElementById("taskDates").innerHTML = response;
        return;
    }
}

function refreshTaskTypes() {
    var text = "Du wirst an folgende Abfallarten erinnert:<br><br>";
    text += "<table>";
//console.log("RefreshTaskTypes: gDataTasks.length = " + gDataTasks.length);    
    for (let i = 0; i < gDataTasks.length; i++) {
        checked = (gDataValidTaskIds.length == 0 || gDataValidTaskIds.includes(i)) ? "checked" : "";
        text += "<tr>"
        text += "<td class='checkbox'><input type='checkbox' class='taskType' onChange='refreshTaskDates();sendValidTaskTypesToESP();' id='taskType" + i + "' name=task" + i + "' " + checked + "></td>";
        text += "<td><input type='text' class='taskType_desc' id='taskType_desc" + i + "' value='" + gDataTasks[i] + "' size='30' onfocusout='sendTaskDescriptionToESP();refreshTaskDates();'></td>";
        text += "<td><div class='colorPickSelector' id='colorPickerTask" + i + "'></div></td>";
        text += "</tr>";
    }
    text += "</table>";
    text += "<br><em>Setze einen Haken für die Abfallarten an die Du erinnert werden willst. Es kann die Bezeichnung der Abfallart angepasst und die Farbe des Warnlichts durch klicken auf das Farbkästchen ausgewählt werden.<br></em>"
    document.getElementById("taskTypes").innerHTML = text + "<br>";
    document.getElementById("messageTaskTypes").innerHTML = "";
    refreshColorPickerColors("colorPickerTask");
}

function refreshTaskDates() { //show TaskDates on Webpage 
  var text = "";
  text += "<div id='futureDates'></div>";
  var epochs = Object.keys(gDataEpochTaskDict).sort();
  text += "<table id=epochTasks>"
  text += "<tr><th>Datum der Abholung</th><th>Müllart</th></tr>"
  const taskTypeCheckBoxes = document.getElementsByClassName("taskType");
  taskIdEnableValue = [];
  for (checkBox of taskTypeCheckBoxes) {
    taskIdEnableValue.push(checkBox.checked);
  }
  var nowEpoch = Date.now();
  var startHour = parseInt(document.getElementById("start").value);
  var endHour = parseInt(document.getElementById("end").value);
//  var timeOffset = Date.getTimezoneOffset/60;
  var timeOffset = parseFloat(document.getElementById("timeOffset").value);
  if(timeOffset == NaN){timeOffset=0.0;}
  gAlarm = false;
  gFutureDates = 0;
  gNoDates = true;
  for (const epoch of epochs) {  //epoch in seconds
    gNoDates = false;
    var dictEpoch = new Date(epoch * 1000); //Date uses miliseconds
    var taskIds = gDataEpochTaskDict[epoch];
    selectedTaskIds = [];
    for (const taskId of taskIds) {
      if (taskIdEnableValue[taskId]) {
        selectedTaskIds.push(taskId);
      }
    }
    var show = true;
    futureDate = false;
    if (dictEpoch.valueOf()+endHour*60*60*1000 > nowEpoch) { style = "color: black;"; futureDate=true;} else { style = "color: lightgrey;"; show = gShowPastDates;} 
    if ((selectedTaskIds.length >= 1) && show) {
      if (nowEpoch > dictEpoch.valueOf()+(startHour-24-timeOffset)*60*60*1000  && nowEpoch < dictEpoch.valueOf()+(endHour-timeOffset)*60*60*1000) { gAlarm = true; style = "color: #4CAF50; font-weight: bold;"; if(!gAcknowledge){style += " animation: blinker 1s linear infinite;"; }}
      if(futureDate){gFutureDates++;}
      text += "<tr>"
      text += "<td class=description nowrap style='" + style + "'>" + epochToDateString(epoch) + "</td>";
      text += "<td style='" + style + "'>";
      for (const taskId of selectedTaskIds) {
        text += "<div class=taskTypeTbl><div style='background-color: " + gDataColors[taskId].replace("0x", "#") + ";border: 2px solid grey;padding: 10px 10px;display: inline-block;'></div>";
        text += " " + gDataTasks[taskId] + "</div>";
      }
      text += "</td>";
      text += "</tr>";
    }
  }
  text += "</table>";
  document.getElementById("taskDates").innerHTML = text;
  document.getElementById("futureDates").innerHTML = gFutureDates + " Abfuhrtermine stehen noch an.<br><br>";
/* TODO
  <table>
  <tr><td><input type='checkbox' id="showPastDates" onchange='handleShowPastDates()'><label for="showPastDates">Vergangene Termine anzeigen</label></td></tr>
  </table><br>
  </br>
  */
}

/// ICS/iCAL Processing ////////////////////////////////////////////////////////////////////
var gDebug = false;
var gTasks = [];
var gEpochTaskDict = {};                       //HÄCKSEL
var gColorDict = { 'PAPIER': '0x0000FF', 'BIO,CKSEL': '0x00FF00', 'GELB,WERT': '0xFFFF00', 'REST': '0xFFFFFF' }
var gColorDefault = '0xFFC0CB';
var gColors = [];
var gImportPastDates = false;
function processFiles() {
  gEpochTaskDict = getFutureTasks(); //prompts user in case of existing future tasks, gTasks is also set internally 
  var nowEpoch = Date.now()/ 1000; //since ms => s
  var files = document.getElementById('files').files;
  for (var fileIndex = 0; fileIndex < files.length; fileIndex++) {
    var file = files[fileIndex];
    var reader = new FileReader();
    reader.onload = function (progressEvent) {
      const text = this.result; //entire file
      var lines = text.split('\n');
      for (const line of lines) {
        if (line.search("DTSTART") != -1) {
          var date = line.split(":")[1];
          dateString = date.substring(0, 4) + "-" + date.substring(4, 6) + "-" + date.substring(6, 8);
          var epoch = new Date(dateString).getTime() / 1000; //since ms => s
        } else if (line.search("SUMMARY") != -1) {
          var task = line.split(":")[1];
          task = task.replace("\\", "");
          task = task.replace("\r", "");
        } else if (line.search("END:VEVENT") != -1) {
          if(gImportPastDates || epoch > nowEpoch){
            if (!(epoch in gEpochTaskDict)) { gEpochTaskDict[epoch] = { "tasks": [], "date": dateString }; }
            var arr = gEpochTaskDict[epoch]["tasks"];
            if(!arr.includes(task)){
              arr.push(task);
              gEpochTaskDict[epoch]["tasks"] = arr;
              if (!gTasks.includes(task)) {
                gTasks.push(task);
                gColors = getColors(gTasks);
              } //if
            } //if  
          } //if
        } //if
      } //for
      gFilesLoaded = true;
      showCheckBoxes(gTasks); //executed multiple times per loaded file, however ok
      checkMaxNumberOfEntries();
      refreshTab_DATA();
    }; //on load
    reader.readAsText(file);
  } //for
}

function getFutureTasks(){ //function checks if there are still future tasks
  var futureTasks = {};
  var tasks = [];
  var nowEpoch = Date.now()/ 1000; //since ms => 
  var epochs = Object.keys(gDataEpochTaskDict);
  for (epoch of epochs) {
    if(epoch > nowEpoch){ //convert to required format
      tasks1 = getTasks(gDataEpochTaskDict[epoch]);
      for (let [index, task] of tasks1.entries()){ //update tasks list for future tasks
        if (!tasks.includes(task)) {tasks.push(task);}        
      } //for
      futureTasks[epoch] = {"tasks":tasks1, "date": epochToDateString(epoch,"short")}
    } //if
  }
  if(Object.keys(futureTasks).length != 0){
    const response = confirm("Es gibt noch ausstehende Termine! Willst Du diese beibehalten?");
    if(response){
      statusBarMessage("I", "Ausstehende Termine werden beibehalten.", gHideDelayDefault);
      gTasks = tasks;
      return(futureTasks);
    } else {
      statusBarMessage("I", "Ausstehende Termine werden überschrieben.", gHideDelayDefault);
      gTasks = [];
      return({});
    }
  } else {
    return({});  
  }
}

function getValidTaskIds() {
    var validTaskIds = [];
    for (var i = 0; i < gTasks.length; i++) {
        if (document.getElementById("task" + i).checked) {
            validTaskIds.push(i);
        }
    }
    return (validTaskIds);
}

function getTaskIds(tasks) {
    var taskIds = [];
    for (var i = 0; i < tasks.length; i++) {
        taskIds.push(gTasks.indexOf(tasks[i]));
    }
    return (taskIds);
}

function getTasks(taskIds) {
  var tasks = [];
  for (var i = 0; i < taskIds.length; i++) {
    tasks.push(gDataTasks[taskIds[i]]); //operates on g*Data*Tasks!
  }
  return (tasks);
}

function getColors(tasks) {
    var colors = [];
    for (const task of tasks) {
        var color = getMatchingColor(task);
        if (color) {
            colors.push(color);
        } else {
            alert("Failed to auto-assign color for entry " + task + ".<br>Assigning default color (pink).");
            colors.push(gColorDefault);
        }
    }
    return (colors);
}

function getMatchingColor(task) {
    var keys = Object.keys(gColorDict).sort();
    for (const key of keys) {
        var entries = key.split(",");
        for (entry of entries) {
            if (task.toUpperCase().search(entry) != -1) {
                return (gColorDict[key]);
            }
        }
    }
    return (false);
}

function genJson() {
    validTaskIds = getValidTaskIds();
//    console.log("validTaskIds = " + validTaskIds);
    var entries = [];
    var epochs = Object.keys(gEpochTaskDict);
    for (epoch of epochs) {
      var tasks = gEpochTaskDict[epoch]["tasks"];
      var taskIds = getTaskIds(tasks);
      var date = gEpochTaskDict[epoch]["date"];
      if (gDebug) {
        entries.push('{"' + epoch + '"' + ":" + '{"date":"' + date + '","tasks":["' + tasks.join('","') + '"],"taskIds":[' + taskIds.join(',') + ']}}');
      } else {
        entries.push('{"' + epoch + '":[' + taskIds.join(',') + ']}');
      }
    }
    //read text fields (in case user modfified task name)
    var tasks = [];
    for (let i = 0; i < gTasks.length; i++) {
      var task = document.getElementById("taskdesc" + i).value;
      if (!tasks.includes(task)){tasks.push(task);}
    }

    var jsonText = '{"tasks":["' + tasks.join('","') + '"],"colors":["' + gColors.join('","') + '"],"validTaskIds":[' + validTaskIds.join(',') + '],"epochTasks":[' + entries.join(',') + ']}';
    console.log(jsonText);
    try {
      var obj = JSON.parse(jsonText); //just to check if valid JSON, ToDo: Show if there is an error!
    } catch (e) {
      statusBarMessage("E", "Die Daten sind nicht korrekt als JSON formatiert. Bitte öffne ein <a href='https://github.com/tobiwern/TrashReminder_V3/issues' target='_blank'>GitHub Issue</a>");
      return;
    }
    sendTasksToESP(jsonText);
//    requestSettingsFromESP(); //to get acknowledge state
    initDataFromJson(obj);
    refreshTaskTypes();
    refreshTaskDates();
    refreshTabs();
    document.getElementById("tasks").innerHTML = ""; //deleteTaskType selection 
    document.getElementById("dates").click();
    gFilesLoaded = false;

}

function checkMaxNumberOfEntries() {
    var text = "";
    if (gTasks.length > gMaxNumberOfTaskIds) {
        text += "Anzahl der Abfallarten ist " + gTasks.length + ". Es werden maximal " + gMaxNumberOfTaskIds + " <b>unterschiedliche Abfallarten</b> unterstützt!<br>";
    }
    var epochs = Object.keys(gEpochTaskDict);
    if (epochs.length > gMaxNumberOfEpochs) {
        text += "Anzahl der Abfuhrtermine ist " + epochs.length + ". Es werden maximal " + gMaxNumberOfEpochs + " <b>Abfuhrtermine</b> unterstützt!<br>";
    }
    for (const epoch of epochs) {
        var tasks = gEpochTaskDict[epoch]["tasks"];
        var taskIds = getTaskIds(tasks);
        if (taskIds.length > gMaxNumberOfTasksPerDay) {
            text += "Anzahl der Abfallarten pro Tag am " + epochToDateString(epoch, "short") + " ist " + taskIds.length + ". Es werden maximal " + gMaxNumberOfTasksPerDay + " unterschiedliche <b>Abfallarten pro Tag</b> unterstützt!<br>";
        }
    }
    if (text != "") {
        text += "Die darüber hinausgehenden Einträge werden nicht verarbeitet.<br>Bitte öffne ein <a href='https://github.com/tobiwern/TrashReminder_V3/issues' target='_blank'>GitHub Issue</a>!";
        statusBarMessage("W", text);
    }
}

function showCheckBoxes(items) {
  var i = 0;
  if(Object.keys(gEpochTaskDict).length == 0){
    var text = "<br><i>Es wurden keine <b>zukünftigen</b> Abfuhrtermine in der Datei gefunden! Bitte lade neue Abfuhrtermine herunter!";  
    showMessage("W", text, "messageTasks");
//    document.getElementById("buttonDownload").style.display = "block"; //show button Download
    gFilesLoaded = false;
  } else {
    var text = "<i>Es wurden " + Object.keys(gEpochTaskDict).length + " Abfuhrtermine in ";
    if (document.getElementById('files').files.length > 1) {
        text += "den Dateien gefunden.</i>";
    } else {
        text += "der Datei gefunden.</i>";
    }
    text += "<br><br>";
    text += "Bitte w&auml;hle die Abfallarten aus,<br>an die Du erinnert werden willst:<br><br>";
    text += genCheckBoxes(items, gColors);
    text += "<br><button class=button onclick='genJson()'>Abfuhrtermine speichern</button><br><br>";
    document.getElementById("tasks").innerHTML = text;
    refreshColorPickerColors("colorPickerIcs");
    document.getElementById("messageStatusBar").innerHTML = "";
    showMessage("W", "", "messageTasks"); //Clear potential previous message about no future dates found in file
  }
}

function genCheckBoxes(tasks, colors, validTaskIds = []) {
    var text = "<table>";
    for (let i = 0; i < tasks.length; i++) {
        checked = (validTaskIds.length == 0 || validTaskIds.includes(i)) ? "checked" : "";
        text += "<tr class=checkBoxes>"
        text += "<td class=checkbox><input type='checkbox' id='task" + i + "' name=task" + i + "' " + checked + "></td>";
        text += "<td><input class='inputWide' type='text' id='taskdesc" + i + "' value='" + tasks[i] + "'></td>";
        text += "<td><div class='colorPickSelector' id='colorPickerIcs" + i + "'></div></td>";
        text += "</tr>";
    }
    text += "</table>";
    return (text);
}

function send(number) {//debug
    statusBarMessage("E", "Die Daten sind nicht korrekt als JSON formatiert. Bitte öffne ein GitHub Issue unter <a href='https://github.com/tobiwern/TrashReminder_V3/issues' target='_blank'>https://github.com/tobiwern/TrashReminder/issues</a>");
}

/// ColorPicker          green      blue       yellow     white      orange     pink       purple    iceblue    icegreen
var colorPickPalette = ["#00ff00", "#0000ff", "#ffff00", "#ffffff", "#ba4500", "#d5002d", "#82007e", "#5a00a6", "#00ba45"]

function refreshColorPickers() {
    $(".colorPickSelector").colorPick({
        'initialColor': '',
        'palette': colorPickPalette,
        'onColorSelected': function () {
            this.element.css({ 'backgroundColor': this.color, 'color': this.color });
            var id = this.element.attr("id");
            var index = id.match(/(\d+)/)[0]; //get the number from the string (since ID name is different)
            if (id.search("colorPickerTask") != -1) {
                gDataColors[index] = this.color.replace("#", "0x");
                refreshTaskDates();
                sendCurrentDataToESP();
            } else {
                gColors[index] = this.color.replace("#", "0x");
            }
        }
    });
}

$(document).ready(function () {
    refreshColorPickers();
});

function refreshColorPickerColors(idName) {
    refreshColorPickers();
    var color;
    var colorPickers = document.getElementsByClassName('colorPickSelector');
    for (var i = 0; i < colorPickers.length; i++) {
        if (idName == "colorPickerTask") {
            color = gDataColors[i];
        } else {
            color = gColors[i];
        }
        if (color) { $("#" + idName + i).css("background", color.replace("0x", "#")); }
    }
}

/// Utility Functions
function epochToDateString(epoch, dateType = "long") {
    var dictEpoch = new Date(epoch * 1000);
    var timeStamp = "";
    if (dateType == "long") {
        timeStamp += dictEpoch.toLocaleString("de", { weekday: "long" }) + ", ";
    }
    timeStamp += ("00" + dictEpoch.getDate()).slice(-2) + "." + ("00" + dictEpoch.toLocaleString("de", { month: "numeric" })).slice(-2) + "." + dictEpoch.getFullYear();
    return (timeStamp);
}

let timeoutID;
function showMessage(msgType, message, receiver = "messageTaskTypes", hideDelayInSec = 0) {
  clearTimeout(timeoutID);
  document.getElementById(receiver).innerHTML = message + "<br>";
  document.getElementById(receiver).style.color = getMessageColor(msgType);
  if (hideDelayInSec != 0) {
      timeoutID = setTimeout(function () { document.getElementById(receiver).innerHTML = ""; }, hideDelayInSec * 1000);
  }
//    if(receiver == "messageButton"){window.scrollTo(0, document.body.scrollHeight);}
}

function statusBarMessage(msgType, message, hideDelayInSec = 0) {
  clearTimeout(timeoutID);
  document.getElementById("messageStatusBar").innerHTML = message + "<br>";
  document.getElementById("statusBar").style.display = "block";
  document.getElementById("statusBar").style.backgroundColor = getMessageColor(msgType);
  if (hideDelayInSec != 0) {
    timeoutID = setTimeout(function () { document.getElementById("messageStatusBar").innerHTML = ""; document.getElementById("statusBar").style.backgroundColor = "#c8b08c"; document.getElementById("statusBar").style.display = "none"; }, hideDelayInSec * 1000);
  }
}

function getMessageColor(msgType){
  switch (msgType) {
    case "D":
      return("orange");
    case "W":
      return("orange");
    case "E":
      return("red");
    case "I":
      return("green"); 
    default:
      return("black");
  }
}

(function blink() { 
  $('.blink').fadeOut(500).fadeIn(500, blink); 
})();

function refreshNtpServer(){
  document.getElementById("ntpServer").value = gNtpServer;
}

function sendNtpServerToESP(){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4) {
      if (this.status == 200) {
        statusBarMessage("I", "NTP Server gespeichert.", gHideDelayDefault);   
      } else { //500
        statusBarMessage("E", "NTP Server " + document.getElementById("ntpServer").value + " kann nicht erreicht werden!<br>Bitte überprüfe die Adresse!", gHideDelayDefault); 
//        document.getElementById("ntpServer").value = this.responseText;
      }      
    }
  };
  xhttp.open("GET", "set_ntp_server?value=" + document.getElementById("ntpServer").value, true);
  xhttp.send();
}

function refreshTimezoneServer(){
  document.getElementById("timezoneServer").value = gTimezoneServer;
}

function sendTimezoneServerToESP(){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
          var message = "Zeitzonen Server gespeichert.";
          statusBarMessage("I", message, gHideDelayDefault);
      }
  };
  xhttp.open("GET", "set_timezone_server?value=" + document.getElementById("timezoneServer").value, true);
  xhttp.send();
}

function refreshtimeOffset(){
  document.getElementById("timeOffset").value = (gTimeOffset>=0?"+":"-") + gTimeOffset/3600;
}

function sendTimeOffsetToESP(){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
        var message = "Zeitzone gespeichert.";
        statusBarMessage("I", message, gHideDelayDefault);
      }
  };
  xhttp.open("GET", "set_time_offset?value=" + document.getElementById("timeOffset").value*3600, true); 
  xhttp.send();
}

function refreshShowPastDates(){
//  console.log("refreshShowPastDates: gShowPastDates = " + gShowPastDates);  
  document.getElementById("showPastDates").checked = gShowPastDates;
}

function toggleShowPastDates(){
  gShowPastDates= !gShowPastDates;
  refreshTaskDates(false);
  refreshTab_DATES();
}
  
function sendShowPastDatesToESP(){
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
      if (this.readyState == 4 && this.status == 200) {
          response = this.responseText;
          if(response == "1"){
            var message = "Vergangene Termine werden angezeigt";
          } else {
            var message = "Vergangene Termine werden nicht angezeigt";
          }
          statusBarMessage("I", message, gHideDelayDefault);
      }
  };
  xhttp.open("GET", "set_show_past_dates?value=" + (gShowPastDates?1:0), true);  //convert bool to int
  xhttp.send();
}

function handleShowPastDates(){ //page update
  gShowPastDates = document.getElementById("showPastDates").checked;
  refreshTaskDates(false);
  sendShowPastDatesToESP();
}

function handleImportPastDates(){ //page update
  gImportPastDates = document.getElementById("importPastDates").checked;
}

var canvas = document.createElement('canvas'); //Create a canvas element
var context = canvas.getContext('2d');

function blockAction(){
//console.log("Blocking Action");
  //Set canvas width/height
  canvas.style.width='100%';
  canvas.style.height='100%';
  //Set canvas drawing area width/height
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  //Position canvas
  canvas.style.position='absolute';
  canvas.style.left=0;
  canvas.style.top=0;
  canvas.style.zIndex=100000;
  //canvas.style.pointerEvents='none'; //Make sure you can click 'through' the canvas
  document.body.appendChild(canvas); //Append canvas to body element
  
  //Draw rectangle
  context.rect(0, 0, screen.width, screen.height);
  context.fillStyle = 'white';
  context.globalAlpha = 0.5;
  context.fill();
//  setTimeout(function () { allowAction(); }, 3 *1000);
}

function allowAction(){
//console.log("Allowing Action");
  context.clearRect(0, 0 , screen.width,screen.height);
  canvas.style.pointerEvents='none';
}

function openFullscreen() {
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
  }
}

//to switch tabs
function openPage(pageName,elmnt,color) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablink");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].style.backgroundColor = "";
  }
  document.getElementById(pageName).style.display = "block";
  elmnt.style.backgroundColor = color;
  refreshTabs();
}

function createWebpage() {
  var innerHTML = `
  <div class="box">
  <div class="row header">
    <img src='https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/TrashReminder.jpg?raw=true' alt='Trash Reminder' width='100%' >
  </div>
  <div class="row tabs">
    <div class=tabbackground >
      <button class="tablink" onclick="openPage('tab_DATES', this, '#4CAF50')" id="dates"><img class=icon src=https://raw.githubusercontent.com/tobiwern/TrashReminder_V3/main/pictures/truck_white.svg></button>
      <button class="tablink" onclick="openPage('tab_SETTINGS', this, '#4CAF50')" id="settings"><img class=icon src=https://raw.githubusercontent.com/tobiwern/TrashReminder_V3/main/pictures/settings_white.svg></button>
      <button class="tablink" onclick="openPage('tab_DATA', this, '#4CAF50')" id="data"><img class=icon src=https://raw.githubusercontent.com/tobiwern/TrashReminder_V3/main/pictures/download_white.svg></button>
      <button class="tablink" onclick="openPage('tab_HELP', this, '#4CAF50')" id="help"><img class=icon src=https://raw.githubusercontent.com/tobiwern/TrashReminder_V3/main/pictures/help_white.svg></button>
    </div>
  </div>
  <div class="row content">
    <div id="tab_DATES" class="tabcontent">
      <div class=frame>
        <h2><div class='centeredHeight'><img src='https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/truck.svg?raw=true'>Abfuhrtermine</div></h2>
        <div id='content_DATES'></div>
      </div>
    </div>

    <div id="tab_SETTINGS" class="tabcontent">
      <div class=frame> 
        <h2><div class='centeredHeight'><img src='https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/settings.svg?raw=true'> Einstellungen</div></h2>
        <div id='content_SETTINGS'></div>    
      </div>        
    </div>

    <div id="tab_DATA" class="tabcontent">
      <div class=frame>      
        <h2><div class='centeredHeight'><img src='https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/download.svg?raw=true'> Daten für Abfuhrtermine</div></h2>
        <div id='content_DATA'></div> 
      </div>
    </div>

    <div id="tab_HELP" class="tabcontent">
      <div class=frame>
        <h2><div class='centeredHeight'><img src='https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/github.svg?raw=true'> Bedienungsanleitung</div></h2>
        <div id='content_HELP'></div> 
      </div>
    </div>   
  </div>
  <div class="row footer" id="statusBar">
    <div id="messageStatusBar"></div>
  </div>
</div>

  `;
  document.getElementById("body").innerHTML = innerHTML;
  addFavicon();
  buildTabs();
  handleTabSelection();
}

function buildTabs(){
  buildTab_DATES();
  buildTab_SETTINGS();
  buildTab_DATA();
  buildTab_HELP();
}

function refreshTabs(){
  if(gInitialized){
    refreshTab_DATES();
    refreshTab_SETTINGS();
    refreshTab_DATA();
    refreshTab_HELP();
  } else {
    document.getElementById("taskDates").innerHTML = "<div style='animation: blinker 1s linear infinite;'>Lade Abfuhrtermine...</div><br>";
  }
}

// Tab HANDLING  /////////////////////////////////////
function handleTabSelection(){
  document.getElementById("dates").click();
}

// DATES /////////////////////////////////////
function buildTab_DATES(){
  var content =`
  <div id='descriptionDates'></div>
  <div id='buttonAcknowledge'></div>
  <div id='taskDates'></div>
  `;
  document.getElementById("content_DATES").innerHTML = content;  
}

function refreshTab_DATES(){
  var description = "";
  if(gNoDates){
    description += "<div style='color: orange'>Es sind noch keine Abfuhrtermine gespeichert!</div><br>";
  } else if(gFutureDates == 0){
    description += "<div style='color: orange'>Es liegen keine zukünftigen Abfuhrtermine vor.</div><br>";
  } else {    
    description += "In der Tabelle werden ";
    if(gShowPastDates){
      description += "<a href=`#` onclick='toggleShowPastDates();event.preventDefault();'>alle</a>";
    } else {
      description += "<a href=`#` onclick='toggleShowPastDates();event.preventDefault();'>anstehende</a>";
    }
    description += "<br><b>Abfuhrtermine</b> und die <b>Müllart</b> angezeigt.<br><br>";
  }
  if(gFutureDates == 0){description += "Neue Termine können über <a href='#' onclick=document.getElementById('data').click();><img src='https://raw.githubusercontent.com/tobiwern/TrashReminder_V3/main/pictures/download.svg'></a> auf \"TrashReminder\" geladen werden.<br><br>";}
  if(!gNoDates && gShowPastDates){ description +=  "Bereits verstrichene Termine werden ausgegraut dargestellt.<br><br>";}
  document.getElementById("descriptionDates").innerHTML = description;  
  // handle buttons
  if(gAlarm){
    if(gAcknowledge){
      document.getElementById("buttonAcknowledge").innerHTML ="<button style='background-color:#c8b08c;' class='button' onclick='acknowledge(0)'>Mülleimer steht doch nicht draussen!</button><br><br>";
    } else {
      document.getElementById("buttonAcknowledge").innerHTML ="<button style='background-color:#4CAF50;' class='button' onclick='acknowledge(1)'>Mülleimer steht draussen!</button><br><br>";
    }
  }else{
    document.getElementById("buttonAcknowledge").innerHTML ="";
  }
}

// SETTINGS ////////////////////////////////
function buildTab_SETTINGS(){
  var content = "";
  content = `
  Auf dieser Seite können Einstellungen für "TrashReminder" geändert werden.<br><br> 
  <hr>
  <h3><div class='centeredHeight'><img src='https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/clock.svg?raw=true'> Zeitpunkt der Erinnerung</div></h3>
  <table>
    <tr>
      <td class=description><label for="start">Start der Erinnerung<br>(am Vortag der Abholung):</label></td>
      <td class=value><select id="start" name="start" onchange='sendDropDownStateToESP("start")'></select></td>
    </tr>
    <tr>
      <td class=description><label class='fancy-input' for="end">Ende der Erinnerung<br>(am Tag der Abholung):</label></td>
      <td class=value><select id="end" name="end" onchange='sendDropDownStateToESP("end")'></select></td>
    </tr>
  </table><br>

  <hr>
  <h3><div class='centeredHeight'><img src='https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/trash.svg?raw=true'> Abfallarten</div></h3>
  <div id='taskTypes'></div>
  <div id='messageTaskTypes'></div>

  <hr>
  <h3><div class='centeredHeight'><img src='https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/sliders.svg?raw=true'> Optionen</div></h3>
  <table width="80%">
    <tr>
    <td><input type='checkbox' id="showPastDates" onchange='handleShowPastDates()'>
    <label for="showPastDates">Vergangene Termine anzeigen</label></td>
    </tr>
  </table><br>

  <hr>
  <h3><div class='centeredHeight'><img src='https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/watch.svg?raw=true'> Zeit Einstellungen</div></h3>
  Die folgenden Einstellungen werden normalerweise automatisch ermittelt, können aber hier überschrieben werden.<br><br>
  <table width="100%">
    <tr>
      <td class=value><label for="timeOffset">Zeitzone:</label></td>
      <td class=value><input type="text" id="timeOffset" name="timeOffset" onfocusout='sendTimeOffsetToESP()'></td>
    </tr>
    <tr>
      <td class=value><label for="timezoneServer">Zeitzonen Server:</label></td>
      <td class=value><input type="text" id="timezoneServer" name="timezoneServer" onfocusout='sendTimezoneServerToESP()'></td>
    </tr>
    <tr>
      <td class=value><label for="ntpServer">NTP Zeit-Server:</label></td>
      <td class=value><input type="text" id="ntpServer" name="ntpServer" onfocusout='sendNtpServerToESP()'></td>
    </tr>
    <tr>
    <td colspan=2><br><em>Eine Übersicht an NTP Servern kann unter diesem <a href='https://gist.github.com/mutin-sa/eea1c396b1e610a2da1e5550d94b0453'>Link</a> aufgerufen werden.</em></td>
    </tr>
  </table><br>
  `;
  document.getElementById("content_SETTINGS").innerHTML = content;
}

function refreshTab_SETTINGS(){
  refreshShowPastDates();
  refreshNtpServer();
  refreshTimezoneServer();
  refreshtimeOffset();
}

// DATA /////////////////////////////////////
function buildTab_DATA(){
  var content = "";
  content += `
  <div>Falls sich Änderungen an den Abfuhrterminen ergeben haben oder neue Termine (z.B. für das nächste Jahr) gespeichert werden sollen, könnnen neue Abfuhrtermine auf "TrashReminder" geladen werden.</div>
  <hr>
  <div id='buttonDownload'></div>
  <div id='tasks'></div>
  <div id='messageTasks'></div>

  <h3><div class='centeredHeight'><img src='https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/download-cloud.svg?raw=true'>Von wo bekomme ich die Termine?</div></h3>
  <div>Die Abfuhrdaten werden üblicherweise durch das Entsorgungsunternehmen auf einer Webseite im ICS oder ICAL Format
  angeboten und müssen zuerst heruntergeladen werden. Suche über Deinen Browser nach "Abfuhrtermine" oder "Abfallkalender" + Deinem Ort, z.B. <a target='_blank' href='https://www.google.com/search?&q=Abfuhrtermine+Stuttgart'>"Abfuhrtermine Stuttgart"</a>.</div><br>
  <div>Sobald Du die ICS oder ICAL Datei auf Dein Handy oder Deinen Computer heruntergeladen hast, kannst Du diese über den Button "Hochladen..." auswählen und auf "TrashReminder" laden. 
  Es können auch mehrere Dateien ausgewählt werden, falls mehrere Unternehmen die Abfuhr übernehmen.</div>
  <div id='descriptionData'></div> 
  <div id='buttonDeleteTasks'></div><br>
  `;
  document.getElementById("content_DATA").innerHTML = content;
}

gFilesLoaded = false;
function refreshTab_DATA(){
  var downloadButton = `
  Wähle eine oder mehrere bereits heruntergeladene ICS oder ICAL Dateien Deines Entsorgungsunternehmens aus:<br><br>
  <label class="button"><input style="display:none;" type="file" name="files" id="files" accept=".ics" onchange="processFiles()" multiple>Hochladen...</label>
  <br>
  <input type='checkbox' id="importPastDates" onchange='handleImportPastDates()'>
  <label for="importPastDates">Vergangene Termine importieren</label>
`;
  document.getElementById("buttonDownload").innerHTML = downloadButton;
  if(!gFilesLoaded){
    document.getElementById("buttonDownload").style.display = "block";  
  } else {
    document.getElementById("buttonDownload").style.display = "none";  
  }

  var description = "";
  var buttonDelete = "";
  if(!gNoDates){
    description += `
    <h3><div class="centeredHeight"><img src="https://github.com/tobiwern/TrashReminder_V3/blob/main/pictures/file-minus.svg?raw=true"> Löschen der Abfuhrtermine</div></h3> 
    Über den nachstehenden Button können alle Abfuhrtermine von \"TrashReminder\" gelöscht werden:<br><br>
    `;
    buttonDelete = "<button class='button' onclick='deleteTasksOnESP()'>Abfuhrtermine löschen</button>";
  }
  document.getElementById("descriptionData").innerHTML = description;
  document.getElementById("buttonDeleteTasks").innerHTML = buttonDelete;
}

// HELP /////////////////////////////////////
function buildTab_HELP(){
  var content = `
  Mehr Infos zu "TrashReminder" gibt es unter<br><a href='https://tobiwern.github.io/TrashReminder_V3/' target='_blank'>https://tobiwern.github.io/TrashReminder/</a>
  <br><br>
  <button class="button" onclick="restartTrashReminder()">TrashReminder neu starten</button>
  <button class="button" onclick="fireworks()">Feuerwerk</button>
  <button class="button" id="demoButton" onclick="toggleDemo()">Demo Mode starten</button>
  <button class="button" onclick="requestLogFromESP()"  ondblclick="deleteLogOnESP()">Logfile anzeigen</button>
  <button class="button" onclick="resetWifiSettingsOnESP()">WLAN Einstellungen löschen</button>
  <h3>Kontakt</h3>
  <p>Tobias Werner, Erfindungen aller Art</p>
  `;
  document.getElementById("content_HELP").innerHTML = content;
}

function refreshTab_HELP(){
}
