const {
  errors,
  debug,
  request,
  stream,
  fs,
  path,
  URL,
  qs,
  mime,
  fileType,
  pump,
  streamedRequest,
  stringify,
  deprecate
} = require('./base');

class TelegramBotRequest {
  constructor(bot) {
    this.bot = bot;
  }

  /**
   * Generates url with bot token and provided path/method you want to be got/executed by bot
   * @param {String} path
   * @return {String} url
   * @private
   * @see https://core.telegram.org/bots/api#making-requests
   */
  _buildURL(_path) {
    return `${this.bot.options.baseApiUrl}/bot${this.bot.token}${this.bot.options.testEnvironment ? '/test' : ''}/${_path}`;
  }

  /**
   * Fix 'reply_markup' parameter by making it JSON-serialized, as
   * required by the Telegram Bot API
   * @param {Object} obj Object; either 'form' or 'qs'
   * @private
   * @see https://core.telegram.org/bots/api#sendmessage
   */
  _fixReplyMarkup(obj) {
    const replyMarkup = obj.reply_markup;
    if (replyMarkup && typeof replyMarkup !== 'string') {
      obj.reply_markup = stringify(replyMarkup);
    }
  }

  /**
   * Fix 'entities' or 'caption_entities' or 'explanation_entities' parameter by making it JSON-serialized, as
   * required by the Telegram Bot API
   * @param {Object} obj Object;
   * @private
   * @see https://core.telegram.org/bots/api#sendmessage
   * @see https://core.telegram.org/bots/api#copymessage
   * @see https://core.telegram.org/bots/api#sendpoll
   */
  _fixEntitiesField(obj) {
    const entities = obj.entities;
    const captionEntities = obj.caption_entities;
    const explanationEntities = obj.explanation_entities;
    if (entities && typeof entities !== 'string') {
      obj.entities = stringify(entities);
    }

    if (captionEntities && typeof captionEntities !== 'string') {
      obj.caption_entities = stringify(captionEntities);
    }

    if (explanationEntities && typeof explanationEntities !== 'string') {
      obj.explanation_entities = stringify(explanationEntities);
    }
  }

  _fixAddFileThumbnail(options, opts) {
    if (options.thumb) {
      if (opts.formData === null) {
        opts.formData = {};
      }

      const attachName = 'photo';
      const [formData] = this._formatSendData(attachName, options.thumb.replace('attach://', ''));

      if (formData) {
        opts.formData[attachName] = formData[attachName];
        opts.qs.thumbnail = `attach://${attachName}`;
      }
    }
  }

  /**
   * Fix 'reply_parameters' parameter by making it JSON-serialized, as
   * required by the Telegram Bot API
   * @param {Object} obj Object; either 'form' or 'qs'
   * @private
   * @see https://core.telegram.org/bots/api#sendmessage
   */
  _fixReplyParameters(obj) {
    if (obj.hasOwnProperty('reply_parameters') && typeof obj.reply_parameters !== 'string') {
      obj.reply_parameters = stringify(obj.reply_parameters);
    }
  }

  /**
   * Make request against the API
   * @param {String} _path API endpoint
   * @param {Object} [options]
   * @private
   * @return {Promise}
   */
  _request(_path, options = {}) {
    if (!this.bot.token) {
      return Promise.reject(new errors.FatalError('Telegram Bot Token not provided!'));
    }

    if (this.bot.options.request) {
      Object.assign(options, this.bot.options.request);
    }

    if (options.form) {
      this._fixReplyMarkup(options.form);
      this._fixEntitiesField(options.form);
      this._fixReplyParameters(options.form);
    }
    if (options.qs) {
      this._fixReplyMarkup(options.qs);
      this._fixReplyParameters(options.qs);
    }

    options.method = 'POST';
    options.url = this._buildURL(_path);
    options.simple = false;
    options.resolveWithFullResponse = true;
    options.forever = true;
    debug('HTTP request: %j', options);
    return request(options)
      .then((resp) => {
        let data;
        try {
          data = resp.body = JSON.parse(resp.body);
        } catch (err) {
          throw new errors.ParseError(`Error parsing response: ${resp.body}`, resp);
        }

        if (data.ok) {
          return data.result;
        }

        throw new errors.TelegramError(`${data.error_code} ${data.description}`, resp);
      }).catch((error) => {
        if (error instanceof errors.BaseError) {
          throw error;
        }
        if (error.response) {
          throw new errors.TelegramError(error.message, error.response);
        }
        throw new errors.FatalError(error.message || 'Unknown error');
      });
  }

