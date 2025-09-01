const {
  errors,
  debug,
  EventEmitter,
  TelegramBotPolling,
  TelegramBotWebHook,
  deprecate,
  _messageTypes,
  _deprecatedMessageTypes,
} = require('./base');

class TelegramBotCore extends EventEmitter {
  /**
   * The different errors the library uses.
   * @type {Object}
   */
  static get errors() {
    return errors;
  }

  /**
   * The types of message updates the library handles.
   * @type {String[]}
   */
  static get messageTypes() {
    return _messageTypes;
  }

  /**
   * Add listener for the specified [event](https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#events).
   * This is the usual `emitter.on()` method.
   * @param {String} event
   * @param {Function} listener
   * @see {@link https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#events|Available events}
   * @see https://nodejs.org/api/events.html#events_emitter_on_eventname_listener
   */
  on(event, listener) {
    if (_deprecatedMessageTypes.indexOf(event) !== -1) {
      const url = 'https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#events';
      deprecate(`Events ${_deprecatedMessageTypes.join(',')} are deprecated. See the updated list of events: ${url}`);
    }
    super.on(event, listener);
  }

  /**
   * Both request method to obtain messages are implemented. To use standard polling, set `polling: true`
   * on `options`. Notice that [webHook](https://core.telegram.org/bots/api#setwebhook) will need a SSL certificate.
   * Emits `message` when a message arrives.
   *
   * @class TelegramBot
   * @constructor
   * @param {String} token Bot Token
   * @param {Object} [options]
   * @param {Boolean|Object} [options.polling=false] Set true to enable polling or set options.
   *  If a WebHook has been set, it will be deleted automatically.
   * @param {String|Number} [options.polling.timeout=10] *Deprecated. Use `options.polling.params` instead*.
   *  Timeout in seconds for long polling.
   * @param {Boolean} [options.testEnvironment=false] Set true to  work with test enviroment.
   * When working with the test environment, you may use HTTP links without TLS to test your Web App.
   * @param {String|Number} [options.polling.interval=300] Interval between requests in miliseconds
   * @param {Boolean} [options.polling.autoStart=true] Start polling immediately
   * @param {Object} [options.polling.params] Parameters to be used in polling API requests.
   *  See https://core.telegram.org/bots/api#getupdates for more information.
   * @param {Number} [options.polling.params.timeout=10] Timeout in seconds for long polling.
   * @param {Boolean|Object} [options.webHook=false] Set true to enable WebHook or set options
   * @param {String} [options.webHook.host="0.0.0.0"] Host to bind to
   * @param {Number} [options.webHook.port=8443] Port to bind to
   * @param {String} [options.webHook.key] Path to file with PEM private key for webHook server.
   *  The file is read **synchronously**!
   * @param {String} [options.webHook.cert] Path to file with PEM certificate (public) for webHook server.
   *  The file is read **synchronously**!
   * @param {String} [options.webHook.pfx] Path to file with PFX private key and certificate chain for webHook server.
   *  The file is read **synchronously**!
   * @param {Boolean} [options.webHook.autoOpen=true] Open webHook immediately
   * @param {Object} [options.webHook.https] Options to be passed to `https.createServer()`.
   *  Note that `options.webHook.key`, `options.webHook.cert` and `options.webHook.pfx`, if provided, will be
   *  used to override `key`, `cert` and `pfx` in this object, respectively.
   *  See https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener for more information.
   * @param {String} [options.webHook.healthEndpoint="/healthz"] An endpoint for health checks that always responds with 200 OK
   * @param {Boolean} [options.onlyFirstMatch=false] Set to true to stop after first match. Otherwise, all regexps are executed
   * @param {Object} [options.request] Options which will be added for all requests to telegram api.
   *  See https://github.com/request/request#requestoptions-callback for more information.
   * @param {String} [options.baseApiUrl="https://api.telegram.org"] API Base URl; useful for proxying and testing
   * @param {Boolean} [options.filepath=true] Allow passing file-paths as arguments when sending files,
   *  such as photos using `TelegramBot#sendPhoto()`. See [usage information][usage-sending-files-performance]
   *  for more information on this option and its consequences.
   * @param {Boolean} [options.badRejection=false] Set to `true`
   *  **if and only if** the Node.js version you're using terminates the
   *  process on unhandled rejections. This option is only for
   *  *forward-compatibility purposes*.
   * @see https://core.telegram.org/bots/api
   */
  constructor(token, options = {}) {
    super();
    this.token = token;
    this.options = options;
    this.options.polling = (typeof options.polling === 'undefined') ? false : options.polling;
    this.options.webHook = (typeof options.webHook === 'undefined') ? false : options.webHook;
    this.options.baseApiUrl = options.baseApiUrl || 'https://api.telegram.org';
    this.options.filepath = (typeof options.filepath === 'undefined') ? true : options.filepath;
    this.options.badRejection = (typeof options.badRejection === 'undefined') ? false : options.badRejection;
    this._textRegexpCallbacks = [];
    this._replyListenerId = 0;
    this._replyListeners = [];
    this._polling = null;
    this._webHook = null;

    if (options.polling) {
      const autoStart = options.polling.autoStart;
      if (typeof autoStart === 'undefined' || autoStart === true) {
        this.startPolling();
      }
    }

    if (options.webHook) {
      const autoOpen = options.webHook.autoOpen;
      if (typeof autoOpen === 'undefined' || autoOpen === true) {
        this.openWebHook();
      }
    }
  }

