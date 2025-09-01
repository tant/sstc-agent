// Type definitions for node-telegram-bot-api
// Project: https://github.com/yagop/node-telegram-bot-api
// Definitions by: Alex Muench <https://github.com/AlexMuench>
//                 Jason Turner <https://github.com/jtbandes>
//                 Aleksej Komarov <https://github.com/alex-kom>
//                 Davide Marzucco <https://github.com/davideicardi>
//                 Denis Yarovoy <https://github.com/yarovoy>
//                 Viktor Zozuliak <https://github.com/zouzias>
//                 Pavel Shaplyko <https://github.com/ShadowEyesVII>
//                 Milan Fedor <https://github.com/milanfedor>

/// <reference types="node" />

import { EventEmitter } from 'events';
import { Stream } from 'stream';

declare namespace TelegramBot {
  type ChatAction =
    | 'typing'
    | 'upload_photo'
    | 'record_video'
    | 'upload_video'
    | 'record_voice'
    | 'upload_voice'
    | 'upload_document'
    | 'find_location'
    | 'record_video_note'
    | 'upload_video_note';

  type ChatType =
    | 'private'
    | 'group'
    | 'supergroup'
    | 'channel';

  type UpdateType =
    | 'message'
    | 'edited_message'
    | 'channel_post'
    | 'edited_channel_post'
    | 'inline_query'
    | 'chosen_inline_result'
    | 'callback_query'
    | 'shipping_query'
    | 'pre_checkout_query'
    | 'poll'
    | 'poll_answer'
    | 'my_chat_member'
    | 'chat_member'
    | 'chat_join_request';

  type MessageEntityType =
    | 'mention'
    | 'hashtag'
    | 'cashtag'
    | 'bot_command'
    | 'url'
    | 'email'
    | 'phone_number'
    | 'bold'
    | 'italic'
    | 'underline'
    | 'strikethrough'
    | 'spoiler'
    | 'code'
    | 'pre'
    | 'text_link'
    | 'text_mention'
    | 'custom_emoji';

  type PollType = 'regular' | 'quiz';

  type MediaGroupType = 'audio' | 'document' | 'photo' | 'video';

  type StickerType = 'regular' | 'mask' | 'custom_emoji';

  type StickerFormat = 'static' | 'animated' | 'video';

  interface PassportElementError {
    source: string;
    type: string;
    message: string;
    file_hash?: string;
    element_hash?: string;
  }

  interface ChatPermissions {
    can_send_messages?: boolean;
    can_send_media_messages?: boolean;
    can_send_polls?: boolean;
    can_send_other_messages?: boolean;
    can_add_web_page_previews?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_pin_messages?: boolean;
  }

  interface BotCommand {
    command: string;
    description: string;
  }

  export interface ConstructorOptions {
    polling?: boolean | PollingOptions;
    webHook?: boolean | WebHookOptions;
    onlyFirstMatch?: boolean;
    request?: Object;
    baseApiUrl?: string;
    filepath?: boolean;
    badRejection?: boolean;
  }

  export interface PollingOptions {
    interval?: number;
    autoStart?: boolean;
    params?: Object;
  }

  export interface WebHookOptions {
    host?: string;
    port?: number;
    key?: string;
    cert?: string;
    pfx?: string;
    autoOpen?: boolean;
    https?: Object;
    healthEndpoint?: string;
  }

  export interface SendOptions {
    disable_notification?: boolean;
    reply_to_message_id?: number;
    reply_markup?: Object;
  }

  export interface Message {
    message_id: number;
    from?: User;
    date: number;
    chat: Chat;
    forward_from?: User;
    forward_from_chat?: Chat;
    forward_from_message_id?: number;
    forward_signature?: string;
    forward_date?: number;
    reply_to_message?: Message;
    edit_date?: number;
    media_group_id?: string;
    author_signature?: string;
    text?: string;
    entities?: MessageEntity[];
    caption_entities?: MessageEntity[];
    audio?: Audio;
    document?: Document;
    game?: Game;
    photo?: PhotoSize[];
    sticker?: Sticker;
    video?: Video;
    voice?: Voice;
    video_note?: VideoNote;
    caption?: string;
    contact?: Contact;
    location?: Location;
    venue?: Venue;
    poll?: Poll;
    new_chat_members?: User[];
    left_chat_member?: User;
    new_chat_title?: string;
    new_chat_photo?: PhotoSize[];
    delete_chat_photo?: true;
    group_chat_created?: true;
    supergroup_chat_created?: true;
    channel_chat_created?: true;
    migrate_to_chat_id?: number;
    migrate_from_chat_id?: number;
    pinned_message?: Message;
    invoice?: Invoice;
    successful_payment?: SuccessfulPayment;
    connected_website?: string;
    passport_data?: PassportData;
  }

