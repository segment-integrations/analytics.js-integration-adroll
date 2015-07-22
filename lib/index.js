
/**
 * Module dependencies.
 */

var each = require('each');
var foldl = require('foldl');
var integration = require('analytics.js-integration');
var map = require('ndhoule/map');
var snake = require('to-snake-case');
var useHttps = require('use-https');

/**
 * Expose `AdRoll` integration.
 */

var AdRoll = module.exports = integration('AdRoll')
  .assumesPageview()
  .global('__adroll')
  .global('__adroll_loaded')
  .global('adroll_adv_id')
  .global('adroll_custom_data')
  .global('adroll_email')
  .global('adroll_pix_id')
  .option('advId', '')
  .option('pixId', '')
  .option('_version', 2)
  .tag('http', '<script src="http://a.adroll.com/j/roundtrip.js">')
  .tag('https', '<script src="https://s.adroll.com/j/roundtrip.js">')
  .mapping('events');

/**
 * Initialize.
 *
 * http://support.adroll.com/getting-started-in-4-easy-steps/#step-one
 * http://support.adroll.com/enhanced-conversion-tracking/
 *
 * @api public
 */

AdRoll.prototype.initialize = function() {
  window.adroll_adv_id = this.options.advId;
  window.adroll_pix_id = this.options.pixId;
  window.__adroll_loaded = true;
  var name = useHttps() ? 'https' : 'http';
  this.load(name, this.ready);
};

/**
 * Loaded?
 *
 * @api private
 * @return {boolean}
 */

AdRoll.prototype.loaded = function() {
  return !!window.__adroll;
};

/**
 * Page.
 *
 * http://support.adroll.com/segmenting-clicks/
 *
 * @api public
 * @param {Page} page
 */

AdRoll.prototype.page = function(page) {
  this.track(page.track(page.fullName()));
};

/**
 * Identify.
 *
 * @api public
 * @param {Identify} identify
 */

AdRoll.prototype.identify = function(identify) {
  if (identify.email()) window.adroll_email = identify.email();
};

/**
 * Track.
 *
 * @api public
 * @param {Track} track
 */

AdRoll.prototype.track = function(track) {
  var event = track.event();
  var events = this.events(event);
  var userId = this.analytics.user().id();

  // TODO: Does this screw up subobjects?
  // TODO: How does AdRoll handle nested objects?
  var data = foldl(function(props, val, key) {
    props[snake(key)] = val;
    return props;
  }, track.properties({
    revenue: 'adroll_conversion_value_in_dollars',
    total: 'adroll_conversion_value_in_dollars',
    orderId: 'order_id',
    id: 'product_id'
  }));

  if (userId) data.user_id = userId;

  // As of April 2015, Adroll no longer accepts segments by name, instead
  // segmenting exclusively by segment ID, which will be present in events map
  //
  // TODO: Deprecate and remove this behavior
  if (this.options._version === 1) {
    // If this is an unmapped event, fall back on a snakeized event name
    if (!events.length) events = [event];
    // legacy (v1) behavior is to snakeize all mapped `events` values
    events = map(snake, events);
  }

  each(events, function(segmentId) {
    data.adroll_segments = segmentId;
    window.__adroll.record_user(data);
  });
};
