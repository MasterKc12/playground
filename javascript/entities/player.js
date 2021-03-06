// Copyright 2015 Las Venturas Playground. All rights reserved.
// Use of this source code is governed by the MIT license, a copy of which can
// be found in the LICENSE file.

const Extendable = require('base/extendable.js'),
      Vector = require('base/vector.js');

// Identifier, stored as an IP address, that can be used to detect players created for testing.
const TEST_PLAYER_IDENTIFIER = '0.0.0.0';

// See https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Symbol
let playerCreateSymbol = Symbol('Private symbol to limit creation of Player instances.'),
    players = {};

class Player extends Extendable {
  // Returns the Player instance for the player with id |playerId|. If the player is not connected
  // to Las Venturas Playground, NULL will be returned instead.
  static get(playerId) {
    if (typeof playerId != 'number')
      throw new Error('Player.get() takes a number argument, ' + typeof playerid + ' given.');

    if (!players.hasOwnProperty(playerId))
      return null;

    return players[playerId];
  }

  // Finds a player either by name or by id, as contained in |identifier|. Player ids will be given
  // precedent when in doubt, for example when a player named "110" is online.
  static find(identifier) {
    let parsedPlayerId = parseFloat(identifier);
    if (!Number.isNaN(parsedPlayerId) && Number.isFinite(parsedPlayerId) && players.hasOwnProperty(parsedPlayerId))
      return players[parsedPlayerId];

    for (let playerId of Object.keys(players)) {
      // TODO: Do case-insensitive matching?
      if (players[playerId].name == identifier)
        return players[playerId];
    }

    return null;
  }

  // Returns the number of players that are currently online on Las Venturas Playground.
  static count() {
    return Object.keys(players).length;
  }

  // Executes |fn| for each player online on the server.
  static forEach(fn) {
    Object.keys(players).forEach(playerId => fn(players[playerId]));
  }

  // Creates a new instance of the Player class for |playerId|. This method must only be used by
  // code in this file, hence the |privateSymbol| which is deliberately not exported.
  constructor(privateSymbol, playerId) {
    super();

    if (privateSymbol != playerCreateSymbol)
      throw new Error('Please do not instantiate the Player class. Use Player.get(playerId) instead.');

    this.id_ = playerId;
    this.connected_ = true;
    this.name_ = pawnInvoke('GetPlayerName', 'iS', playerId);
    this.ipAddress_ = pawnInvoke('GetPlayerIp', 'iS', playerId);
    this.level_ = Player.LEVEL_PLAYER;
    this.activity_ = Player.PLAYER_ACTIVITY_NONE;
  }

  // Returns the id of this player. This attribute is read-only.
  get id() { return this.id_; }

  // Returns whether the player is still connected to the server.
  get connected() { return this.connected_; }

  // Marks the player as having disconnected from the server.
  markAsDisconnected() {
    this.connected_ = false;
  }

  // Returns or updates the name of this player. Changing the player's name is currently not
  // synchronized with the Pawn portion of the gamemode.
  get name() { return this.name_; }
  set name(value) { this.name_ = value; pawnInvoke('SetPlayerName', 'is', this.id_, value); }

  // Returns the IP address of this player. This attribute is read-only.
  get ipAddress() { return this.ipAddress_; }

  // Returns the level of this player. Synchronized with the gamemode using the `levelchange` event.
  get level() { return this.level_; }

  // Gets or sets the virtual world the player is part of.
  get virtualWorld() { return pawnInvoke('GetPlayerVirtualWorld', 'i', this.id_); }
  set virtualWorld(value) { pawnInvoke('SetPlayerVirtualWorld', 'ii', this.id_, value); }

  // Gets or sets the interior the player is part of. Moving them to the wrong interior will mess up
  // their visual state significantly, as all world objects may disappear.
  get interior() { return pawnInvoke('GetPlayerInterior', 'i', this.id_); }
  set interior(value) { pawnInvoke('SetPlayerInterior', 'ii', this.id_, value); }