  export interface User {
    id: number;
    is_bot: boolean;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
    can_join_groups?: boolean;
    can_read_all_group_messages?: boolean;
    supports_inline_queries?: boolean;
  }

  export interface Chat {
    id: number;
    type: ChatType;
    title?: string;
    username?: string;
    first_name?: string;
    last_name?: string;
    photo?: ChatPhoto;
    description?: string;
    invite_link?: string;
    pinned_message?: Message;
    permissions?: ChatPermissions;
    slow_mode_delay?: number;
    message_auto_delete_time?: number;
    has_protected_content?: boolean;
    sticker_set_name?: string;
    can_set_sticker_set?: boolean;
  }

  export interface MessageEntity {
    type: MessageEntityType;
    offset: number;
    length: number;
    url?: string;
    user?: User;
    language?: string;
    custom_emoji_id?: string;
  }

  export interface PhotoSize {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    file_size?: number;
  }

  export interface Audio {
    file_id: string;
    file_unique_id: string;
    duration: number;
    performer?: string;
    title?: string;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
    thumb?: PhotoSize;
  }

  export interface Document {
    file_id: string;
    file_unique_id: string;
    thumb?: PhotoSize;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  }

  export interface Sticker {
    file_id: string;
    file_unique_id: string;
    type: StickerType;
    width: number;
    height: number;
    is_animated: boolean;
    is_video: boolean;
    thumb?: PhotoSize;
    emoji?: string;
    set_name?: string;
    premium_animation?: File;
    mask_position?: MaskPosition;
    custom_emoji_id?: string;
    needs_repainting?: boolean;
    file_size?: number;
  }

  export interface Video {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
    thumb?: PhotoSize;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  }

  export interface Voice {
    file_id: string;
    file_unique_id: string;
    duration: number;
    mime_type?: string;
    file_size?: number;
  }

  export interface VideoNote {
    file_id: string;
    file_unique_id: string;
    length: number;
    duration: number;
    thumb?: PhotoSize;
    file_size?: number;
  }

  export interface Contact {
    phone_number: string;
    first_name: string;
    last_name?: string;
    user_id?: number;
    vcard?: string;
  }

  export interface Location {
    longitude: number;
    latitude: number;
  }

  export interface Venue {
    location: Location;
    title: string;
    address: string;
    foursquare_id?: string;
    foursquare_type?: string;
  }

  export interface PollOption {
    text: string;
    voter_count: number;
  }

  export interface Poll {
    id: string;
    question: string;
    options: PollOption[];
    total_voter_count: number;
    is_closed: boolean;
    is_anonymous: boolean;
    type: PollType;
    allows_multiple_answers: boolean;
    correct_option_id?: number;
    explanation?: string;
    explanation_entities?: MessageEntity[];
    open_period?: number;
    close_date?: number;
  }

  export interface Invoice {
    title: string;
    description: string;
    start_parameter: string;
    currency: string;
    total_amount: number;
  }

  export interface SuccessfulPayment {
    currency: string;
    total_amount: number;
    invoice_payload: string;
    shipping_option_id?: string;
    order_info?: OrderInfo;
    telegram_payment_charge_id: string;
    provider_payment_charge_id: string;
  }

  export interface OrderInfo {
    name?: string;
    phone_number?: string;
    email?: string;
    shipping_address?: ShippingAddress;
  }

  export interface ShippingAddress {
    country_code: string;
    state: string;
    city: string;
    street_line1: string;
    street_line2: string;
    post_code: string;
  }

  export interface PassportData {
    data: EncryptedPassportElement[];
    credentials: EncryptedCredentials;
  }

  export interface EncryptedPassportElement {
    type: string;
    data?: string;
    phone_number?: string;
    email?: string;
    files?: PassportFile[];
    front_side?: PassportFile;
    reverse_side?: PassportFile;
    selfie?: PassportFile;
    translation?: PassportFile[];
    hash: string;
  }

  export interface PassportFile {
    file_id: string;
    file_unique_id: string;
    file_size: number;
    file_date: number;
  }

  export interface EncryptedCredentials {
    data: string;
    hash: string;
    secret: string;
  }

