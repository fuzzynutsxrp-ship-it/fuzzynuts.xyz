/* ═══════════════════════════════════════════════════════════════
   NUT RACER — Fuzzynuts Arcade game logic

   Ported from Jake Gordon's "Javascript Racer - v4 (final)" pseudo-3D
   Outrun-style engine. The engine itself (road segments, sprite
   projection, car AI, input handling) is reproduced essentially
   verbatim from v4.final.html so we keep the upstream behavior. On
   top of that we add:

     • A finite 3-lap race (the upstream is an infinite time-attack)
     • A lap counter HUD ('lap_count_value') and live score HUD
       ('race_score_value')
     • A race-complete overlay that shows best lap / total time /
       computed score and offers Race Again
     • A FuzzyScoreSubmit('racer', score, duration) call at race end
       so the run lands on the arcade leaderboard
     • Touch controls (#touch-up, #touch-left, #touch-down, #touch-right)
     • A global window.restartRace() callable by the modal's button

   Upstream:
     https://github.com/jakesgordon/javascript-racer
     https://codeincomplete.com/posts/javascript-racer/

   The DOM IDs used here are defined in index.html. common.js + stats.js
   must load before this file (see index.html script order).
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Fuzzynuts arcade integration ── */

  var GAME_SLUG = "racer"; // Backend slug (frontend canonical 'nut-racer' is aliased)
  var TOTAL_LAPS = 3;
  var MIN_RACE_SECONDS = 15; // Matches fuzzy-score.js MIN_DURATION

  /* ── Engine state (lifted from v4.final.html) ── */

  var fps = 60;
  var step = 1 / fps;
  var width = 1024;
  var height = 768;
  var centrifugal = 0.3;
  var skySpeed = 0.001;
  var hillSpeed = 0.002;
  var treeSpeed = 0.003;
  var skyOffset = 0;
  var hillOffset = 0;
  var treeOffset = 0;
  var segments = [];
  var cars = [];
  var stats = Game.stats("fps");
  var canvas = Dom.get("canvas");
  var ctx = canvas.getContext("2d");
  var background = null;
  var sprites = null;
  var resolution = null;
  var roadWidth = 2000;
  var segmentLength = 200;
  var rumbleLength = 3;
  var trackLength = null;
  var lanes = 3;
  var fieldOfView = 100;
  var cameraHeight = 1000;
  var cameraDepth = null;
  var drawDistance = 300;
  var playerX = 0;
  var playerZ = null;
  var fogDensity = 5;
  var position = 0;
  var speed = 0;
  var maxSpeed = segmentLength / step;
  var accel = maxSpeed / 5;
  var breaking = -maxSpeed;
  var decel = -maxSpeed / 5;
  var offRoadDecel = -maxSpeed / 2;
  var offRoadLimit = maxSpeed / 4;
  var totalCars = 200;
  var currentLapTime = 0;
  var lastLapTime = null;

  /* ── Arcade race state (additions) ── */

  var lapCount = 0;
  var totalRaceTime = 0;
  var raceFinished = false;
  var raceStartWall = Date.now();
  var raceSubmitted = false;

  var keyLeft = false;
  var keyRight = false;
  var keyFaster = false;
  var keySlower = false;

  var hud = {
    speed: { value: null, dom: Dom.get("speed_value") },
    current_lap_time: { value: null, dom: Dom.get("current_lap_time_value") },
    last_lap_time: { value: null, dom: Dom.get("last_lap_time_value") },
    fast_lap_time: { value: null, dom: Dom.get("fast_lap_time_value") },
    lap_count: { value: null, dom: Dom.get("lap_count_value") },
    race_score: { value: null, dom: Dom.get("race_score_value") },
  };

  /* ═══════════════════════════════════════════════════════════════
       UPDATE
       ═══════════════════════════════════════════════════════════════ */

  function update(dt) {
    if (raceFinished) return; // freeze physics once the race ends

    var n, car, carW, sprite, spriteW;
    var playerSegment = findSegment(position + playerZ);
    var playerW = SPRITES.PLAYER_STRAIGHT.w * SPRITES.SCALE;
    var speedPercent = speed / maxSpeed;
    var dx = dt * 2 * speedPercent;
    var startPosition = position;

    updateCars(dt, playerSegment, playerW);

    position = Util.increase(position, dt * speed, trackLength);

    if (keyLeft) playerX = playerX - dx;
    else if (keyRight) playerX = playerX + dx;

    playerX = playerX - dx * speedPercent * playerSegment.curve * centrifugal;

    if (keyFaster) speed = Util.accelerate(speed, accel, dt);
    else if (keySlower) speed = Util.accelerate(speed, breaking, dt);
    else speed = Util.accelerate(speed, decel, dt);

    if (playerX < -1 || playerX > 1) {
      if (speed > offRoadLimit)
        speed = Util.accelerate(speed, offRoadDecel, dt);

      for (n = 0; n < playerSegment.sprites.length; n++) {
        sprite = playerSegment.sprites[n];
        spriteW = sprite.source.w * SPRITES.SCALE;
        if (
          Util.overlap(
            playerX,
            playerW,
            sprite.offset + (spriteW / 2) * (sprite.offset > 0 ? 1 : -1),
            spriteW,
          )
        ) {
          speed = maxSpeed / 5;
          position = Util.increase(
            playerSegment.p1.world.z,
            -playerZ,
            trackLength,
          );
          break;
        }
      }
    }

    for (n = 0; n < playerSegment.cars.length; n++) {
      car = playerSegment.cars[n];
      carW = car.sprite.w * SPRITES.SCALE;
      if (speed > car.speed) {
        if (Util.overlap(playerX, playerW, car.offset, carW, 0.8)) {
          speed = car.speed * (car.speed / speed);
          position = Util.increase(car.z, -playerZ, trackLength);
          break;
        }
      }
    }

    playerX = Util.limit(playerX, -3, 3);
    speed = Util.limit(speed, 0, maxSpeed);

    skyOffset = Util.increase(
      skyOffset,
      (skySpeed * playerSegment.curve * (position - startPosition)) /
        segmentLength,
      1,
    );
    hillOffset = Util.increase(
      hillOffset,
      (hillSpeed * playerSegment.curve * (position - startPosition)) /
        segmentLength,
      1,
    );
    treeOffset = Util.increase(
      treeOffset,
      (treeSpeed * playerSegment.curve * (position - startPosition)) /
        segmentLength,
      1,
    );

    /* ── Lap detection ── */
    if (position > playerZ) {
      if (currentLapTime && startPosition < playerZ) {
        lastLapTime = currentLapTime;
        totalRaceTime += currentLapTime;
        lapCount += 1;
        currentLapTime = 0;

        updateHud("lap_count", String(Math.min(lapCount, TOTAL_LAPS)));

        if (lastLapTime <= Util.toFloat(Dom.storage.fast_lap_time)) {
          Dom.storage.fast_lap_time = lastLapTime;
          updateHud("fast_lap_time", formatTime(lastLapTime));
          Dom.addClassName("fast_lap_time", "fastest");
          Dom.addClassName("last_lap_time", "fastest");
        } else {
          Dom.removeClassName("fast_lap_time", "fastest");
          Dom.removeClassName("last_lap_time", "fastest");
        }
        updateHud("last_lap_time", formatTime(lastLapTime));
        Dom.show("last_lap_time");

        if (lapCount >= TOTAL_LAPS) {
          finishRace();
          return;
        }
      } else {
        currentLapTime += dt;
      }
    }

    /* ── Live HUD ── */
    updateHud("speed", 5 * Math.round(speed / 500));
    updateHud("current_lap_time", formatTime(currentLapTime));
    updateHud("race_score", computeLiveScore().toLocaleString());
  }

  function updateCars(dt, playerSegment, playerW) {
    var n, car, oldSegment, newSegment;
    for (n = 0; n < cars.length; n++) {
      car = cars[n];
      oldSegment = findSegment(car.z);
      car.offset =
        car.offset + updateCarOffset(car, oldSegment, playerSegment, playerW);
      car.z = Util.increase(car.z, dt * car.speed, trackLength);
      car.percent = Util.percentRemaining(car.z, segmentLength);
      newSegment = findSegment(car.z);
      if (oldSegment !== newSegment) {
        var index = oldSegment.cars.indexOf(car);
        oldSegment.cars.splice(index, 1);
        newSegment.cars.push(car);
      }
    }
  }

  function updateCarOffset(car, carSegment, playerSegment, playerW) {
    var i,
      j,
      dir,
      segment,
      otherCar,
      otherCarW,
      lookahead = 20,
      carW = car.sprite.w * SPRITES.SCALE;

    if (carSegment.index - playerSegment.index > drawDistance) return 0;

    for (i = 1; i < lookahead; i++) {
      segment = segments[(carSegment.index + i) % segments.length];

      if (
        segment === playerSegment &&
        car.speed > speed &&
        Util.overlap(playerX, playerW, car.offset, carW, 1.2)
      ) {
        if (playerX > 0.5) dir = -1;
        else if (playerX < -0.5) dir = 1;
        else dir = car.offset > playerX ? 1 : -1;
        return (((dir * 1) / i) * (car.speed - speed)) / maxSpeed;
      }

      for (j = 0; j < segment.cars.length; j++) {
        otherCar = segment.cars[j];
        otherCarW = otherCar.sprite.w * SPRITES.SCALE;
        if (
          car.speed > otherCar.speed &&
          Util.overlap(car.offset, carW, otherCar.offset, otherCarW, 1.2)
        ) {
          if (otherCar.offset > 0.5) dir = -1;
          else if (otherCar.offset < -0.5) dir = 1;
          else dir = car.offset > otherCar.offset ? 1 : -1;
          return (((dir * 1) / i) * (car.speed - otherCar.speed)) / maxSpeed;
        }
      }
    }

    if (car.offset < -0.9) return 0.1;
    else if (car.offset > 0.9) return -0.1;
    else return 0;
  }

  function updateHud(key, value) {
    if (!hud[key] || !hud[key].dom) return; // guard against missing DOM (mobile / partial UI)
    if (hud[key].value !== value) {
      hud[key].value = value;
      Dom.set(hud[key].dom, value);
    }
  }

  function formatTime(dt) {
    var minutes = Math.floor(dt / 60);
    var seconds = Math.floor(dt - minutes * 60);
    var tenths = Math.floor(10 * (dt - Math.floor(dt)));
    if (minutes > 0)
      return minutes + "." + (seconds < 10 ? "0" : "") + seconds + "." + tenths;
    return seconds + "." + tenths;
  }

  /* ═══════════════════════════════════════════════════════════════
       SCORING + RACE-COMPLETE
       ═══════════════════════════════════════════════════════════════ */

  /**
   * Live preview of what the player would score if the race ended now.
   * Faster races score higher. Hovers around 500-3000 for typical runs.
   * Final score is computed the same way at race end.
   */
  function computeLiveScore() {
    var elapsed = totalRaceTime + currentLapTime;
    if (elapsed <= 0) return 0;
    return Math.max(1, Math.floor(40000 / elapsed));
  }

  function finishRace() {
    if (raceFinished) return;
    raceFinished = true;

    var finalScore = computeLiveScore();
    var bestLap = Math.min(
      lastLapTime || 9999,
      Util.toFloat(Dom.storage.fast_lap_time) || 9999,
    );
    var durationSec = Math.max(
      MIN_RACE_SECONDS,
      Math.floor((Date.now() - raceStartWall) / 1000),
    );

    // Update race-complete overlay
    var elBest = Dom.get("rc-best-lap");
    var elTotal = Dom.get("rc-total-time");
    var elScore = Dom.get("rc-score");
    if (elBest) Dom.set(elBest, formatTime(bestLap));
    if (elTotal) Dom.set(elTotal, formatTime(totalRaceTime));
    if (elScore) Dom.set(elScore, finalScore.toLocaleString());

    var overlay = Dom.get("race-complete");
    if (overlay) overlay.style.display = "flex";

    updateHud("race_score", finalScore.toLocaleString());

    // Submit to arcade leaderboard (idempotent — only once per run)
    if (!raceSubmitted && typeof window.FuzzyScoreSubmit === "function") {
      raceSubmitted = true;
      try {
        window.FuzzyScoreSubmit(GAME_SLUG, finalScore, durationSec);
      } catch (e) {
        console.warn("[NutRacer] FuzzyScoreSubmit failed:", e);
      }
    }
  }

  /**
   * Reset all per-race state and dismiss the overlay. Called by the
   * "Race Again" button (window.restartRace). Note: the track geometry
   * + opponent cars stay the same; only the player's progress resets.
   */
  window.restartRace = function () {
    lapCount = 0;
    totalRaceTime = 0;
    currentLapTime = 0;
    lastLapTime = null;
    position = 0;
    speed = 0;
    playerX = 0;
    raceFinished = false;
    raceSubmitted = false;
    raceStartWall = Date.now();

    var overlay = Dom.get("race-complete");
    if (overlay) overlay.style.display = "none";

    updateHud("lap_count", "0");
    updateHud("race_score", "0");
    updateHud("current_lap_time", formatTime(0));
    Dom.removeClassName("fast_lap_time", "fastest");
    Dom.removeClassName("last_lap_time", "fastest");
  };

  /* ═══════════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════════ */

  function render() {
    var baseSegment = findSegment(position);
    var basePercent = Util.percentRemaining(position, segmentLength);
    var playerSegment = findSegment(position + playerZ);
    var playerPercent = Util.percentRemaining(
      position + playerZ,
      segmentLength,
    );
    var playerY = Util.interpolate(
      playerSegment.p1.world.y,
      playerSegment.p2.world.y,
      playerPercent,
    );
    var maxy = height;

    var x = 0;
    var dx = -(baseSegment.curve * basePercent);

    ctx.clearRect(0, 0, width, height);

    Render.background(
      ctx,
      background,
      width,
      height,
      BACKGROUND.SKY,
      skyOffset,
      resolution * skySpeed * playerY,
    );
    Render.background(
      ctx,
      background,
      width,
      height,
      BACKGROUND.HILLS,
      hillOffset,
      resolution * hillSpeed * playerY,
    );
    Render.background(
      ctx,
      background,
      width,
      height,
      BACKGROUND.TREES,
      treeOffset,
      resolution * treeSpeed * playerY,
    );

    var n, i, segment, car, sprite, spriteScale, spriteX, spriteY;

    for (n = 0; n < drawDistance; n++) {
      segment = segments[(baseSegment.index + n) % segments.length];
      segment.looped = segment.index < baseSegment.index;
      segment.fog = Util.exponentialFog(n / drawDistance, fogDensity);
      segment.clip = maxy;

      Util.project(
        segment.p1,
        playerX * roadWidth - x,
        playerY + cameraHeight,
        position - (segment.looped ? trackLength : 0),
        cameraDepth,
        width,
        height,
        roadWidth,
      );
      Util.project(
        segment.p2,
        playerX * roadWidth - x - dx,
        playerY + cameraHeight,
        position - (segment.looped ? trackLength : 0),
        cameraDepth,
        width,
        height,
        roadWidth,
      );

      x = x + dx;
      dx = dx + segment.curve;

      if (
        segment.p1.camera.z <= cameraDepth ||
        segment.p2.screen.y >= segment.p1.screen.y ||
        segment.p2.screen.y >= maxy
      )
        continue;

      Render.segment(
        ctx,
        width,
        lanes,
        segment.p1.screen.x,
        segment.p1.screen.y,
        segment.p1.screen.w,
        segment.p2.screen.x,
        segment.p2.screen.y,
        segment.p2.screen.w,
        segment.fog,
        segment.color,
      );

      maxy = segment.p1.screen.y;
    }

    for (n = drawDistance - 1; n > 0; n--) {
      segment = segments[(baseSegment.index + n) % segments.length];

      for (i = 0; i < segment.cars.length; i++) {
        car = segment.cars[i];
        sprite = car.sprite;
        spriteScale = Util.interpolate(
          segment.p1.screen.scale,
          segment.p2.screen.scale,
          car.percent,
        );
        spriteX =
          Util.interpolate(
            segment.p1.screen.x,
            segment.p2.screen.x,
            car.percent,
          ) +
          (spriteScale * car.offset * roadWidth * width) / 2;
        spriteY = Util.interpolate(
          segment.p1.screen.y,
          segment.p2.screen.y,
          car.percent,
        );
        Render.sprite(
          ctx,
          width,
          height,
          resolution,
          roadWidth,
          sprites,
          car.sprite,
          spriteScale,
          spriteX,
          spriteY,
          -0.5,
          -1,
          segment.clip,
        );
      }

      for (i = 0; i < segment.sprites.length; i++) {
        sprite = segment.sprites[i];
        spriteScale = segment.p1.screen.scale;
        spriteX =
          segment.p1.screen.x +
          (spriteScale * sprite.offset * roadWidth * width) / 2;
        spriteY = segment.p1.screen.y;
        Render.sprite(
          ctx,
          width,
          height,
          resolution,
          roadWidth,
          sprites,
          sprite.source,
          spriteScale,
          spriteX,
          spriteY,
          sprite.offset < 0 ? -1 : 0,
          -1,
          segment.clip,
        );
      }

      if (segment === playerSegment) {
        Render.player(
          ctx,
          width,
          height,
          resolution,
          roadWidth,
          sprites,
          speed / maxSpeed,
          cameraDepth / playerZ,
          width / 2,
          height / 2 -
            ((cameraDepth / playerZ) *
              Util.interpolate(
                playerSegment.p1.camera.y,
                playerSegment.p2.camera.y,
                playerPercent,
              ) *
              height) /
              2,
          speed * (keyLeft ? -1 : keyRight ? 1 : 0),
          playerSegment.p2.world.y - playerSegment.p1.world.y,
        );
      }
    }
  }

  function findSegment(z) {
    return segments[Math.floor(z / segmentLength) % segments.length];
  }

  /* ═══════════════════════════════════════════════════════════════
       ROAD GEOMETRY (verbatim from v4.final)
       ═══════════════════════════════════════════════════════════════ */

  function lastY() {
    return segments.length === 0 ? 0 : segments[segments.length - 1].p2.world.y;
  }

  function addSegment(curve, y) {
    var n = segments.length;
    segments.push({
      index: n,
      p1: {
        world: { y: lastY(), z: n * segmentLength },
        camera: {},
        screen: {},
      },
      p2: {
        world: { y: y, z: (n + 1) * segmentLength },
        camera: {},
        screen: {},
      },
      curve: curve,
      sprites: [],
      cars: [],
      color: Math.floor(n / rumbleLength) % 2 ? COLORS.DARK : COLORS.LIGHT,
    });
  }

  function addSprite(n, sprite, offset) {
    segments[n].sprites.push({ source: sprite, offset: offset });
  }

  function addRoad(enter, hold, leave, curve, y) {
    var startY = lastY();
    var endY = startY + Util.toInt(y, 0) * segmentLength;
    var n,
      total = enter + hold + leave;
    for (n = 0; n < enter; n++)
      addSegment(
        Util.easeIn(0, curve, n / enter),
        Util.easeInOut(startY, endY, n / total),
      );
    for (n = 0; n < hold; n++)
      addSegment(curve, Util.easeInOut(startY, endY, (enter + n) / total));
    for (n = 0; n < leave; n++)
      addSegment(
        Util.easeInOut(curve, 0, n / leave),
        Util.easeInOut(startY, endY, (enter + hold + n) / total),
      );
  }

  var ROAD = {
    LENGTH: { NONE: 0, SHORT: 25, MEDIUM: 50, LONG: 100 },
    HILL: { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 },
    CURVE: { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 6 },
  };

  function addStraight(num) {
    num = num || ROAD.LENGTH.MEDIUM;
    addRoad(num, num, num, 0, 0);
  }

  function addHill(num, height) {
    num = num || ROAD.LENGTH.MEDIUM;
    height = height || ROAD.HILL.MEDIUM;
    addRoad(num, num, num, 0, height);
  }

  function addCurve(num, curve, height) {
    num = num || ROAD.LENGTH.MEDIUM;
    curve = curve || ROAD.CURVE.MEDIUM;
    height = height || ROAD.HILL.NONE;
    addRoad(num, num, num, curve, height);
  }

  function addLowRollingHills(num, height) {
    num = num || ROAD.LENGTH.SHORT;
    height = height || ROAD.HILL.LOW;
    addRoad(num, num, num, 0, height / 2);
    addRoad(num, num, num, 0, -height);
    addRoad(num, num, num, ROAD.CURVE.EASY, height);
    addRoad(num, num, num, 0, 0);
    addRoad(num, num, num, -ROAD.CURVE.EASY, height / 2);
    addRoad(num, num, num, 0, 0);
  }

  function addSCurves() {
    addRoad(
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      -ROAD.CURVE.EASY,
      ROAD.HILL.NONE,
    );
    addRoad(
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.CURVE.MEDIUM,
      ROAD.HILL.MEDIUM,
    );
    addRoad(
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.CURVE.EASY,
      -ROAD.HILL.LOW,
    );
    addRoad(
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      -ROAD.CURVE.EASY,
      ROAD.HILL.MEDIUM,
    );
    addRoad(
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      ROAD.LENGTH.MEDIUM,
      -ROAD.CURVE.MEDIUM,
      -ROAD.HILL.MEDIUM,
    );
  }

  function addBumps() {
    addRoad(10, 10, 10, 0, 5);
    addRoad(10, 10, 10, 0, -2);
    addRoad(10, 10, 10, 0, -5);
    addRoad(10, 10, 10, 0, 8);
    addRoad(10, 10, 10, 0, 5);
    addRoad(10, 10, 10, 0, -7);
    addRoad(10, 10, 10, 0, 5);
    addRoad(10, 10, 10, 0, -2);
  }

  function addDownhillToEnd(num) {
    num = num || 200;
    addRoad(num, num, num, -ROAD.CURVE.EASY, -lastY() / segmentLength);
  }

  function resetRoad() {
    segments = [];

    addStraight(ROAD.LENGTH.SHORT);
    addLowRollingHills();
    addSCurves();
    addCurve(ROAD.LENGTH.MEDIUM, ROAD.CURVE.MEDIUM, ROAD.HILL.LOW);
    addBumps();
    addLowRollingHills();
    addCurve(ROAD.LENGTH.LONG * 2, ROAD.CURVE.MEDIUM, ROAD.HILL.MEDIUM);
    addStraight();
    addHill(ROAD.LENGTH.MEDIUM, ROAD.HILL.HIGH);
    addSCurves();
    addCurve(ROAD.LENGTH.LONG, -ROAD.CURVE.MEDIUM, ROAD.HILL.NONE);
    addHill(ROAD.LENGTH.LONG, ROAD.HILL.HIGH);
    addCurve(ROAD.LENGTH.LONG, ROAD.CURVE.MEDIUM, -ROAD.HILL.LOW);
    addBumps();
    addHill(ROAD.LENGTH.LONG, -ROAD.HILL.MEDIUM);
    addStraight();
    addSCurves();
    addDownhillToEnd();

    resetSprites();
    resetCars();

    segments[findSegment(playerZ).index + 2].color = COLORS.START;
    segments[findSegment(playerZ).index + 3].color = COLORS.START;
    for (var n = 0; n < rumbleLength; n++)
      segments[segments.length - 1 - n].color = COLORS.FINISH;

    trackLength = segments.length * segmentLength;
  }

  function resetSprites() {
    var n, i;

    addSprite(20, SPRITES.BILLBOARD07, -1);
    addSprite(40, SPRITES.BILLBOARD06, -1);
    addSprite(60, SPRITES.BILLBOARD08, -1);
    addSprite(80, SPRITES.BILLBOARD09, -1);
    addSprite(100, SPRITES.BILLBOARD01, -1);
    addSprite(120, SPRITES.BILLBOARD02, -1);
    addSprite(140, SPRITES.BILLBOARD03, -1);
    addSprite(160, SPRITES.BILLBOARD04, -1);
    addSprite(180, SPRITES.BILLBOARD05, -1);

    addSprite(240, SPRITES.BILLBOARD07, -1.2);
    addSprite(240, SPRITES.BILLBOARD06, 1.2);
    addSprite(segments.length - 25, SPRITES.BILLBOARD07, -1.2);
    addSprite(segments.length - 25, SPRITES.BILLBOARD06, 1.2);

    for (n = 10; n < 200; n += 4 + Math.floor(n / 100)) {
      addSprite(n, SPRITES.PALM_TREE, 0.5 + Math.random() * 0.5);
      addSprite(n, SPRITES.PALM_TREE, 1 + Math.random() * 2);
    }

    for (n = 250; n < 1000; n += 5) {
      addSprite(n, SPRITES.COLUMN, 1.1);
      addSprite(
        n + Util.randomInt(0, 5),
        SPRITES.TREE1,
        -1 - Math.random() * 2,
      );
      addSprite(
        n + Util.randomInt(0, 5),
        SPRITES.TREE2,
        -1 - Math.random() * 2,
      );
    }

    for (n = 200; n < segments.length; n += 3) {
      addSprite(
        n,
        Util.randomChoice(SPRITES.PLANTS),
        Util.randomChoice([1, -1]) * (2 + Math.random() * 5),
      );
    }

    var side, sprite, offset;
    for (n = 1000; n < segments.length - 50; n += 100) {
      side = Util.randomChoice([1, -1]);
      addSprite(
        n + Util.randomInt(0, 50),
        Util.randomChoice(SPRITES.BILLBOARDS),
        -side,
      );
      for (i = 0; i < 20; i++) {
        sprite = Util.randomChoice(SPRITES.PLANTS);
        offset = side * (1.5 + Math.random());
        addSprite(n + Util.randomInt(0, 50), sprite, offset);
      }
    }
  }

  function resetCars() {
    cars = [];
    var n, car, segment, offset, z, sprite, carSpeed;
    for (n = 0; n < totalCars; n++) {
      offset = Math.random() * Util.randomChoice([-0.8, 0.8]);
      z = Math.floor(Math.random() * segments.length) * segmentLength;
      sprite = Util.randomChoice(SPRITES.CARS);
      carSpeed =
        maxSpeed / 4 +
        (Math.random() * maxSpeed) / (sprite === SPRITES.SEMI ? 4 : 2);
      car = { offset: offset, z: z, sprite: sprite, speed: carSpeed };
      segment = findSegment(car.z);
      segment.cars.push(car);
      cars.push(car);
    }
  }

  /* ═══════════════════════════════════════════════════════════════
       INIT
       ═══════════════════════════════════════════════════════════════ */

  function reset(options) {
    options = options || {};
    canvas.width = width = Util.toInt(options.width, width);
    canvas.height = height = Util.toInt(options.height, height);
    lanes = Util.toInt(options.lanes, lanes);
    roadWidth = Util.toInt(options.roadWidth, roadWidth);
    cameraHeight = Util.toInt(options.cameraHeight, cameraHeight);
    drawDistance = Util.toInt(options.drawDistance, drawDistance);
    fogDensity = Util.toInt(options.fogDensity, fogDensity);
    fieldOfView = Util.toInt(options.fieldOfView, fieldOfView);
    segmentLength = Util.toInt(options.segmentLength, segmentLength);
    rumbleLength = Util.toInt(options.rumbleLength, rumbleLength);
    cameraDepth = 1 / Math.tan(((fieldOfView / 2) * Math.PI) / 180);
    playerZ = cameraHeight * cameraDepth;
    resolution = height / 480;

    if (segments.length === 0 || options.segmentLength || options.rumbleLength)
      resetRoad();
  }

  Game.run({
    canvas: canvas,
    render: render,
    update: update,
    stats: stats,
    step: step,
    images: ["background", "sprites"],
    keys: [
      {
        keys: [KEY.LEFT, KEY.A],
        mode: "down",
        action: function () {
          keyLeft = true;
        },
      },
      {
        keys: [KEY.RIGHT, KEY.D],
        mode: "down",
        action: function () {
          keyRight = true;
        },
      },
      {
        keys: [KEY.UP, KEY.W],
        mode: "down",
        action: function () {
          keyFaster = true;
        },
      },
      {
        keys: [KEY.DOWN, KEY.S],
        mode: "down",
        action: function () {
          keySlower = true;
        },
      },
      {
        keys: [KEY.LEFT, KEY.A],
        mode: "up",
        action: function () {
          keyLeft = false;
        },
      },
      {
        keys: [KEY.RIGHT, KEY.D],
        mode: "up",
        action: function () {
          keyRight = false;
        },
      },
      {
        keys: [KEY.UP, KEY.W],
        mode: "up",
        action: function () {
          keyFaster = false;
        },
      },
      {
        keys: [KEY.DOWN, KEY.S],
        mode: "up",
        action: function () {
          keySlower = false;
        },
      },
    ],
    ready: function (images) {
      background = images[0];
      sprites = images[1];
      reset();
      Dom.storage.fast_lap_time = Dom.storage.fast_lap_time || 180;
      updateHud(
        "fast_lap_time",
        formatTime(Util.toFloat(Dom.storage.fast_lap_time)),
      );
      updateHud("lap_count", "0");
      updateHud("race_score", "0");
      raceStartWall = Date.now();
    },
  });

  /* ═══════════════════════════════════════════════════════════════
       TOUCH CONTROLS (mobile)
       Buttons live in index.html; wired here so the engine and the UI
       only ever talk via the same keyLeft/keyRight/keyFaster/keySlower
       state machine the keyboard handler uses.
       ═══════════════════════════════════════════════════════════════ */

  function bindTouch(id, onPress, onRelease) {
    var el = Dom.get(id);
    if (!el) return;
    var press = function (e) {
      e.preventDefault();
      onPress();
    };
    var release = function (e) {
      e.preventDefault();
      onRelease();
    };
    el.addEventListener("touchstart", press, { passive: false });
    el.addEventListener("touchend", release, { passive: false });
    el.addEventListener("touchcancel", release, { passive: false });
    // Also support mouse for desktop QA of the touch overlay
    el.addEventListener("mousedown", press);
    el.addEventListener("mouseup", release);
    el.addEventListener("mouseleave", release);
  }

  bindTouch(
    "touch-up",
    function () {
      keyFaster = true;
    },
    function () {
      keyFaster = false;
    },
  );
  bindTouch(
    "touch-down",
    function () {
      keySlower = true;
    },
    function () {
      keySlower = false;
    },
  );
  bindTouch(
    "touch-left",
    function () {
      keyLeft = true;
    },
    function () {
      keyLeft = false;
    },
  );
  bindTouch(
    "touch-right",
    function () {
      keyRight = true;
    },
    function () {
      keyRight = false;
    },
  );
})();