  // Gets or sets the position of the player. Both must be used with a 3D vector.
  get position() { return new Vector(...pawnInvoke('GetPlayerPos', 'iFFF', this.id_)); }
  set position(value) { pawnInvoke('SetPlayerPos', 'ifff', this.id_, value.x, value.y, value.z); }

  // Gets or sets the time for this player. It will be returned, and must be set, as an array having
  // two entries: hours and minutes.
  get time() { return pawnInvoke('GetPlayerTime', 'iII', this.id); }
  set time(value) { pawnInvoke('SetPlayerTime', 'iii', this.id, value[0], value[1]); }

  // Sets the player's weather. We cannot provide a getter for this, given that SA-MP does not
  // expose whatever weather is current for the player. Silly.
  set weather(value) { pawnInvoke('SetPlayerWeather', 'ii', this.id_, value); }

  // Sets whether the player should be controllable. We cannot provide a getter for this, given that
  // SA-MP does not expose an IsPlayerControllable native. Silly.
  set controllable(value) { pawnInvoke('TogglePlayerControllable', 'ii', this.id_, value ? 1 : 0); }

  // Returns whether the player is in an vehicle. If |vehicle| is provided, this method will check
  // whether the player is in that particular vehicle. Otherwise any vehicle will do.
  isInVehicle(vehicle) {
    if (typeof vehicle === 'number')
      return pawnInvoke('GetPlayerVehicleID', 'i') == vehicle;

    // TODO: Handle Vehicle instances for |vehicle|.

    return pawnInvoke('IsPlayerInAnyVehicle', 'i', this.id_);
  }

  // Removes the player from the vehicle they're currently in.
  removeFromVehicle() { pawnInvoke('RemovePlayerFromVehicle', 'i', this.id_); }

  // Puts the player in |vehicle|, optionally defining |seat| as the seat they should sit in. If the
  // player already is in a vehicle, they will be removed from that before being put in the other in
  // order to work around a SA-MP bug where they may show up in the wrong vehicle for some players.
  putInVehicle(vehicle, seat = 0) {
    if (this.isInVehicle())
      this.removeFromVehicle();

    if (typeof vehicle === 'number')
      pawnInvoke('PutPlayerInVehicle', 'iii', this.id_, vehicle, seat);
    else if (vehicle instanceof Vehicle)
      pawnInvoke('PutPlayerInVehicle', 'iii', this.id_, vehicle.id, seat);
    else
      throw new Error('Unknown vehicle to put the player in: ' + vehicle);
  }

  // Returns or updates the activity of this player. Updating the activity will be propagated to
  // the Pawn part of the gamemode as well.
  get activity() { return this.activity_; }
  set activity(activity) {
    this.activity_ = activity;

    // Inform the Pawn script of the activity change.
    pawnInvoke('OnPlayerActivityChange', 'ii', this.id_, activity);
  }

  // Sends |message| to the player. The |message| can either be a scalar JavaScript value or an
  // instance of the Message class that exists in //base if you wish to use colors.
  sendMessage(message) {
    // TODO: Automatically split up messages that are >144 characters.
    // TODO: Verify that any formatting used in |message| is valid.
    // TODO: Support instances of the Message class when it exists.

    pawnInvoke('SendClientMessage', 'iis', this.id_, 0x000000FF, message.toString());
  }

  // -----------------------------------------------------------------------------------------------
  // TODO: The following methods should not be on the common Player object, but rather provided by
  // a feature of sorts.

  updateStreamer(position, virtualWorld, interiorId, type) {
    pawnInvoke('Streamer_UpdateEx', 'ifffiii', this.id_, position.x, position.y, position.z,
               virtualWorld, interiorId, type);
  }

  // -----------------------------------------------------------------------------------------------
  // The following methods are only meant for testing!

