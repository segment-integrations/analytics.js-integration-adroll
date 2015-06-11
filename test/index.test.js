
var Analytics = require('analytics.js-core').constructor;
var integration = require('analytics.js-integration');
var tester = require('analytics.js-integration-tester');
var sandbox = require('clear-env');
var AdRoll = require('../lib/');

describe('AdRoll', function() {
  var adroll;
  var analytics;
  var options = {
    advId: 'FSQJWMMZ2NEAZH6XWKVCNO',
    pixId: 'N6HGWT4ALRDRXCAO5PLTB6',
    _version: 2
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
    analytics.compare(AdRoll, integration('AdRoll')
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
      .mapping('events'));
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

    describe('#page', function() {
      beforeEach(function() {
        analytics.stub(window.__adroll, 'record_user');
      });

      describe('V1', function() {
        beforeEach(function() {
          adroll.options._version = 1;
        });

        it('should track page view with fullName', function() {
          analytics.page('Category', 'Name', { url: 'http://localhost:34448/test/' });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'viewed_category_name_page',
            path: '/test/',
            referrer: '',
            title: 'integrations tests',
            search: '',
            name: 'Name',
            category: 'Category',
            url: 'http://localhost:34448/test/'
          });
        });

        it('should track unnamed/categorized page', function() {
          analytics.page({ url: 'http://localhost:34448/test/' });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'loaded_a_page',
            path: '/test/',
            referrer: '',
            title: 'integrations tests',
            search: '',
            url: 'http://localhost:34448/test/'
          });
        });

        it('should track unnamed page', function() {
          analytics.page('Name', { url: 'http://localhost:34448/test/' });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'viewed_name_page',
            path: '/test/',
            referrer: '',
            title: 'integrations tests',
            search: '',
            name: 'Name',
            url: 'http://localhost:34448/test/'
          });
        });

        it('should track uncategorized page', function() {
          analytics.page('Name', { url: 'http://localhost:34448/test/' });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'viewed_name_page',
            path: '/test/',
            referrer: '',
            title: 'integrations tests',
            search: '',
            name: 'Name',
            url: 'http://localhost:34448/test/'
          });
        });
      });

      describe('V2', function() {
        beforeEach(function() {
          adroll.options.events = { 'Viewed Category Name Page': '123' };
          adroll.options._version = 2;
        });

        it('should track *mapped* page views', function() {
          analytics.page('Category', 'Name', { url: 'http://localhost:34448/test/' });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: '123',
            path: '/test/',
            referrer: '',
            title: 'integrations tests',
            search: '',
            name: 'Name',
            category: 'Category',
            url: 'http://localhost:34448/test/'
          });
        });

        it('should *not* track unmapped page views', function() {
          analytics.page({ url: 'http://localhost:34448/test/' });
          analytics.didNotCall(window.__adroll.record_user);
        });
      });
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

      describe('Event Mapped', function() {
        beforeEach(function() {
          adroll.options.events = { event: 'mappedVal' };
        });

        it('should pass user id in', function() {
          analytics.user().identify('id');
          analytics.track('event', { revenue: 3.99 });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'mappedVal',
            adroll_conversion_value_in_dollars: 3.99,
            user_id: 'id'
          });
        });

        it('should pass in revenue and order id', function() {
          analytics.track('event', { total: 1.99, orderId: 1 });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'mappedVal',
            adroll_conversion_value_in_dollars: 1.99,
            order_id: 1
          });
        });

        it('should pass .revenue as conversion value', function() {
          analytics.track('event', { revenue: 2.99 });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'mappedVal',
            adroll_conversion_value_in_dollars: 2.99
          });
        });

        it('should include the user_id when available', function() {
          analytics.user().identify('id');
          analytics.track('event', { revenue: 3.99 });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'mappedVal',
            adroll_conversion_value_in_dollars: 3.99,
            user_id: 'id'
          });
        });

        it('should pass custom data like product id and sku', function() {
          analytics.track('event', { revenue: 2.99, id: '12345', sku: '43434-21', other: '1234' });
          analytics.called(window.__adroll.record_user, {
            adroll_segments: 'mappedVal',
            adroll_conversion_value_in_dollars: 2.99,
            product_id: '12345',
            sku: '43434-21',
            other: '1234',
            order_id: '12345'
          });
        });
      });

      describe('Event Not Mapped', function() {
        describe('V1', function() {
          beforeEach(function() {
            adroll.options._version = 1;
          });

          it('should snake_case and send unmapped events', function() {
            analytics.track('Event A');
            analytics.called(window.__adroll.record_user, {
              adroll_segments: 'event_a'
            });
          });

          it('should map revenue and order id', function() {
            analytics.track('event', { revenue: 3.99, order_id: 1 });
            analytics.called(window.__adroll.record_user, {
              adroll_segments: 'event',
              adroll_conversion_value_in_dollars: 3.99,
              order_id: 1
            });
          });
        });

        describe('V2', function() {
          beforeEach(function() {
            adroll.options._version = 2;
          });

          it('should do nothing', function() {
            analytics.track('Event A');
            analytics.didNotCall(window.__adroll.record_user);
          });
        });
      });
    });
  });
});
