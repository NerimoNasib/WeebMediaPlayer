class VideoWithBackground {
    jsvideo;
    jscanvas;
    step;
    ctx;
  
    constructor(videoId, canvasId) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  
      if (!mediaQuery.matches) {
        this.jsvideo = document.getElementById(videoId);
        this.jscanvas = document.getElementById(canvasId);
  
        window.addEventListener("load", this.init, false);
        window.addEventListener("unload", this.cleanup, false);
      }
    }
  
    draw = () => {
      this.ctx.drawImage(this.jsvideo, 0, 0, this.jscanvas.width, this.jscanvas.height);
    };
  
    drawLoop = () => {
      this.draw();
      this.step = window.requestAnimationFrame(this.drawLoop);
    };
  
    drawPause = () => {
      window.cancelAnimationFrame(this.step);
      this.step = undefined;
    };
  
    init = () => {
      this.ctx = this.jscanvas.getContext("2d");
      this.ctx.filter = "blur(2px)";
  
      this.jsvideo.addEventListener("loadeddata", this.draw, false);
      this.jsvideo.addEventListener("seeked", this.draw, false);
      this.jsvideo.addEventListener("play", this.drawLoop, false);
      this.jsvideo.addEventListener("pause", this.drawPause, false);
      this.jsvideo.addEventListener("ended", this.drawPause, false);
    };
  
    cleanup = () => {
      this.jsvideo.removeEventListener("loadeddata", this.draw);
      this.jsvideo.removeEventListener("seeked", this.draw);
      this.jsvideo.removeEventListener("play", this.drawLoop);
      this.jsvideo.removeEventListener("pause", this.drawPause);
      this.jsvideo.removeEventListener("ended", this.drawPause);
    };
}
  
const el = new VideoWithBackground("video", "js-canvas");


function selectedVideo(self) {
    var file = self.files[0];
    var reader = new FileReader();

    reader.onload = function (e) {
        var src = e.target.result;
        var video = document.getElementById("video");
        video.src = src;
        video.load();
        video.style.display = "block";
        var filenameWithoutExtension = file.name.split('.').slice(0, -1).join('.');
        document.getElementById("video-header").getElementsByTagName("h2")[0].textContent = filenameWithoutExtension;
    };

    reader.readAsDataURL(file);
}

let trackCount = 0;

function selectedSubtitle(subInput) {
  var subtitleFile = subInput.files[0];

  var subtitleReader = new FileReader();
  subtitleReader.onload = function (e) {
      var subtitleData = e.target.result;
      var subtitleSrc = "";

      if (subtitleFile.name.endsWith(".srt")) {
          subtitleSrc = srt2webvtt(subtitleData);
      }
      else {
          subtitleSrc = subtitleData;
      }

      var track = document.createElement('track');
      track.label = "Track " + (++trackCount);
      track.kind = "subtitles";
      track.src = URL.createObjectURL(new Blob([subtitleSrc], {type: 'text/vtt'}));
      track.default = true;
      
      var video = document.getElementById("video");
      
      video.addEventListener('loadedmetadata', function() {
          video.appendChild(track);

          var subtitles = parseSubtitles(subtitleSrc);//test
          displaySubtitles(subtitles);//test
      });

      video.load();
      video.play();

      var subtitleContainer = document.getElementsByClassName("container-subtitle")[0];
      subtitleContainer.style.display = "block";
  };

  subtitleReader.readAsText(subtitleFile, 'UTF-8');
}

//test
function parseSubtitles(subtitleSrc) {
  var cues = [];
  var lines = subtitleSrc.split(/\r?\n/);
  var cue = {};

  for (var i = 0; i < lines.length; i++) {
      if (lines[i].trim() === "") {
          if (Object.keys(cue).length > 0) {
              cues.push(cue);
              cue = {};
          }
      } 
      else if (/^\d+$/.test(lines[i])) {
          cue.index = parseInt(lines[i]);
      }
      else if (/^\d+:\d+:\d+/.test(lines[i])) {
          var times = lines[i].split(" --> ");
          cue.startTime = times[0];
          cue.endTime = times[1];
      }
      else {
          if (!cue.text) {
              cue.text = lines[i];
          }
          else {
              cue.text += "<br>" + lines[i];
          }
      }
  }

  return cues;
}