  export interface Game {
    title: string;
    description: string;
    photo: PhotoSize[];
    text?: string;
    text_entities?: MessageEntity[];
    animation?: Animation;
  }

  export interface Animation {
    file_id: string;
    file_unique_id: string;
    width: number;
    height: number;
    duration: number;
    thumb?: PhotoSize;
    file_name?: string;
    mime_type?: string;
    file_size?: number;
  }

  export interface GameHighScore {
    position: number;
    user: User;
    score: number;
  }

  export interface ChatPhoto {
    small_file_id: string;
    small_file_unique_id: string;
    big_file_id: string;
    big_file_unique_id: string;
  }

  export interface File {
    file_id: string;
    file_unique_id: string;
    file_size?: number;
    file_path?: string;
  }

  export interface MaskPosition {
    point: string;
    x_shift: number;
    y_shift: number;
    scale: number;
  }

  export interface InlineQuery {
    id: string;
    from: User;
    query: string;
    offset: string;
    chat_type?: string;
    location?: Location;
  }

  export interface ChosenInlineResult {
    result_id: string;
    from: User;
    location?: Location;
    inline_message_id?: string;
    query: string;
  }

  export interface CallbackQuery {
    id: string;
    from: User;
    message?: Message;
    inline_message_id?: string;
    chat_instance: string;
    data?: string;
    game_short_name?: string;
  }

  export interface ShippingQuery {
    id: string;
    from: User;
    invoice_payload: string;
    shipping_address: ShippingAddress;
  }

  export interface PreCheckoutQuery {
    id: string;
    from: User;
    currency: string;
    total_amount: number;
    invoice_payload: string;
    shipping_option_id?: string;
    order_info?: OrderInfo;
  }

  export interface Update {
    update_id: number;
    message?: Message;
    edited_message?: Message;
    channel_post?: Message;
    edited_channel_post?: Message;
    inline_query?: InlineQuery;
    chosen_inline_result?: ChosenInlineResult;
    callback_query?: CallbackQuery;
    shipping_query?: ShippingQuery;
    pre_checkout_query?: PreCheckoutQuery;
    poll?: Poll;
    poll_answer?: PollAnswer;
    my_chat_member?: ChatMemberUpdated;
    chat_member?: ChatMemberUpdated;
    chat_join_request?: ChatJoinRequest;
  }

  export interface PollAnswer {
    poll_id: string;
    user: User;
    option_ids: number[];
  }

  export interface ChatMemberUpdated {
    chat: Chat;
    from: User;
    date: number;
    old_chat_member: ChatMember;
    new_chat_member: ChatMember;
    invite_link?: ChatInviteLink;
  }

  export interface ChatJoinRequest {
    chat: Chat;
    from: User;
    date: number;
    bio?: string;
    invite_link?: ChatInviteLink;
  }

  export interface ChatMember {
    user: User;
    status: string;
    until_date?: number;
    can_be_edited?: boolean;
    can_manage_chat?: boolean;
    can_post_messages?: boolean;
    can_edit_messages?: boolean;
    can_delete_messages?: boolean;
    can_manage_voice_chats?: boolean;
    can_restrict_members?: boolean;
    can_promote_members?: boolean;
    can_change_info?: boolean;
    can_invite_users?: boolean;
    can_pin_messages?: boolean;
    is_member?: boolean;
    can_send_messages?: boolean;
    can_send_media_messages?: boolean;
    can_send_polls?: boolean;
    can_send_other_messages?: boolean;
    can_add_web_page_previews?: boolean;
  }

  export interface ChatInviteLink {
    invite_link: string;
    creator: User;
    creates_join_request: boolean;
    is_primary: boolean;
    is_revoked: boolean;
    name?: string;
    expire_date?: number;
    member_limit?: number;
    pending_join_request_count?: number;
  }

  export interface WebhookInfo {
    url: string;
    has_custom_certificate: boolean;
    pending_update_count: number;
    last_error_date?: number;
    last_error_message?: string;
    max_connections?: number;
    allowed_updates?: string[];
  }

  export interface UserProfilePhotos {
    total_count: number;
    photos: PhotoSize[][];
  }

  export interface ReplyKeyboardMarkup {
    keyboard: KeyboardButton[][];
    resize_keyboard?: boolean;
    one_time_keyboard?: boolean;
    input_field_placeholder?: string;
    selective?: boolean;
  }

