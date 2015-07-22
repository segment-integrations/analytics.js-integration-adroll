// 'use strict';

var AdRoll = require('../lib/');
var Analytics = require('analytics.js-core').constructor;
var each = require('each');
var integration = require('analytics.js-integration');
var sandbox = require('clear-env');
var tester = require('analytics.js-integration-tester');

each([1, 2], function(version) {
  describe('Adroll - Common (' + version + ')', function() {
    var adroll;
    var analytics;
    var options = {
      advId: 'FSQJWMMZ2NEAZH6XWKVCNO',
      pixId: 'N6HGWT4ALRDRXCAO5PLTB6',
      _version: version,
      events: {
        'Viewed Home Page': 'viewed_home_page',
        'Viewed Home Index Page': 'viewed_home_index_page',
        'Order Created': 'order_created'
      }
    };

    beforeEach(function() {
      analytics = new Analytics();
      adroll = new AdRoll(options);
      analytics.use(AdRoll);
      analytics.use(tester);
      analytics.add(adroll);
    });

    afterEach(function() {
      analytics.restore();
      analytics.reset();
      adroll.reset();
      sandbox();
    });

    it('should have the right settings', function() {
      analytics.compare(
        AdRoll,
        integration('AdRoll')
          .assumesPageview()
          .global('__adroll')
          .global('__adroll_loaded')
          .global('adroll_adv_id')
          .global('adroll_custom_data')
          .global('adroll_pix_id')
          .global('adroll_email')
          .option('advId', '')
          .option('pixId', '')
          .option('_version', 2)
          .mapping('events')
      );
    });

    describe('before loading', function() {
      beforeEach(function() {
        analytics.stub(adroll, 'load');
      });

      afterEach(function() {
        adroll.reset();
      });

      describe('#initialize', function() {
        it('should initialize the adroll variables', function() {
          analytics.initialize();
          analytics.page();
          analytics.equal(window.adroll_adv_id, options.advId);
          analytics.equal(window.adroll_pix_id, options.pixId);
        });

        it('should set window.__adroll_loaded', function() {
          analytics.initialize();
          analytics.page();
          analytics.assert(window.__adroll_loaded);
        });

        it('should call #load', function() {
          analytics.initialize();
          analytics.page();
          analytics.called(adroll.load);
        });

        describe('with user', function() {
          beforeEach(function() {
            analytics.user().identify('id');
          });

          it('should not set a user id', function() {
            analytics.initialize();
            analytics.page();
            analytics.assert(!window.adroll_custom_data);
          });
        });
      });
    });

    describe('loading', function() {
      it('should load', function(done) {
        analytics.load(adroll, done);
      });
    });

    describe('after loading', function() {
      beforeEach(function(done) {
        analytics.once('ready', done);
        analytics.initialize();
        analytics.page();
      });

      describe('#identify', function() {
        it('should pass email', function() {
          analytics.identify('id', { email: 'test@email.com' });
          analytics.equal('test@email.com', window.adroll_email);
        });

        it('should not pass empty email', function() {
          analytics.identify('id', {});
          analytics.assert(!window.adroll_email);
        });
      });

      describe('#track', function() {
        beforeEach(function() {
          analytics.stub(window.__adroll, 'record_user');
        });

        it('should include userId', function() {
          analytics.user().identify('id');
          analytics.track('Order Created', {});
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            user_id: 'id'
          });
        });

        it('should include orderId', function() {
          analytics.track('Order Created', { orderId: 1 });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            order_id: 1
          });
        });

        it('should map revenue to conversion_value', function() {
          analytics.track('Order Created', { total: 1.99 });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            adroll_conversion_value_in_dollars: 1.99
          });
        });

        it('should map revenue as conversion_value', function() {
          analytics.track('Order Created', { revenue: 2.99 });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            adroll_conversion_value_in_dollars: 2.99
          });
        });

        it('should include properties', function() {
          analytics.track('Order Created', { revenue: 2.99, id: '12345', sku: '43434-21', other: '1234' });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            adroll_conversion_value_in_dollars: 2.99,
            product_id: '12345',
            sku: '43434-21',
            other: '1234',
            order_id: '12345'
          });
        });
      });
    });
  });
});
