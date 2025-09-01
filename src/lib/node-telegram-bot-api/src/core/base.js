// shims
require('array.prototype.findindex').shim(); // for Node.js v0.x

const errors = require('../errors');
const debug = require('debug')('node-telegram-bot-api');
const EventEmitter = require('eventemitter3');
const fileType = require('file-type');
const request = require('@cypress/request-promise');
const streamedRequest = require('@cypress/request');
const qs = require('querystring');
const stream = require('stream');
const mime = require('mime');
const path = require('path');
const URL = require('url');
const fs = require('fs');
const pump = require('pump');
const TelegramBotPolling = require('../telegramPolling');
const TelegramBotWebHook = require('../telegramWebHook');
const deprecate = require('../utils').deprecate;

const _messageTypes = [
  'text',
  'animation',
  'audio',
  'channel_chat_created',
  'contact',
  'delete_chat_photo',
  'dice',
  'document',
  'game',
  'group_chat_created',
  'invoice',
  'left_chat_member',
  'location',
  'migrate_from_chat_id',
  'migrate_to_chat_id',
  'new_chat_members',
  'new_chat_photo',
  'new_chat_title',
  'passport_data',
  'photo',
  'pinned_message',
  'poll',
  'sticker',
  'successful_payment',
  'supergroup_chat_created',
  'video',
  'video_note',
  'voice',
  'video_chat_started',
  'video_chat_ended',
  'video_chat_participants_invited',
  'video_chat_scheduled',
  'message_auto_delete_timer_changed',
  'chat_invite_link',
  'chat_member_updated',
  'web_app_data',
  'message_reaction',
];

const _deprecatedMessageTypes = [
  'new_chat_participant', 'left_chat_participant',
];

/**
 * JSON-serialize data. If the provided data is already a String,
 * return it as is.
 * @private
 * @param {*} data
 * @return {String}
 */
function stringify(data) {
  if (typeof data === 'string') {
    return data;
  }
  return JSON.stringify(data);
}

module.exports = {
  errors,
  debug,
  EventEmitter,
  fileType,
  request,
  streamedRequest,
  qs,
  stream,
  mime,
  path,
  URL,
  fs,
  pump,
  TelegramBotPolling,
  TelegramBotWebHook,
  deprecate,
  _messageTypes,
  _deprecatedMessageTypes,
  stringify,
};