  export interface KeyboardButton {
    text: string;
    request_user?: KeyboardButtonRequestUser;
    request_chat?: KeyboardButtonRequestChat;
    request_contact?: boolean;
    request_location?: boolean;
    request_poll?: KeyboardButtonPollType;
    web_app?: WebAppInfo;
  }

  export interface KeyboardButtonRequestUser {
    request_id: number;
    user_is_bot?: boolean;
    user_is_premium?: boolean;
  }

  export interface KeyboardButtonRequestChat {
    request_id: number;
    chat_is_channel: boolean;
    chat_is_forum?: boolean;
    chat_has_username?: boolean;
    chat_is_created?: boolean;
    user_administrator_rights?: ChatAdministratorRights;
    bot_administrator_rights?: ChatAdministratorRights;
    bot_is_member?: boolean;
  }

  export interface KeyboardButtonPollType {
    type?: PollType;
  }

  export interface ReplyKeyboardRemove {
    remove_keyboard: boolean;
    selective?: boolean;
  }

  export interface InlineKeyboardMarkup {
    inline_keyboard: InlineKeyboardButton[][];
  }

  export interface InlineKeyboardButton {
    text: string;
    url?: string;
    login_url?: LoginUrl;
    callback_data?: string;
    web_app?: WebAppInfo;
    switch_inline_query?: string;
    switch_inline_query_current_chat?: string;
    callback_game?: CallbackGame;
    pay?: boolean;
  }

  export interface LoginUrl {
    url: string;
    forward_text?: string;
    bot_username?: string;
    request_write_access?: boolean;
  }

  export interface CallbackGame {
    user_id: number;
    score: number;
    force?: boolean;
    disable_edit_message?: boolean;
    chat_id?: number;
    message_id?: number;
    inline_message_id?: string;
  }

  export interface WebAppInfo {
    url: string;
  }

  export interface ChatAdministratorRights {
    is_anonymous: boolean;
    can_manage_chat: boolean;
    can_delete_messages: boolean;
    can_manage_video_chats: boolean;
    can_restrict_members: boolean;
    can_promote_members: boolean;
    can_change_info: boolean;
    can_invite_users: boolean;
    can_post_messages?: boolean;
    can_edit_messages?: boolean;
    can_pin_messages?: boolean;
    can_post_stories?: boolean;
    can_edit_stories?: boolean;
    can_delete_stories?: boolean;
    can_manage_topics?: boolean;
  }

  export interface MenuButton {
    type: string;
    text?: string;
    web_app?: WebAppInfo;
  }

  export interface ResponseParameters {
    migrate_to_chat_id?: number;
    retry_after?: number;
  }

  export type MessageMedia = 
    | { type: 'photo'; media: string; caption?: string; parse_mode?: string }
    | { type: 'video'; media: string; thumb?: string; caption?: string; parse_mode?: string; width?: number; height?: number; duration?: number; supports_streaming?: boolean }
    | { type: 'animation'; media: string; thumb?: string; caption?: string; parse_mode?: string; width?: number; height?: number; duration?: number }
    | { type: 'audio'; media: string; thumb?: string; caption?: string; parse_mode?: string; duration?: number; performer?: string; title?: string }
    | { type: 'document'; media: string; thumb?: string; caption?: string; parse_mode?: string };

  export interface InputMediaPhoto {
    type: 'photo';
    media: string;
    caption?: string;
    parse_mode?: string;
  }

  export interface InputMediaVideo {
    type: 'video';
    media: string;
    thumb?: string;
    caption?: string;
    parse_mode?: string;
    width?: number;
    height?: number;
    duration?: number;
    supports_streaming?: boolean;
  }

  export interface InputMediaAnimation {
    type: 'animation';
    media: string;
    thumb?: string;
    caption?: string;
    parse_mode?: string;
    width?: number;
    height?: number;
    duration?: number;
  }

  export interface InputMediaAudio {
    type: 'audio';
    media: string;
    thumb?: string;
    caption?: string;
    parse_mode?: string;
    duration?: number;
    performer?: string;
    title?: string;
  }

  export interface InputMediaDocument {
    type: 'document';
    media: string;
    thumb?: string;
    caption?: string;
    parse_mode?: string;
  }
}

declare class TelegramBot extends EventEmitter {
  constructor(token: string, options?: TelegramBot.ConstructorOptions);

  // Informational methods
  getMe(): Promise<TelegramBot.User>;
  logOut(): Promise<boolean>;
  close(): Promise<boolean>;