  /**
   * Start polling.
   * Rejects returned promise if a WebHook is being used by this instance.
   * @param {Object} [options]
   * @param {Boolean} [options.restart=true] Consecutive calls to this method causes polling to be restarted
   * @return {Promise}
   */
  startPolling(options = {}) {
    if (this.hasOpenWebHook()) {
      return Promise.reject(new errors.FatalError('Polling and WebHook are mutually exclusive'));
    }
    options.restart = typeof options.restart === 'undefined' ? true : options.restart;
    if (!this._polling) {
      this._polling = new TelegramBotPolling(this);
    }
    return this._polling.start(options);
  }

  /**
   * Alias of `TelegramBot#startPolling()`. This is **deprecated**.
   * @param {Object} [options]
   * @return {Promise}
   * @deprecated
   */
  initPolling() {
    deprecate('TelegramBot#initPolling() is deprecated. Use TelegramBot#startPolling() instead.');
    return this.startPolling();
  }

  /**
   * Stops polling after the last polling request resolves.
   * Multiple invocations do nothing if polling is already stopped.
   * Returning the promise of the last polling request is **deprecated**.
   * @param {Object} [options] Options
   * @param {Boolean} [options.cancel] Cancel current request
   * @param {String} [options.reason] Reason for stopping polling
   * @return {Promise}
   */
  stopPolling(options) {
    if (!this._polling) {
      return Promise.resolve();
    }
    return this._polling.stop(options);
  }

  /**
   * Open webhook.
   * Multiple invocations do nothing if webhook is already open.
   * Rejects returned promise if Polling is being used by this instance.
   *
   * @return {Promise}
   */
  openWebHook() {
    if (this.isPolling()) {
      return Promise.reject(new errors.FatalError('WebHook and Polling are mutually exclusive'));
    }
    if (!this._webHook) {
      this._webHook = new TelegramBotWebHook(this);
    }
    return this._webHook.open();
  }

  /**
   * Close webhook after closing all current connections.
   * Multiple invocations do nothing if webhook is already closed.
   *
   * @return {Promise} Promise
   */
  closeWebHook() {
    if (!this._webHook) {
      return Promise.resolve();
    }
    return this._webHook.close();
  }

  /**
   * Return true if using webhook and it is open i.e. accepts connections.
   * Otherwise, false.
   *
   * @return {Boolean}
   */
  hasOpenWebHook() {
    return this._webHook ? this._webHook.isOpen() : false;
  }

  /**
   * Return true if polling. Otherwise, false.
   *
   * @return {Boolean}
   */
  isPolling() {
    return this._polling ? this._polling.isPolling() : false;
  }

  /**
   * Register a RegExp to test against an incomming text message.
   * @param {RegExp}   regexpRexecuted with `exec`.
   * @param {Function} callback     Callback will be called with 2 parameters,
   * the `msg` and the result of executing `regexp.exec` on message text.
   */
  onText(regexp, callback) {
    this._textRegexpCallbacks.push({ regexp, callback });
  }

  /**
   * Remove a listener registered with `onText()`.
   * @param {RegExp} regexp RegExp used previously in `onText()`
   * @return {Object} deletedListener The removed reply listener if
   *   found. This object has `regexp` and `callback`
   *   properties. If not found, returns `null`.
   */
  removeTextListener(regexp) {
    const index = this._textRegexpCallbacks.findIndex((textListener) => String(textListener.regexp) === String(regexp));
    if (index === -1) {
      return null;
    }
    return this._textRegexpCallbacks.splice(index, 1)[0];
  }

  /**
   * Remove all listeners registered with `onText()`.
   */
  clearTextListeners() {
    this._textRegexpCallbacks = [];
  }

  /**
   * Register a reply to wait for a message response.
   *
   * @param {Number|String} chatId The chat id where the message cames from.
   * @param {Number|String} messageId The message id to be replied.
   * @param {Function} callback Callback will be called with the reply
   *  message.
   * @return {Number} id The ID of the inserted reply listener.
   */
  onReplyToMessage(chatId, messageId, callback) {
    const id = ++this._replyListenerId;
    this._replyListeners.push({
      id,
      chatId,
      messageId,
      callback,
    });
    return id;
  }

  /**
   * Removes a reply that has been prev. registered for a message response.
   * @param {Number} replyListenerId The ID of the reply listener.
   * @return {Object} deletedListener The removed reply listener if
   *   found. This object has `id`, `chatId`, `messageId` and `callback`
   *   properties. If not found, returns `null`.
   */
  removeReplyListener(replyListenerId) {
    const index = this._replyListeners.findIndex((replyListener) => replyListener.id === replyListenerId);
    if (index === -1) {
      return null;
    }
    return this._replyListeners.splice(index, 1)[0];
  }

  /**
   * Removes all replies that have been prev. registered for a message response.
   *
   * @return {Array} deletedListeners An array of removed listeners.
   */
  clearReplyListeners() {
    this._replyListeners = [];
  }
}

module.exports = TelegramBotCore;
