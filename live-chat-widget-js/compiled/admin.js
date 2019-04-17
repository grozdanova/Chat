"use strict";

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

(function () {
  'use strict';

  var _chat;

  var PUSHER_INSTANCE_LOCATOR = 'v1:us1:916a226c-33f4-40c7-99f6-9573bf971307'; // ----------------------------------------------------
  // Chat Details
  // ----------------------------------------------------

  var chat = (_chat = {
    rooms: [],
    messages: [],
    currentUser: false
  }, _defineProperty(_chat, "currentUser", false), _defineProperty(_chat, "cursors", {}), _chat); // ----------------------------------------------------
  // Targeted Elements
  // ----------------------------------------------------

  var chatBody = $(document),
      chatRoomsList = $('#rooms'),
      chatReplyMessage = $('#replyMessage'),
      response = $('.response'),
      roomTitle = $('#room-title'); // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------

  var helpers = {
    /**
     * Clear the chat messages UI
     */
    clearChatMessages: function clearChatMessages() {
      return $('#chat-msgs').html('');
    },

    /**
     * Add a new chat message to the chat window.
     */
    displayChatMessage: function displayChatMessage(message) {
      if (chat.messages[message.id] === undefined) {
        chat.messages[message.id] = message;
        var messaageDate = new Date(message.createdAt),
            formatted_date = messaageDate.getFullYear() + "-" + (messaageDate.getMonth() + 1) + "-" + messaageDate.getDate() + " " + messaageDate.getHours() + ":" + messaageDate.getMinutes();
        $('#chat-msgs').prepend("<tr>\n            <td>\n              <div class=\"sender\">".concat(message.sender.name, " @ <span class=\"date\">").concat(formatted_date, "</span></div>\n              <div class=\"message\">").concat(message.text, "</div>\n            </td>\n          </tr>")); // set cursor

        if (chat && chat.messages && chat.messages.length > 0) {
          if (!chat.cursors[message.roomId] || chat.cursors[message.roomId] < message.id) {
            chat.currentUser.setReadCursor({
              roomId: message.roomId,
              position: message.id
            }).then(function () {
              console.log('Success! Set cursor', message.id);
              chat.cursors[message.roomId] = message.id; // remove unread icon

              var userRoom = $(".nav-item #".concat(message.roomId, " i")).removeClass('fas fa-envelope');
            }).catch(function (err) {
              console.log("Error setting cursor: ".concat(err));
            });
          }
        }
      }
    },

    /**
     * Load chatroom with messages
     */
    loadChatRoom: function loadChatRoom(evt) {
      // clear if we have set it before
      chat.messages = [];
      chat.currentRoom = chat.rooms[$(evt.target).data('room-id')];

      if (chat.currentRoom !== undefined) {
        helpers.showUserRoom(chat.currentRoom.name);
        helpers.clearChatMessages();
        var roomMsgs = chat.rooms[chat.currentRoom.id].messages;

        if (roomMsgs && roomMsgs.length > 0) {
          roomMsgs.forEach(function (message) {
            return helpers.displayChatMessage(message);
          });
        }
      }

      evt.preventDefault();
    },

    /**
     * Reply a message
     */
    replyMessage: function replyMessage(evt) {
      evt.preventDefault();
      var message = $('#replyMessage input').val().trim();
      chat.currentUser.sendMessage({
        text: message,
        roomId: chat.currentRoom.id
      }, function (msgId) {
        return console.log('Message added!');
      }, function (error) {
        return console.log("Error adding message to ".concat(chat.currentRoom.id, ": ").concat(error));
      });
      $('#replyMessage input').val('');
    },

    /**
     * Load the pusher chat manager
     */
    loadChatManager: function loadChatManager() {
      var chatManager = new Chatkit.ChatManager({
        userId: 'Chatkit-dashboard',
        instanceLocator: PUSHER_INSTANCE_LOCATOR,
        tokenProvider: new Chatkit.TokenProvider({
          url: '/session/auth',
          userId: 'Chatkit-dashboard'
        })
      });
      chatManager.connect({
        onAddedToRoom: function onAddedToRoom(room) {
          // if we dont have romms initial
          if (chat.currentRoom == undefined && chat.rooms.length == 0) {
            chat.currentRoom = room;
            helpers.showUserRoom(chat.currentRoom.name);
          }

          console.log("Added to room ".concat(room.name)); // on new user income add it in sidebar

          helpers.addUser(room);
          $(".nav-item #".concat(room.id)).on('click', 'li', helpers.loadChatRoom); // add new Room subscription

          chat.currentUser.subscribeToRoom({
            roomId: room.id,
            hooks: {
              onMessage: function onMessage(message) {
                if (chat.rooms[message.roomId].hasOwnProperty('messages')) {
                  var currentMsgs = chat.rooms[message.roomId].messages;

                  if (currentMsgs.length == 0 || currentMsgs[currentMsgs.length - 1].id < message.id) {
                    // insert msg in current room
                    currentMsgs.push(message);
                    helpers.showMsgCondition(message); // test

                    helpers.rorderRomsList(chat.rooms);
                  }
                } else {
                  chat.rooms[message.roomId].messages = [message];
                  helpers.showMsgCondition(message); // test

                  helpers.rorderRomsList(chat.rooms);
                }
              }
            }
          }); // end new Room subscription
        }
      }).then(function (user) {
        chat.currentUser = user; // Get all rooms and put a link on the sidebar...

        user.rooms.forEach(function (room) {
          var cursor = user.readCursor({
            roomId: room.id,
            hooks: {
              onNewReadCursor: function onNewReadCursor(cursor) {
                return console.log(cursor);
              }
            }
          });
          console.log("read up to message ID", cursor && cursor.position ? cursor.position : cursor);

          if (cursor) {
            chat.cursors[room.id] = cursor.position;
          }

          helpers.addUser(room); // add subscription to every user

          user.fetchMessages({
            roomId: room.id
          }).then(function (msgs) {
            helpers.clearChatMessages();

            if (msgs.length > 0) {
              chat.rooms[room.id].messages = msgs;
            }

            chat.currentUser.subscribeToRoom({
              roomId: room.id,
              hooks: {
                onMessage: function onMessage(message) {
                  if (chat.rooms[message.roomId].hasOwnProperty('messages')) {
                    var currentMsgs = chat.rooms[message.roomId].messages; // if msg is new

                    if (currentMsgs.length == 0 || currentMsgs[currentMsgs.length - 1].id < message.id) {
                      // insert msg in current room
                      currentMsgs.push(message);
                      helpers.showMsgCondition(message); // test

                      helpers.rorderRomsList(chat.rooms);
                      console.log('reorder on new msg');
                    } // if cursor is not set yet, but we have new msg or last msg is not read yet


                    if (!chat.cursors[message.roomId] && currentMsgs.length > 0 || chat.cursors[message.roomId] && chat.cursors[message.roomId] < message.id && chat.currentUser.id != message.senderId) {
                      helpers.showMsgCondition(message); // test

                      helpers.rorderRomsList(chat.rooms);
                    }
                  } else {
                    chat.rooms[message.roomId].messages = [message];
                    helpers.showMsgCondition(message); // test

                    helpers.rorderRomsList(chat.rooms);
                  }
                }
              }
            }).then(function (room) {
              return helpers.rorderRomsList(chat.rooms);
            }); // test
          });
        });
      });
    },
    addUser: function addUser(room) {
      if (!chat.rooms[room.id]) {
        chat.rooms[room.id] = room;
        $('#rooms').append("<li class=\"nav-item\"><a data-room-id=\"".concat(room.id, "\" id=\"").concat(room.id, "\" class=\"nav-link\" href=\"#\">").concat(room.name, "<i class=\"messageStatus\"></i></a></li>"));
      }
    },
    addIconForUnreadMsg: function addIconForUnreadMsg(roomId) {
      $(".nav-item #".concat(roomId, " i")).addClass('fas fa-envelope');
    },
    showUserRoom: function showUserRoom(roomName) {
      response.show();
      roomTitle.text(roomName);
    },

    /* show msg it if we are in this room at the moment  
    or add unread icon */
    showMsgCondition: function showMsgCondition(message) {
      if (chat.currentRoom && chat.currentRoom.id == message.roomId) {
        helpers.displayChatMessage(message);
      } else {
        helpers.addIconForUnreadMsg(message.roomId);
      }
    },
    // test
    rorderRomsList: function rorderRomsList(usersRooms) {
      // do it if we have more than 1 user
      if (usersRooms.length > 1) {
        // add li msg position
        usersRooms.forEach(function (room) {
          if (room.hasOwnProperty('messages')) {
            var lastMessage = room.messages[room.messages.length - 1],
                cursor = chat.cursors[lastMessage.roomId];
            $("#".concat(lastMessage.roomId)).parent().data('position', lastMessage.id);
          } else {
            $("#".concat(room.id)).parent().data('position', 0);
          }
        });
        var items = chatRoomsList.children("li");
        items.detach().sort(function (a, b) {
          // order by desc date
          return $(b).data('position') > $(a).data('position') ? 1 : -1;
        });
        chatRoomsList.append(items);
      }
    }
  }; // ----------------------------------------------------
  // Register page event listeners
  // ----------------------------------------------------

  chatBody.ready(helpers.loadChatManager);
  chatReplyMessage.on('submit', helpers.replyMessage);
  chatRoomsList.on('click', 'li', helpers.loadChatRoom);
})();