function displaySubtitles(subtitles) {
  var subtitleContainer = document.getElementById("subtitleContainer");
  subtitleContainer.innerHTML = "";
  var videoPlayer = document.getElementById("video");

  for (var i = 0; i < subtitles.length; i++) {
      var cue = subtitles[i];
      var startTime = cue.startTime;
      var endTime = cue.endTime;
      var startSeconds = convertTimestampToSeconds(startTime);
      var endSeconds = convertTimestampToSeconds(endTime);

      var span = document.createElement("span");
      span.setAttribute("data-caption-id", "id_" + i);
      span.classList.add("caption", "button", "active");
      span.setAttribute("data-start", startSeconds.toFixed(3));
      span.setAttribute("data-end", endSeconds.toFixed(3));
      var captionText = document.createElement("span");
      captionText.id = "id_" + i;
      captionText.setAttribute("data-caption-id", "id_" + i);
      captionText.classList.add("caption-text");
      var subtitleLines = cue.text.split("<br>");
      for (var j = 0; j < subtitleLines.length; j++) {
          var p = document.createElement("p");
          p.textContent = subtitleLines[j];
          captionText.appendChild(p);
      }

      span.appendChild(captionText);
      subtitleContainer.appendChild(span);

      span.addEventListener("click", function() {
          var startTime = parseFloat(this.getAttribute("data-start"));
          videoPlayer.currentTime = startTime;
      });
  }

  videoPlayer.addEventListener("timeupdate", function() {
    var currentTime = videoPlayer.currentTime;
    var subtitleSpans = subtitleContainer.querySelectorAll("span[data-start]");
    for (var i = 0; i < subtitleSpans.length; i++) {
        var startSeconds = parseFloat(subtitleSpans[i].getAttribute("data-start"));
        var endSeconds = parseFloat(subtitleSpans[i].getAttribute("data-end"));
        if (currentTime >= startSeconds && currentTime <= endSeconds) {
            subtitleSpans[i].classList.add("highlight");
            // console.log("Subtitle with ID " + subtitleSpans[i].getAttribute("data-caption-id") + " is highlighted.");
            var subtitleRect = subtitleSpans[i].getBoundingClientRect();
            var containerRect = subtitleContainer.getBoundingClientRect();
            if (subtitleRect.bottom > containerRect.bottom) {
                subtitleContainer.scrollTop += subtitleRect.bottom - containerRect.bottom;
            }
        }
        else {
            subtitleSpans[i].classList.remove("highlight");
        }
    }
});



}

function convertTimestampToSeconds(timestamp) {
  if (!timestamp) return 0;
  var parts = timestamp.split(/[,.:]/);
  if (parts.length < 4) return 0;
  var hours = parseInt(parts[0]);
  var minutes = parseInt(parts[1]);
  var seconds = parseInt(parts[2]);
  var milliseconds = parseInt(parts[3]);
  return hours * 3600 + minutes * 60 + seconds + milliseconds / 1000;
}

function srt2webvtt(data) {
  var srt = data.replace(/\r+/g, '');
  srt = srt.replace(/^\s+|\s+$/g, '');
  var cuelist = srt.split('\n\n');
  var result = "";
  if (cuelist.length > 0) {
    result += "WEBVTT\n\n";
    for (var i = 0; i < cuelist.length; i=i+1) {
      result += convertSrtCue(cuelist[i]);
    }
  }
  return result;
}

function convertSrtCue(caption) {
  var cue = "";
  var s = caption.split(/\n/);
  while (s.length > 3) {
      for (var i = 3; i < s.length; i++) {
          s[2] += "\n" + s[i]
      }
      s.splice(3, s.length - 3);
  };
  var line = 0;
  if (!s[0].match(/\d+:\d+:\d+/) && s[1].match(/\d+:\d+:\d+/)) {
    cue += s[0].match(/\w+/) + "\n";
    line += 1;
  };
  if (s[line].match(/\d+:\d+:\d+/)) {
    var m = s[1].match(/(\d+):(\d+):(\d+)(?:,(\d+))?\s*--?>\s*(\d+):(\d+):(\d+)(?:,(\d+))?/);
    if (m) {
      cue += m[1]+":"+m[2]+":"+m[3]+"."+m[4]+" --> "
            +m[5]+":"+m[6]+":"+m[7]+"."+m[8]+"\n";
      line += 1;
    } 
    else {
      return "";
    }
  } 
  
  else {
    return "";
  }
  if (s[line]) {
    cue += s[line] + "\n\n";
  }
  return cue;
}

//Dark theme switches
const toggle = document.getElementById('toggleDark');
const videoInput = document.getElementById('videoInput');
const body = document.querySelector('body');
const container = document.querySelector('.container'); 
const figure = document.querySelector('.figure');
const kyanvas = document.querySelector('.canvas')
const header = document.getElementById('video-header');

toggle.addEventListener('click', function() {
    if (toggle.textContent === 'Off') {
        body.style.background = '#141414';
        container.style.backgroundColor = '#303030';
        figure.style.color = "white";
        toggle.style.color = "red";
        toggle.textContent = 'On';
        kyanvas.style.opacity = '0.2';
        header.style.color = 'white';
    } 

    else {
        body.style.removeProperty('background');
        container.style.removeProperty('background-color');
        figure.style.removeProperty('color');
        toggle.style.removeProperty('color');
        kyanvas.style.removeProperty('opacity');
        toggle.textContent = 'Off';
        header.style.removeProperty('color');
    }
});