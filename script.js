/*
 * Copyright (C) 2020 Sam Steele
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

let CLIENT_ID = "";
let CLIENT_SECRET = "";
let REDIRECT_URI = "https://localhost/";

let emotions = [
  //positive
  {emotion:"adventurous", emoji:'🏞', score:1},
  {emotion:"amused", emoji:'🤣', score:1},
  {emotion:"celebrating", emoji:'🥳', score:1},
  {emotion:"excited", emoji:'😁', score:1},
  {emotion:"energetic", emoji:'🔥', score:1},
  {emotion:"flirty", emoji:'😘', score:1},
  {emotion:"happy", emoji:'🙂', score:1},
  {emotion:"inspired", emoji:'💡', score:1},
  {emotion:"productive", emoji:'📈', score:1},
  {emotion:"relaxed", emoji:'😌', score:1},
  {emotion:"romantic", emoji:'🥰', score:1},
  {emotion:"social", emoji:'🗣', score:1},

  //negative
  {emotion:"afraid", emoji:'😨', score:-1},
  {emotion:"angry", emoji:'😡', score:-1},
  {emotion:"annoyed", emoji:'😖', score:-1},
  {emotion:"anxiety", emoji:'😟', score:-1},
  {emotion:"confused", emoji:'😕', score:-1},
  {emotion:"depression", emoji:'😓', score:-1},
  {emotion:"disappointed", emoji:'😞', score:-1},
  {emotion:"lonely", emoji:'🙍', score:-1},
  {emotion:"nervous", emoji:'😅', score:-1},
  {emotion:"sad", emoji:'🙁', score:-1},
  {emotion:"sick", emoji:'🤒', score:-1},
  {emotion:"tired", emoji:'😴', score:-1},
];

let score = 0;
let checkboxes = {}
let progressBar = mdc.linearProgress.MDCLinearProgress.attachTo(document.querySelector('.mdc-linear-progress'));
let newTagField = mdc.textField.MDCTextField.attachTo(document.querySelector('.mdc-text-field'));
let snackbar = mdc.snackbar.MDCSnackbar.attachTo(document.querySelector('.mdc-snackbar'));
let client = new jso.JSO({
  providerID: "exist",
  client_id: CLIENT_ID,
  authorization: "https://exist.io/oauth2/authorize",
  response_type: 'code',
  client_secret: CLIENT_SECRET,
  token: "https://exist.io/oauth2/access_token",
  redirect_uri: REDIRECT_URI,
  scopes: { request: ["read+write"]}
})
let fetcher = new jso.Fetcher(client)
client.callback();
check_token();

function get_score(emotion) {
  for(e of emotions) {
    if(e.emotion == emotion)
      return e.score;
  }
  return 0;
}

function check_token() {
  if(client.checkToken() !== null) {
    if(location.href.includes('?'))
      window.location.href = window.location.href.split("?")[0];
    else
      fetch_profile();
  } else {
    setTimeout(check_token, 500);
  }
}

function render_profile(profile) {
  var hour = new Date().getHours()
  var greeting = "Good evening, ";

  if (hour < 12) {
    greeting = "Good morning, ";
  } else if (hour < 18) {
    greeting = "Good afternoon, ";
  }
  $('#profile > h1').text(greeting + profile.first_name + "!")

  fetch_attributes();
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function update_score() {
  var count = 0;
  var positive = "";
  var negative = "";
  score = 0;

  for (const [name,checkbox] of Object.entries(checkboxes)) {
    if(checkbox.checked) {
      s = get_score(name);
      if(s != 0) {
        if(s > 0)
          positive += $('#' + name).attr('data-emoji');
        else
          negative += $('#' + name).attr('data-emoji');
        score+=s;
        count++;
      }
    }
  }

  if(count > 0) {
    var ratio = 2.0 / count;
    if(count < 3)
      ratio = 1;

    score *= ratio;

    score += 3;
  } else {
    score = 3;
  }
  score = Math.round(score);
  $('#score').html(`Overall mood score for today: <span class='score${score}'>${score}</span><br/><span class='negative'>${negative}</span><span class='positive'>${positive}</span>`);
}

function insert_tag(name, label, checked) {
  if(!(name in checkboxes)) {
    var emoji = null;
    for(e of emotions) {
      if(e.emotion == name) {
        label = e.emoji + "&nbsp;" + label;
        emoji = e.emoji;
        break;
      }
    }
    
    var form_field = $(`<div class="mdc-form-field">
        <div class="mdc-checkbox" id="mdc-${name}">
          <input type="checkbox"
                 class="mdc-checkbox__native-control"
                 id="${name}" onChange="update_score()" data-emoji="${emoji}"/>
          <div class="mdc-checkbox__background">
            <svg class="mdc-checkbox__checkmark"
                 viewBox="0 0 24 24">
              <path class="mdc-checkbox__checkmark-path"
                    fill="none"
                    d="M1.73,12.91 8.1,19.28 22.79,4.59"/>
            </svg>
            <div class="mdc-checkbox__mixedmark"></div>
          </div>
          <div class="mdc-checkbox__ripple"></div>
        </div>
        <label for="${name}">${label}</label>
      </div>`);

    if(emoji != null)
      $('#emo_tags').append(form_field);
    else
      $('#other_tags').append(form_field);
    checkboxes[name] = new mdc.checkbox.MDCCheckbox(document.querySelector('#mdc-' + name));
  }
  checkboxes[name].checked = checked;
}

function render_attributes(attributes) {
  shuffleArray(emotions);

  emotions.forEach(emotion => {
    insert_tag(emotion.emotion, emotion.emotion, 0);
  })

  attributes.forEach(attribute => {
    if(attribute.attribute != "custom" && attribute.group.name == "custom") {
      insert_tag(attribute.attribute, attribute.label, attribute.values.length == 1 && attribute.values[0].value == 1);
    }
  })

  progressBar.determinate = true;
  update_score();
  $('#content').show();
}

function fetch_profile() {
  progressBar.determinate = false;
  $('#login').hide();
  fetcher.fetch('https://exist.io/api/1/users/$self/profile/', {})
  .then(data => data.json())
  .then(data => {
    render_profile(data);
  })
  .catch((err) => {
    console.error("Error from fetcher", err);
    snackbar.labelText = "Failed to load profile";
    snackbar.open();
    logout();
  })
}

function fetch_attributes() {
  fetcher.fetch('https://exist.io/api/1/users/$self/attributes/?limit=1&groups=custom,mood')
  .then(data => data.json())
  .then(data => {
    render_attributes(data);
  })
  .catch((err) => {
    console.error("Error from fetcher", err);
  })
}

function save() {
  $(window).scrollTop(0);
  $('.mdc-button').attr("disabled", true);
  progressBar.determinate = false;
  var tags = "";
  for (const [name,checkbox] of Object.entries(checkboxes)) {
    if(checkbox.checked) {
      if(tags.length > 0)
        tags += ",";
      tags += name;
    }
  }

  fetcher.fetch('https://exist.io/api/1/attributes/acquire/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify([{"name":"mood", "active":true}, {"name":"custom", "active":true}])
  })
  .then(data => data.json())
  .then(data => {
    if(data.failed.length == 0) {
      date = new Date().getFullYear()+'-'+("0"+(new Date().getMonth()+1)).slice(-2)+'-'+("0"+new Date().getDate()).slice(-2);
      fetcher.fetch('https://exist.io/api/1/attributes/update/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{"name":"mood", "date":date, "value":score}, {"name":"custom", "date":date, "value":tags}])
      })
      .then(data => data.json())
      .then(data => {
        progressBar.determinate = true;
        $('.mdc-button').attr("disabled", false);
        if(data.failed.length > 0) {
          console.error("Failed to save tags", data.failed);
          snackbar.labelText = "Failed to save tags";
        } else {
          snackbar.labelText = "Tags saved successfully";
        }
        snackbar.open();
      })
      .catch((err) => {
        console.error("Error from fetcher", err);
        progressBar.determinate = true;
        $('.mdc-button').attr("disabled", false);
        snackbar.labelText = "Failed to save tags";
        snackbar.open();
      })
    } else {
      console.error("Failed to acquire attributes", data.failed);
      snackbar.labelText = "Failed to acquire attributes";
      snackbar.open();
    }
  })
  .catch((err) => {
    console.error("Error from fetcher", err);
    progressBar.determinate = true;
    $('.mdc-button').attr("disabled", false);
    snackbar.labelText = "Failed to acquire attributes";
    snackbar.open();
  })
}

function logout() {
  client.wipeTokens();
  $('#content').hide();
  $('#login').show();
}

function authenticate() {
  client.getToken().then((token) => { fetch_profile(); });
}