  // Update methods
  getUpdates(options?: Object): Promise<TelegramBot.Update[]>;
  setWebHook(url: string, options?: { certificate?: string | Stream; max_connections?: number; allowed_updates?: string[] }): Promise<boolean>;
  deleteWebHook(): Promise<boolean>;
  getWebHookInfo(): Promise<TelegramBot.WebhookInfo>;

  // Chat methods
  sendMessage(chatId: number | string, text: string, options?: TelegramBot.SendOptions): Promise<TelegramBot.Message>;
  forwardMessage(chatId: number | string, fromChatId: number | string, messageId: number, options?: Object): Promise<TelegramBot.Message>;
  copyMessage(chatId: number | string, fromChatId: number | string, messageId: number, options?: Object): Promise<{ message_id: number }>;
  sendPhoto(chatId: number | string, photo: string | Stream | Buffer, options?: Object): Promise<TelegramBot.Message>;
  sendAudio(chatId: number | string, audio: string | Stream | Buffer, options?: Object): Promise<TelegramBot.Message>;
  sendDocument(chatId: number | string, doc: string | Stream | Buffer, options?: Object): Promise<TelegramBot.Message>;
  sendVideo(chatId: number | string, video: string | Stream | Buffer, options?: Object): Promise<TelegramBot.Message>;
  sendAnimation(chatId: number | string, animation: string | Stream | Buffer, options?: Object): Promise<TelegramBot.Message>;
  sendVoice(chatId: number | string, voice: string | Stream | Buffer, options?: Object): Promise<TelegramBot.Message>;
  sendVideoNote(chatId: number | string, videoNote: string | Stream | Buffer, options?: Object): Promise<TelegramBot.Message>;
  sendMediaGroup(chatId: number | string, media: TelegramBot.MessageMedia[], options?: Object): Promise<TelegramBot.Message[]>;
  sendLocation(chatId: number | string, latitude: number, longitude: number, options?: Object): Promise<TelegramBot.Message>;
  editMessageLiveLocation(latitude: number, longitude: number, options?: Object): Promise<TelegramBot.Message | boolean>;
  stopMessageLiveLocation(options?: Object): Promise<TelegramBot.Message | boolean>;
  sendVenue(chatId: number | string, latitude: number, longitude: number, title: string, address: string, options?: Object): Promise<TelegramBot.Message>;
  sendContact(chatId: number | string, phoneNumber: string, firstName: string, options?: Object): Promise<TelegramBot.Message>;
  sendPoll(chatId: number | string, question: string, pollOptions: string[], options?: Object): Promise<TelegramBot.Message>;
  sendDice(chatId: number | string, options?: Object): Promise<TelegramBot.Message>;
  sendChatAction(chatId: number | string, action: TelegramBot.ChatAction, options?: Object): Promise<boolean>;
  getUserProfilePhotos(userId: number, options?: Object): Promise<TelegramBot.UserProfilePhotos>;
  getFile(fileId: string, options?: Object): Promise<TelegramBot.File>;
  getFileLink(fileId: string): Promise<string>;
  getFileStream(fileId: string): Stream;
  downloadFile(fileId: string, downloadDir: string): Promise<string>;
  banChatMember(chatId: number | string, userId: number, options?: Object): Promise<boolean>;
  unbanChatMember(chatId: number | string, userId: number, options?: Object): Promise<boolean>;
  restrictChatMember(chatId: number | string, userId: number, options?: Object): Promise<boolean>;
  promoteChatMember(chatId: number | string, userId: number, options?: Object): Promise<boolean>;
  setChatAdministratorCustomTitle(chatId: number | string, userId: number, customTitle: string, options?: Object): Promise<boolean>;
  setChatPermissions(chatId: number | string, chatPermissions: TelegramBot.ChatPermissions, options?: Object): Promise<boolean>;
  exportChatInviteLink(chatId: number | string, options?: Object): Promise<string>;
  createChatInviteLink(chatId: number | string, options?: Object): Promise<TelegramBot.ChatInviteLink>;
  editChatInviteLink(chatId: number | string, inviteLink: string, options?: Object): Promise<TelegramBot.ChatInviteLink>;
  revokeChatInviteLink(chatId: number | string, inviteLink: string, options?: Object): Promise<TelegramBot.ChatInviteLink>;
  setChatPhoto(chatId: number | string, photo: string | Stream, options?: Object): Promise<boolean>;
  deleteChatPhoto(chatId: number | string, options?: Object): Promise<boolean>;
  setChatTitle(chatId: number | string, title: string, options?: Object): Promise<boolean>;
  setChatDescription(chatId: number | string, description: string, options?: Object): Promise<boolean>;
  pinChatMessage(chatId: number | string, messageId: number, options?: Object): Promise<boolean>;
  unpinChatMessage(chatId: number | string, options?: Object): Promise<boolean>;
  unpinAllChatMessages(chatId: number | string, options?: Object): Promise<boolean>;
  leaveChat(chatId: number | string, options?: Object): Promise<boolean>;
  getChat(chatId: number | string, options?: Object): Promise<TelegramBot.Chat>;
  getChatAdministrators(chatId: number | string, options?: Object): Promise<TelegramBot.ChatMember[]>;
  getChatMemberCount(chatId: number | string, options?: Object): Promise<number>;
  getChatMember(chatId: number | string, userId: number, options?: Object): Promise<TelegramBot.ChatMember>;
  setChatStickerSet(chatId: number | string, stickerSetName: string, options?: Object): Promise<boolean>;
  deleteChatStickerSet(chatId: number | string, options?: Object): Promise<boolean>;