  // Simulates connecting of a player optionally identified by id |name| for the purposes of tests.
  // Make sure to also call |destroyForTest| after the test is complete to remove the player again.
  static createForTest(playerId, nickname) {
    playerId = playerId || 0;

    if (players.hasOwnProperty(playerId))
      throw new Error('Unable to create a player for testing purposes, id ' + playerId + ' already taken.');

    players[playerId] = new Player(playerCreateSymbol, playerId);
    players[playerId].name_ = nickname || 'TestPlayer';
    players[playerId].ipAddress_ = TEST_PLAYER_IDENTIFIER;

    return players[playerId];
  }

  // Destroys the player instance of |playerId| for the purposes of testing. The associated player
  // must have been created by a test as well, otherwise an exception will be thrown.
  static destroyForTest(player) {
    if (!players.hasOwnProperty(player.id))
      throw new Error('No player with this id has connected to the server.');

    if (player.ipAddress != TEST_PLAYER_IDENTIFIER)
      throw new Error('The player with this id was not created by a test.');

    players[player.id].markAsDisconnected();
    delete players[player.id];
  }
};

// Invalid player id. Must be equal to SA-MP's INVALID_PLAYER_ID definition.
Player.INVALID_ID = 0xFFFF;

// The level of a player. Can be accessed using the `level` property on a Player instance.
Player.LEVEL_PLAYER = 0;
Player.LEVEL_ADMINISTRATOR = 1;
Player.LEVEL_MANAGEMENT = 2;

// The states a player can be in. Used by Player.state and `playerstatechange` events.
Player.STATE_NONE = 0;
Player.STATE_ON_FOOT = 1;
Player.STATE_DRIVER = 2;
Player.STATE_PASSENGER = 3;
Player.STATE_EXIT_VEHICLE = 4;
Player.STATE_ENTER_VEHICLE_DRIVER = 5;
Player.STATE_ENTER_VEHICLE_PASSENGER = 6;
Player.STATE_WASTED = 7;
Player.STATE_SPAWNED = 8;
Player.STATE_SPECTATING = 9;

// Loads the activities of a player and installs them on |Player|.
require('entities/player_activities.js')(Player);

// Called when a player connects to Las Venturas Playground. Registers the player as being in-game
// and initializes the Player instance for them.
self.addEventListener('playerconnect', event =>
    players[event.playerid] = new Player(playerCreateSymbol, event.playerid));

// Called when the level of a player changes. This event is custom to Las Venturas Playground.
self.addEventListener('playerlevelchange', event => {
  if (!players.hasOwnProperty(event.playerid))
    return;

  switch(event.newlevel) {
    case 2:  // AdministratorLevel
      players[event.playerid].level_ = Player.LEVEL_ADMINISTRATOR;
      break;
    case 3:  // ManagementLevel
      players[event.playerid].level_ = Player.LEVEL_MANAGEMENT;
      break;
    default:
      players[event.playerid].level_ = Player.LEVEL_PLAYER;
      break;
  }
});

// Called when a player's activity changes. This event is custom to Las Venturas Playground.
self.addEventListener('playeractivitychange', event => {
  if (!players.hasOwnProperty(event.playerid))
    return;

  player[event.playerid].activity_ = event.activity;
});

// Called when a player disconnects from the server. Removes the player from our registry. The
// removal will be done at the end of the event loop, to make sure that the other playerdisconnect
// listeners will still be able to retrieve the Player object.
self.addEventListener('playerdisconnect', event => {
  wait(0).then(() => {
    if (!players.hasOwnProperty(event.playerid))
      return;

    players[event.playerid].markAsDisconnected();
    delete players[event.playerid];
  });
});

// Utility function: convert a player's level to a string.
global.playerLevelToString = (level, plural = false) => {
  switch (level) {
    case Player.LEVEL_PLAYER:
      return plural ? 'players' : 'player';
    case Player.LEVEL_ADMINISTRATOR:
      return plural ? 'administrators' : 'administrator';
    case Player.LEVEL_MANAGEMENT:
      return plural ? 'Management members' : 'Management member';
  }

  throw new Error('Invalid player level supplied: ' + level);
};

// Expose the Player object globally since it will be commonly used.
global.Player = Player;

exports = Player;