  /**
   * Format data to be uploaded; handles file paths, streams and buffers
   * @param {String} type
   * @param {String|stream.Stream|Buffer} data
   * @param {Object} fileOptions File options
   * @param {String} [fileOptions.filename] File name
   * @param {String} [fileOptions.contentType] Content type (i.e. MIME)
   * @return {Array} formatted
   * @return {Object} formatted[0] formData
   * @return {String} formatted[1] fileId
   * @throws Error if Buffer file type is not supported.
   * @see https://npmjs.com/package/file-type
   * @private
   */
  _formatSendData(type, data, fileOptions = {}) {
    const deprecationMessage = 'See https://github.com/yagop/node-telegram-bot-api/blob/master/doc/usage.md#sending-files'
      + ' for more information on how sending files has been improved and'
      + ' on how to disable this deprecation message altogether.';
    let filedata = data;
    let filename = fileOptions.filename;
    let contentType = fileOptions.contentType;

    if (data instanceof stream.Stream) {
      if (!filename && data.path) {
        // Will be 'null' if could not be parsed.
        // For example, 'data.path' === '/?id=123' from 'request("https://example.com/?id=123")'
        const url = URL.parse(path.basename(data.path.toString()));
        if (url.pathname) {
          filename = qs.unescape(url.pathname);
        }
      }
    } else if (Buffer.isBuffer(data)) {
      if (!filename && !process.env.NTBA_FIX_350) {
        deprecate(`Buffers will have their filenames default to "filename" instead of "data". ${deprecationMessage}`);
        filename = 'data';
      }
      if (!contentType) {
        const filetype = fileType(data);
        if (filetype) {
          contentType = filetype.mime;
          const ext = filetype.ext;
          if (ext && !process.env.NTBA_FIX_350) {
            filename = `${filename}.${ext}`;
          }
        } else if (!process.env.NTBA_FIX_350) {
          deprecate(`An error will no longer be thrown if file-type of buffer could not be detected. ${deprecationMessage}`);
          throw new errors.FatalError('Unsupported Buffer file-type');
        }
      }
    } else if (data) {
      if (this.bot.options.filepath && fs.existsSync(data)) {
        filedata = fs.createReadStream(data);
        if (!filename) {
          filename = path.basename(data);
        }
      } else {
        return [null, data];
      }
    } else {
      return [null, data];
    }

    filename = filename || 'filename';
    contentType = contentType || mime.lookup(filename);
    if (process.env.NTBA_FIX_350) {
      contentType = contentType || 'application/octet-stream';
    } else {
      deprecate(`In the future, content-type of files you send will default to "application/octet-stream". ${deprecationMessage}`);
    }

    // TODO: Add missing file extension.

    return [{
      [type]: {
        value: filedata,
        options: {
          filename,
          contentType,
        },
      },
    }, null];
  }

