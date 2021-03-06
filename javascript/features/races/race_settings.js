// Copyright 2015 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

exports = {
  // Price (in dollars) required in order to participate in a race. This value is used both for the
  // command to join a race, as well as for race challenge desks.
  RACE_SIGNUP_PRICE: 1000,

  // Number of milliseconds to wait before races advance from the sign-up to the loading state. This
  // could happen earlier if enough players have signed up for participating in the race.
  RACE_SIGNUP_WAIT_DURATION: 20000,

  // Number of milliseconds to wait before races advance from the loading to the countdown state.
  RACE_LOADING_WAIT_DURATION: 1500,

  // Number of seconds the countdown of a race should last for.
  RACE_COUNTDOWN_SECONDS: 3,

  // Number of milliseconds between state updates for active races.
  RACE_STATE_UPDATE_TIME: 73,

  // Number of milliseconds between replacing the NOS in race vehicles when the unlimited NOS
  // setting has been enabled for a race.
  RACE_UNLIMITED_NOS_UPDATE_TIME: 20000,

  // Number of milliseconds to wait before dismissing game over messages from their screen, and
  // finishing the race, restoring the player's previous state before they started it at all.
  RACE_DIALOG_WAIT_DURATION: 3000
};
