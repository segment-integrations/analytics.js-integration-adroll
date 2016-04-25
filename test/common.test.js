'use strict';

var Analytics = require('analytics.js-core').constructor;
var each = require('each');
var integration = require('analytics.js-integration');
var sandbox = require('clear-env');
var tester = require('analytics.js-integration-tester');
var AdRoll = require('../lib/');

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
        'Completed Order': 'order_created',
        Teems: 'Ate habanero cheese'
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
        beforeEach(function() {
          analytics.stub(window.__adroll, 'record_adroll_email');
        });

        it('should pass email', function() {
          analytics.identify('id', { email: 'test@email.com' });
          analytics.equal('test@email.com', window.adroll_email);
          analytics.calledOnce(window.__adroll.record_adroll_email);
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
          analytics.track('Completed Order', {});
          analytics.calledOnce(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            user_id: 'id'
          });
        });

        it('should include orderId', function() {
          analytics.track('Completed Order', { id: 1 });
          analytics.calledOnce(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            order_id: 1
          });
        });

        it('should map revenue for normal track events', function() {
          analytics.track('Teems', { revenue: 17.38 });
          analytics.calledOnce(window.__adroll.record_user, {
            adroll_segments: 'Ate habanero cheese',
            adroll_conversion_value: 17.38
          });
        });

        it('should not map revenue if no revenue is found', function() {
          analytics.track('Teems');
          analytics.calledOnce(window.__adroll.record_user, {
            adroll_segments: 'Ate habanero cheese'
          });
        });

        it('should map revenue to conversion_value', function() {
          analytics.track('Completed Order', { revenue: 1.99 });
          analytics.calledOnce(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            adroll_conversion_value: 1.99
          });
        });

        it('should should send total if no revenue for conversion_value', function() {
          analytics.track('Completed Order', { total: 29.88 });
          analytics.calledOnce(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            adroll_conversion_value: 29.88
          });
        });

        it('should map revenue as conversion_value and total as custom prop', function() {
          analytics.track('Completed Order', { revenue: 2.99, total: 17.38 });
          analytics.calledOnce(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            adroll_conversion_value: 2.99,
            total: 17.38
          });
        });

        it('should include properties', function() {
          analytics.track('Completed Order', { revenue: 2.99, id: '12345', sku: '43434-21', other: '1234' });
          analytics.calledOnce(window.__adroll.record_user, {
            adroll_segments: 'order_created',
            adroll_conversion_value: 2.99,
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
