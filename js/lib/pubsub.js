/* vim: set tabstop=4 shiftwidth=4: */
/*jshint mootools:true */

/**
 * Implementation of Publish/Subscribe pattern. Callbacks subscribed to a topic
 *   are fired when data is published to that topic.
 * 
 * -----------------------------------------------------------------------------
 * Layout
 * -----------------------------------------------------------------------------
 *  PubSub
 *  - subscribe(topic, callback)
 *  - publish(topic, data)
 */
(function (exports) {
    var DEBUG = true,
        PubSub;
        
    PubSub = {
        // Register a function to be called when the specified topic is
        //   published
        subscribe: function (topic, callback) {
            if (DEBUG) console.log('Attached listener to ' + topic + '.');
            this._cb = this._cb || {};
            (this._cb[topic] || (this._cb[topic] = [])).push(callback);
            return this;
        },
        // Fire callbacks subscribed to the specified topic with specified data
        //   object as argument
        publish: function (topic, data) {
            if (!(this._cb && this._cb[topic])) return this;
            if (DEBUG) console.log('Executed ' + this._cb[topic].length +
                ' callbacks attached to ' + topic + '.');

            this._cb[topic].each(function (fn) { fn(data) });
            return this;
        }
    };
    
    exports.PubSub = PubSub; // Introduce object to global scope
}) (window);