  /**
   * Format multiple files to be uploaded; handles file paths, streams, and buffers
   * @param {String} type
   * @param {Array} files Array of file data objects
   * @param {Object} fileOptions File options
   * @param {String} [fileOptions.filename] File name
   * @param {String} [fileOptions.contentType] Content type (i.e. MIME)
   * @return {Object} formatted
   * @return {Object} formatted.formData Form data object with all files
   * @return {Array} formatted.fileIds Array of fileIds for non-file data
   * @throws Error if Buffer file type is not supported.
   * @see https://npmjs.com/package/file-type
   * @private
   */
  _formatSendMultipleData(type, files, fileOptions = {}) {
    const formData = {};
    const fileIds = {};

    files.forEach((file, index) => {
      let filedata = file.media || file.data || file[type];
      let filename = file.filename || fileOptions.filename;
      let contentType = file.contentType || fileOptions.contentType;

      if (filedata instanceof stream.Stream) {
        if (!filename && filedata.path) {
          const url = URL.parse(path.basename(filedata.path.toString()), true);
          if (url.pathname) {
            filename = qs.unescape(url.pathname);
          }
        }
      } else if (Buffer.isBuffer(filedata)) {
        filename = `filename_${index}`;

        if (!contentType) {
          const filetype = fileType(filedata);

          if (filetype) {
            contentType = filetype.mime;
            const ext = filetype.ext;

            if (ext) {
              filename = `${filename}.${ext}`;
            }
          } else {
            throw new errors.FatalError('Unsupported Buffer file-type');
          }
        }
      } else if (fs.existsSync(filedata)) {
        filedata = fs.createReadStream(filedata);

        if (!filename) {
          filename = path.basename(filedata.path);
        }
      } else {
        fileIds[index] = filedata;
        return;
      }

      filename = filename || `filename_${index}`;
      contentType = contentType || 'application/octet-stream';

      formData[`${type}_${index}`] = {
        value: filedata,
        options: {
          filename,
          contentType,
        },
      };
    });

    return { formData, fileIds };
  }

  /**
   * Get link for file.
   * Use this method to get link for file for subsequent use.
   * Attention: link will be valid for 1 hour.
   *
   * This method is a sugar extension of the (getFile)[#getfilefileid] method,
   * which returns just path to file on remote server (you will have to manually build full uri after that).
   *
   * @param {String} fileId  File identifier to get info about
   * @param {Object} [options] Additional Telegram query options
   * @return {Promise} Promise which will have  *fileURI* in resolve callback
   * @see https://core.telegram.org/bots/api#getfile
   */
  getFileLink(fileId, form = {}) {
    return this.bot.getFile(fileId, form)
      .then((resp) => `${this.bot.options.baseApiUrl}/file/bot${this.bot.token}/${resp.file_path}`);
  }

  /**
   * Return a readable stream for file.
   *
   * `fileStream.path` is the specified file ID i.e. `fileId`.
   * `fileStream` emits event `info` passing a single argument i.e.
   * `info` with the interface `{ uri }` where `uri` is the URI of the
   * file on Telegram servers.
   *
   * This method is a sugar extension of the [getFileLink](#TelegramBot+getFileLink) method,
   * which returns the full URI to the file on remote server.
   *
   * @param {String} fileId File identifier to get info about
   * @param {Object} [options] Additional Telegram query options
   * @return {stream.Readable} fileStream
   */
  getFileStream(fileId, form = {}) {
    const fileStream = new stream.PassThrough();
    fileStream.path = fileId;
    this.getFileLink(fileId, form)
      .then((fileURI) => {
        fileStream.emit('info', {
          uri: fileURI,
        });
        pump(streamedRequest({ uri: fileURI, ...this.bot.options.request }), fileStream);
      })
      .catch((error) => {
        fileStream.emit('error', error);
      });
    return fileStream;
  }

  /**
   * Downloads file in the specified folder.
   *
   * This method is a sugar extension of the [getFileStream](#TelegramBot+getFileStream) method,
   * which returns a readable file stream.
   *
   * @param {String} fileId  File identifier to get info about
   * @param {String} downloadDir Absolute path to the folder in which file will be saved
   * @param {Object} [options] Additional Telegram query options
   * @return {Promise} Promise, which will have *filePath* of downloaded file in resolve callback
   */
  downloadFile(fileId, downloadDir, form = {}) {
    let resolve;
    let reject;
    const promise = new Promise((a, b) => {
      resolve = a;
      reject = b;
    });
    const fileStream = this.getFileStream(fileId, form);
    fileStream.on('info', (info) => {
      const fileName = info.uri.slice(info.uri.lastIndexOf('/') + 1);
      // TODO: Ensure fileName doesn't contains slashes
      const filePath = path.join(downloadDir, fileName);
      pump(fileStream, fs.createWriteStream(filePath), (error) => {
        if (error) { return reject(error); }
        return resolve(filePath);
      });
    });
    fileStream.on('error', (err) => {
      reject(err);
    });
    return promise;
  }
}

module.exports = TelegramBotRequest;
