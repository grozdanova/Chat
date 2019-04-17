(function () {
  'use strict';

  const PUSHER_INSTANCE_LOCATOR = 'v1:us1:916a226c-33f4-40c7-99f6-9573bf971307';

  // ----------------------------------------------------
  // Chat Details
  // ----------------------------------------------------

  let chat = {
    messages: [],
    room: undefined,
    userId: undefined,
    currentUser: undefined,
    cursorID: undefined
  };

  // ----------------------------------------------------
  // Targeted Elements
  // ----------------------------------------------------

  const chatPage = $(document);
  const chatWindow = $('.chatbubble');
  const chatHeader = chatWindow.find('.unexpanded');
  const chatBody = chatWindow.find('.chat-window');
  const newMessageInput = $('#newMessage');
  const messageStatusIcon = $('.messageStatus');

  // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------

  let helpers = {
    /**
     * Toggles the display of the chat window.
     */
    ToggleChatWindow: function () {
      chatWindow.toggleClass('opened');
      chatHeader
        .find('.title')
        .text(
        chatWindow.hasClass('opened')
          ? 'Minimize Chat Window'
          : 'Chat with Support'
        );
    },

    /**
     * Show the appropriate display screen. Login screen
     * or Chat screen.
     */
    ShowAppropriateChatDisplay: function () {
      chat.room && chat.room.id
        ? helpers.ShowChatRoomDisplay()
        : helpers.ShowChatInitiationDisplay();
    },

    /**
     * Show the enter details form
     */
    ShowChatInitiationDisplay: function () {
      chatBody.find('.chats').removeClass('active');
      chatBody.find('.login-screen').addClass('active');
    },

    /**
     * Show the chat room messages dislay.
     */
    ShowChatRoomDisplay: function () {
      chatBody.find('.chats').addClass('active');
      chatBody.find('.login-screen').removeClass('active');

      const chatManager = new Chatkit.ChatManager({
        userId: chat.userId,
        instanceLocator: PUSHER_INSTANCE_LOCATOR,
        tokenProvider: new Chatkit.TokenProvider({
          url: '/session/auth',
        }),
      });

      chatManager
        .connect()
        .then(currentUser => {
          chat.currentUser = currentUser;

          currentUser
            .fetchMessages({
              roomId: chat.room.id,
              direction: 'older',
            })
            .then(
            messages => {
              chatBody.find('.loader-wrapper').hide();
              chatBody.find('.input, .messages').show();

              messages.forEach(message => helpers.NewChatMessage(message));

              currentUser.subscribeToRoom({
                roomId: chat.room.id,
                hooks: {
                  onMessage: message => {
                    helpers.NewChatMessage(message)

                    /* Start Reading cursor
                    user’s read cursors are available immediately upon connecting
                    (A cursor that hasn’t been set yet is undefined.) */
                    const cursor = currentUser.readCursor({
                      roomId: chat.room.id
                    });
                    console.log(`read up to message ID`, cursor);
                   
                    // add unread icon
                    if (message.senderId != chat.userId && (!cursor || cursor && cursor.position < message.id)) {
                        messageStatusIcon.addClass('fas fa-envelope');
                    }
                    chat.cursorID = cursor && cursor.position ? cursor.position : undefined;
                    /* end Reading cursor */
                  }
                },
              });
            },
            err => {
              console.error(err);
            }
            );
        })
        .catch(err => {
          console.log(err, 'Connection error');
        });
    },

    /**
     * Append a message to the chat messages UI.
     */
    NewChatMessage: function (message) {
      if (chat.messages[message.id] === undefined) {
        const messageClass =
          message.sender.id !== chat.userId ? 'support' : 'user';

        chatBody.find('ul.messages').append(
          `<li class="clearfix message ${messageClass}">
                        <div class="sender">${message.sender.name}</div>
                        <div class="message">${message.text}</div>
                    </li>`
        );

        chat.messages[message.id] = message;

        chatBody.scrollTop(chatBody[0].scrollHeight);
      }
    },

    /**
     * Send a message to the chat channel
     */
    SendMessageToSupport: function (evt) {
      evt.preventDefault();

      const message = $('#newMessage')
        .val()
        .trim();

      chat.currentUser.sendMessage(
        { text: message, roomId: chat.room.id }
      ).then(
        msgId => {
          console.log('Message added!', msgId);
          // set messages as read
          chat.currentUser.setReadCursor({
            roomId: chat.room.id,
            position: msgId,
          });
          chat.cursorID = msgId;
        },
        error => {
          console.log(`Error adding message to ${chat.room.id}: ${error}`);
        }
      );

      $('#newMessage').val('');
    },

    /**
     * Logs user into a chat session
     */
    LogIntoChatSession: function (evt) {
      const name = $('#fullname')
        .val()
        .trim();
      const email = $('#email')
        .val()
        .trim()
        .toLowerCase();

      // Disable the form
      chatBody
        .find('#loginScreenForm input, #loginScreenForm button')
        .attr('disabled', true);

      if (
        name !== '' &&
        name.length >= 3 &&
        (email !== '' && email.length >= 5)
      ) {
        axios.post('/session/load', { name, email }).then(response => {
          chat.userId = email;
          chat.room = response.data;
          helpers.ShowAppropriateChatDisplay();
        });
      } else {
        alert('Enter a valid name and email.');
      }

      evt.preventDefault();
    },

    /**
     * Mark message as read
     */
    SetAsRead: function (ev) {

      if (chat && chat.messages && chat.messages.length > 0) {
        const lastMsgId = chat.messages[chat.messages.length - 1].id;

        if (chat.cursorID != lastMsgId) {
          chat.currentUser.setReadCursor({
            roomId: chat.room.id,
            position: lastMsgId
          }).then(() => {
            console.log('Success! Set cursor', lastMsgId);
            chat.cursorID = lastMsgId;
            // remove unread icon
            messageStatusIcon.removeClass('fas fa-envelope');
          })
            .catch(err => {
              console.log(`Error setting cursor: ${err}`);
            });
        }

      }
    }

  };



  // ----------------------------------------------------
  // Register page event listeners
  // ----------------------------------------------------

  chatPage.ready(helpers.ShowAppropriateChatDisplay);
  chatHeader.on('click', helpers.ToggleChatWindow);
  chatBody.find('#loginScreenForm').on('submit', helpers.LogIntoChatSession);
  chatBody.find('#messageSupport').on('submit', helpers.SendMessageToSupport);
  newMessageInput.focus(helpers.SetAsRead);
})();