  // Sticker methods
  sendSticker(chatId: number | string, sticker: string | Stream | Buffer, options?: Object): Promise<TelegramBot.Message>;
  getStickerSet(name: string, options?: Object): Promise<any>;
  uploadStickerFile(userId: number, sticker: string | Stream, options?: Object): Promise<TelegramBot.File>;
  createNewStickerSet(userId: number, name: string, title: string, pngSticker: string | Stream, emojis: string, options?: Object): Promise<boolean>;
  addStickerToSet(userId: number, name: string, sticker: string | Stream, emojis: string, options?: Object): Promise<boolean>;
  setStickerPositionInSet(sticker: string, position: number, options?: Object): Promise<boolean>;
  deleteStickerFromSet(sticker: string, options?: Object): Promise<boolean>;

  // Payment methods
  sendInvoice(chatId: number | string, title: string, description: string, payload: string, providerToken: string, currency: string, prices: any[], options?: Object): Promise<TelegramBot.Message>;
  answerShippingQuery(shippingQueryId: string, ok: boolean, options?: Object): Promise<boolean>;
  answerPreCheckoutQuery(preCheckoutQueryId: string, ok: boolean, options?: Object): Promise<boolean>;

  // Game methods
  sendGame(chatId: number | string, gameShortName: string, options?: Object): Promise<TelegramBot.Message>;
  setGameScore(userId: number, score: number, options?: Object): Promise<TelegramBot.Message | boolean>;
  getGameHighScores(userId: number, options?: Object): Promise<TelegramBot.GameHighScore[]>;

  // Inline methods
  answerInlineQuery(inlineQueryId: string, results: any[], options?: Object): Promise<boolean>;

  // Callback methods
  answerCallbackQuery(callbackQueryId: string, options?: Object): Promise<boolean>;

  // Edit methods
  editMessageText(text: string, options?: Object): Promise<TelegramBot.Message | boolean>;
  editMessageCaption(caption: string, options?: Object): Promise<TelegramBot.Message | boolean>;
  editMessageMedia(media: TelegramBot.InputMedia, options?: Object): Promise<TelegramBot.Message | boolean>;
  editMessageReplyMarkup(replyMarkup: Object, options?: Object): Promise<TelegramBot.Message | boolean>;

  // Delete methods
  deleteMessage(chatId: number | string, messageId: number, options?: Object): Promise<boolean>;

  // Events
  onText(regexp: RegExp, callback: (msg: TelegramBot.Message, match: RegExpExecArray | null) => void): void;
  removeTextListener(regexp: RegExp): TelegramBot.TextListener | null;
  clearTextListeners(): void;

  onReplyToMessage(chatId: number | string, messageId: number, callback: (msg: TelegramBot.Message) => void): number;
  removeReplyListener(replyListenerId: number): TelegramBot.ReplyListener | null;
  clearReplyListeners(): void;

  // Polling and WebHook
  startPolling(options?: Object): Promise<void>;
  stopPolling(options?: Object): Promise<void>;
  openWebHook(): Promise<void>;
  closeWebHook(): Promise<void>;
  isPolling(): boolean;
  hasOpenWebHook(): boolean;

  // Process updates
  processUpdate(update: TelegramBot.Update): void;

  // Utilities
  on(event: string, listener: Function): this;
}

export = TelegramBot;