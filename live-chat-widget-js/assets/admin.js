(function () {
  'use strict';

  const PUSHER_INSTANCE_LOCATOR = 'v1:us1:916a226c-33f4-40c7-99f6-9573bf971307';

  // ----------------------------------------------------
  // Chat Details
  // ----------------------------------------------------

  let chat = {
    rooms: [],
    messages: [],
    currentUser: false,
    currentUser: false,
    cursors: {}
  };

  // ----------------------------------------------------
  // Targeted Elements
  // ----------------------------------------------------

  const chatBody = $(document),
    chatRoomsList = $('#rooms'),
    chatReplyMessage = $('#replyMessage'),
    response = $('.response'),
    roomTitle = $('#room-title');


  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------

  const helpers = {
    /**
     * Clear the chat messages UI
     */
    clearChatMessages: () => $('#chat-msgs').html(''),

    /**
     * Add a new chat message to the chat window.
     */
    displayChatMessage: message => {
      if (chat.messages[message.id] === undefined) {
        chat.messages[message.id] = message;
        const messaageDate = new Date(message.createdAt),
          formatted_date = messaageDate.getFullYear() + "-" + (messaageDate.getMonth() + 1) + "-" + messaageDate.getDate() + " " + messaageDate.getHours() + ":" + messaageDate.getMinutes();


        $('#chat-msgs').prepend(
          `<tr>
            <td>
              <div class="sender">${message.sender.name} @ <span class="date">${formatted_date}</span></div>
              <div class="message">${message.text}</div>
            </td>
          </tr>`
        );
        // set cursor
        if (chat && chat.messages && chat.messages.length > 0) {

          if (!chat.cursors[message.roomId] || chat.cursors[message.roomId] < message.id) {
            chat.currentUser.setReadCursor({
              roomId: message.roomId,
              position: message.id
            }).then(() => {
              console.log('Success! Set cursor', message.id);
              chat.cursors[message.roomId] = message.id;
              // remove unread icon
              var userRoom = $(`.nav-item #${message.roomId} i`).removeClass('fas fa-envelope');
            })
              .catch(err => {
                console.log(`Error setting cursor: ${err}`);
              });
          }

        }
      }
    },

    /**
     * Load chatroom with messages
     */
    loadChatRoom: evt => {
      // clear if we have set it before
      chat.messages = [];

      chat.currentRoom = chat.rooms[$(evt.target).data('room-id')];

      if (chat.currentRoom !== undefined) {
        helpers.showUserRoom(chat.currentRoom.name);

        helpers.clearChatMessages();
        const roomMsgs = chat.rooms[chat.currentRoom.id].messages;
        if (roomMsgs && roomMsgs.length > 0) {
          roomMsgs.forEach(message => helpers.displayChatMessage(message));
        }
      }

      evt.preventDefault();
    },

    /**
     * Reply a message
     */
    replyMessage: evt => {
      evt.preventDefault();

      const message = $('#replyMessage input')
        .val()
        .trim();

      chat.currentUser.sendMessage(
        { text: message, roomId: chat.currentRoom.id },
        msgId => console.log('Message added!'),
        error =>
          console.log(
            `Error adding message to ${chat.currentRoom.id}: ${error}`
          )
      );

      $('#replyMessage input').val('');
    },

    /**
     * Load the pusher chat manager
     */
    loadChatManager: () => {
      const chatManager = new Chatkit.ChatManager({
        userId: 'Chatkit-dashboard',
        instanceLocator: PUSHER_INSTANCE_LOCATOR,
        tokenProvider: new Chatkit.TokenProvider({
          url: '/session/auth',
          userId: 'Chatkit-dashboard',
        }),
      });

      chatManager.connect({
        onAddedToRoom: room => {
          // if we dont have romms initial
          if (chat.currentRoom == undefined && chat.rooms.length == 0) {
            chat.currentRoom = room;
            helpers.showUserRoom(chat.currentRoom.name);
          }

          console.log(`Added to room ${room.name}`);
          // on new user income add it in sidebar
          helpers.addUser(room);
          $(`.nav-item #${room.id}`).on('click', 'li', helpers.loadChatRoom);

          // add new Room subscription
          chat.currentUser.subscribeToRoom({
            roomId: room.id,
            hooks: {
              onMessage: message => {
                if (chat.rooms[message.roomId].hasOwnProperty('messages')) {
                  const currentMsgs = chat.rooms[message.roomId].messages;

                  if (currentMsgs.length == 0 || currentMsgs[currentMsgs.length - 1].id < message.id) {
                    // insert msg in current room
                    currentMsgs.push(message);
                    helpers.showMsgCondition(message);

                    // test
                    helpers.rorderRomsList(chat.rooms)
                  }
                } else {
                  chat.rooms[message.roomId].messages = [message];
                  helpers.showMsgCondition(message);

                  // test
                  helpers.rorderRomsList(chat.rooms)
                }
              },
            },
          });
          // end new Room subscription
        }
      }).then(user => {
        chat.currentUser = user;

        // Get all rooms and put a link on the sidebar...
        user.rooms.forEach(room => {
          const cursor = user.readCursor({
            roomId: room.id,
            hooks: {
              onNewReadCursor: cursor => console.log(cursor)
            }
          });
          console.log(`read up to message ID`, cursor && cursor.position ? cursor.position : cursor);
          if (cursor) {
            chat.cursors[room.id] = cursor.position;
          }

          helpers.addUser(room);

          // add subscription to every user

          user.fetchMessages({
            roomId: room.id,
          }).then(msgs => {
            helpers.clearChatMessages();
            if (msgs.length > 0) {
              chat.rooms[room.id].messages = msgs;
            }

            chat.currentUser.subscribeToRoom({
              roomId: room.id,
              hooks: {
                onMessage: message => {

                  if (chat.rooms[message.roomId].hasOwnProperty('messages')) {
                    const currentMsgs = chat.rooms[message.roomId].messages;
                    // if msg is new
                    if (currentMsgs.length == 0 || currentMsgs[currentMsgs.length - 1].id < message.id) {
                      // insert msg in current room
                      currentMsgs.push(message);
                      helpers.showMsgCondition(message);

                      // test
                      helpers.rorderRomsList(chat.rooms)
                      console.log('reorder on new msg');
                    }
                    // if cursor is not set yet, but we have new msg or last msg is not read yet
                    if (!chat.cursors[message.roomId] && currentMsgs.length > 0 || chat.cursors[message.roomId] &&
                      chat.cursors[message.roomId] < message.id && chat.currentUser.id != message.senderId) {
                      helpers.showMsgCondition(message);

                      // test
                      helpers.rorderRomsList(chat.rooms)
                    }
                  } else {
                    chat.rooms[message.roomId].messages = [message];
                    helpers.showMsgCondition(message);

                    // test
                    helpers.rorderRomsList(chat.rooms)
                  }
                },
              },
            }).then(room => helpers.rorderRomsList(chat.rooms)); // test
          });
        });
      });
    },
    addUser: (room) => {
      if (!chat.rooms[room.id]) {
        chat.rooms[room.id] = room;

        $('#rooms').append(
          `<li class="nav-item"><a data-room-id="${room.id}" id="${room.id}" class="nav-link" href="#">${room.name}<i class="messageStatus"></i></a></li>`
        );
      }
    },
    addIconForUnreadMsg: roomId => {
      $(`.nav-item #${roomId} i`).addClass('fas fa-envelope');
    },
    showUserRoom: roomName => {
      response.show();
      roomTitle.text(roomName);
    },
    /* show msg it if we are in this room at the moment  
    or add unread icon */
    showMsgCondition: message => {
      if (chat.currentRoom && chat.currentRoom.id == message.roomId) {
        helpers.displayChatMessage(message);
      } else {
        helpers.addIconForUnreadMsg(message.roomId);
      }
    },
    // test
    rorderRomsList: usersRooms => {
      // do it if we have more than 1 user
      if (usersRooms.length > 1) { 
        // add li msg position
        usersRooms.forEach((room) => {
          if (room.hasOwnProperty('messages')) {
            let lastMessage = room.messages[room.messages.length - 1],
              cursor = chat.cursors[lastMessage.roomId];

            $(`#${lastMessage.roomId}`).parent().data('position', lastMessage.id);
          } else {
            $(`#${room.id}`).parent().data('position', 0);
          }
        });

        let items = chatRoomsList.children("li");

        items.detach().sort((a, b) => {
          // order by desc date
          return ($(b).data('position')) > ($(a).data('position')) ? 1 : -1;
        });
        chatRoomsList.append(items);
      }
    }
  };

  // ----------------------------------------------------
  // Register page event listeners
  // ----------------------------------------------------

  chatBody.ready(helpers.loadChatManager);
  chatReplyMessage.on('submit', helpers.replyMessage);
  chatRoomsList.on('click', 'li', helpers.loadChatRoom);
})();
