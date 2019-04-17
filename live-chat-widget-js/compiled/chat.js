"use strict";

(function () {
  'use strict';

  var PUSHER_INSTANCE_LOCATOR = 'v1:us1:916a226c-33f4-40c7-99f6-9573bf971307'; // ----------------------------------------------------
  // Chat Details
  // ----------------------------------------------------

  var chat = {
    messages: [],
    room: undefined,
    userId: undefined,
    currentUser: undefined,
    cursorID: undefined
  }; // ----------------------------------------------------
  // Targeted Elements
  // ----------------------------------------------------

  var chatPage = $(document);
  var chatWindow = $('.chatbubble');
  var chatHeader = chatWindow.find('.unexpanded');
  var chatBody = chatWindow.find('.chat-window');
  var newMessageInput = $('#newMessage');
  var messageStatusIcon = $('.messageStatus'); // ----------------------------------------------------
  // Helpers
  // ----------------------------------------------------

  var helpers = {
    /**
     * Toggles the display of the chat window.
     */
    ToggleChatWindow: function ToggleChatWindow() {
      chatWindow.toggleClass('opened');
      chatHeader.find('.title').text(chatWindow.hasClass('opened') ? 'Minimize Chat Window' : 'Chat with Support');
    },

    /**
     * Show the appropriate display screen. Login screen
     * or Chat screen.
     */
    ShowAppropriateChatDisplay: function ShowAppropriateChatDisplay() {
      chat.room && chat.room.id ? helpers.ShowChatRoomDisplay() : helpers.ShowChatInitiationDisplay();
    },

    /**
     * Show the enter details form
     */
    ShowChatInitiationDisplay: function ShowChatInitiationDisplay() {
      chatBody.find('.chats').removeClass('active');
      chatBody.find('.login-screen').addClass('active');
    },

    /**
     * Show the chat room messages dislay.
     */
    ShowChatRoomDisplay: function ShowChatRoomDisplay() {
      chatBody.find('.chats').addClass('active');
      chatBody.find('.login-screen').removeClass('active');
      var chatManager = new Chatkit.ChatManager({
        userId: chat.userId,
        instanceLocator: PUSHER_INSTANCE_LOCATOR,
        tokenProvider: new Chatkit.TokenProvider({
          url: '/session/auth'
        })
      });
      chatManager.connect().then(function (currentUser) {
        chat.currentUser = currentUser;
        currentUser.fetchMessages({
          roomId: chat.room.id,
          direction: 'older'
        }).then(function (messages) {
          chatBody.find('.loader-wrapper').hide();
          chatBody.find('.input, .messages').show();
          messages.forEach(function (message) {
            return helpers.NewChatMessage(message);
          });
          currentUser.subscribeToRoom({
            roomId: chat.room.id,
            hooks: {
              onMessage: function onMessage(message) {
                helpers.NewChatMessage(message);
                /* Start Reading cursor
                user’s read cursors are available immediately upon connecting
                (A cursor that hasn’t been set yet is undefined.) */

                var cursor = currentUser.readCursor({
                  roomId: chat.room.id
                });
                console.log("read up to message ID", cursor); // add unread icon

                if (message.senderId != chat.userId && (!cursor || cursor && cursor.position < message.id)) {
                  messageStatusIcon.addClass('fas fa-envelope');
                }

                chat.cursorID = cursor && cursor.position ? cursor.position : undefined;
                /* end Reading cursor */
              }
            }
          });
        }, function (err) {
          console.error(err);
        });
      }).catch(function (err) {
        console.log(err, 'Connection error');
      });
    },

    /**
     * Append a message to the chat messages UI.
     */
    NewChatMessage: function NewChatMessage(message) {
      if (chat.messages[message.id] === undefined) {
        var messageClass = message.sender.id !== chat.userId ? 'support' : 'user';
        chatBody.find('ul.messages').append("<li class=\"clearfix message ".concat(messageClass, "\">\n                        <div class=\"sender\">").concat(message.sender.name, "</div>\n                        <div class=\"message\">").concat(message.text, "</div>\n                    </li>"));
        chat.messages[message.id] = message;
        chatBody.scrollTop(chatBody[0].scrollHeight);
      }
    },

    /**
     * Send a message to the chat channel
     */
    SendMessageToSupport: function SendMessageToSupport(evt) {
      evt.preventDefault();
      var message = $('#newMessage').val().trim();
      chat.currentUser.sendMessage({
        text: message,
        roomId: chat.room.id
      }).then(function (msgId) {
        console.log('Message added!', msgId); // set messages as read

        chat.currentUser.setReadCursor({
          roomId: chat.room.id,
          position: msgId
        });
        chat.cursorID = msgId;
      }, function (error) {
        console.log("Error adding message to ".concat(chat.room.id, ": ").concat(error));
      });
      $('#newMessage').val('');
    },

    /**
     * Logs user into a chat session
     */
    LogIntoChatSession: function LogIntoChatSession(evt) {
      var name = $('#fullname').val().trim();
      var email = $('#email').val().trim().toLowerCase(); // Disable the form

      chatBody.find('#loginScreenForm input, #loginScreenForm button').attr('disabled', true);

      if (name !== '' && name.length >= 3 && email !== '' && email.length >= 5) {
        axios.post('/session/load', {
          name: name,
          email: email
        }).then(function (response) {
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
    SetAsRead: function SetAsRead(ev) {
      if (chat && chat.messages && chat.messages.length > 0) {
        var lastMsgId = chat.messages[chat.messages.length - 1].id;

        if (chat.cursorID != lastMsgId) {
          chat.currentUser.setReadCursor({
            roomId: chat.room.id,
            position: lastMsgId
          }).then(function () {
            console.log('Success! Set cursor', lastMsgId);
            chat.cursorID = lastMsgId; // remove unread icon

            messageStatusIcon.removeClass('fas fa-envelope');
          }).catch(function (err) {
            console.log("Error setting cursor: ".concat(err));
          });
        }
      }
    }
  }; // ----------------------------------------------------
  // Register page event listeners
  // ----------------------------------------------------

  chatPage.ready(helpers.ShowAppropriateChatDisplay);
  chatHeader.on('click', helpers.ToggleChatWindow);
  chatBody.find('#loginScreenForm').on('submit', helpers.LogIntoChatSession);
  chatBody.find('#messageSupport').on('submit', helpers.SendMessageToSupport);
  newMessageInput.focus(helpers.SetAsRead);
})();